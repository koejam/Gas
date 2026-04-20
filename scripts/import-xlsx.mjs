import fs from 'node:fs';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const XLSX_PATH = process.argv[2] ?? 'C:/Users/joeka/Downloads/Gas tracking.xlsx';
const VEHICLE_NAME = process.argv[3] ?? 'q50';

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Excel serial → ISO yyyy-mm-dd (Excel epoch 1899-12-30 UTC accounts for 1900 leap bug)
export function excelSerialToIsoDate(serial) {
  const ms = Math.round((Number(serial) - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

// Parse freeform oil note → { date: 'YYYY-MM-DD' | null, mileage: number | null }
// Rules:
//   "M/D/YY" or "MM/DD/YY" → explicit date (20xx for YY)
//   "M/YY" / "MM/YY" where YY in 20..35 → month 1st of 20YY
//   If contextIso is provided AND match is "M/D" with day>=1 → month/day of contextIso's year
//   "<num>k" → mileage = num * 1000; plain "<num> mi" or bare 5-6 digit num → mileage
export function parseOilNote(note, contextIso) {
  if (!note) return { date: null, mileage: null };
  let date = null;
  let mileage = null;

  const mdy = note.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2}(?:\d{2})?)\b/);
  if (mdy) {
    const m = parseInt(mdy[1], 10);
    const d = parseInt(mdy[2], 10);
    const yRaw = parseInt(mdy[3], 10);
    const y = yRaw < 100 ? 2000 + yRaw : yRaw;
    date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  } else {
    const two = note.match(/\b(\d{1,2})\/(\d{1,2})\b/);
    if (two) {
      const a = parseInt(two[1], 10);
      const b = parseInt(two[2], 10);
      if (b >= 20 && b <= 35) {
        // Month/Year — day 1
        date = `20${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}-01`;
      } else if (contextIso) {
        // Month/Day; infer year from context
        const yr = contextIso.slice(0, 4);
        date = `${yr}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
      }
    }
  }

  const mileK = note.match(/(\d{1,3}(?:\.\d+)?)\s*k\b/i);
  if (mileK) {
    mileage = Math.round(parseFloat(mileK[1]) * 1000);
  } else {
    const mileNum = note.match(/\b(\d{4,6})\b/);
    if (mileNum) mileage = parseInt(mileNum[1], 10);
  }

  return { date, mileage };
}

async function main() {
  const { data: users, error: ue } = await sb.auth.admin.listUsers();
  if (ue) throw ue;
  const me = users.users.find((u) => u.email === 'joekam09@gmail.com');
  if (!me) throw new Error('user not found');
  const userId = me.id;

  const { data: vs, error: ve } = await sb.from('gas_vehicles').select('*').eq('user_id', userId);
  if (ve) throw ve;
  const vehicle = vs.find((v) => v.name === VEHICLE_NAME);
  if (!vehicle) throw new Error(`vehicle "${VEHICLE_NAME}" not found; have: ${vs.map((v) => v.name).join(', ')}`);

  const { count: fillCount, error: fce } = await sb
    .from('gas_fill_ups')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', vehicle.id);
  if (fce) throw fce;
  const { count: oilCount, error: oce } = await sb
    .from('gas_oil_changes')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', vehicle.id);
  if (oce) throw oce;

  if ((fillCount ?? 0) > 0 || (oilCount ?? 0) > 0) {
    console.error(`aborting: vehicle "${VEHICLE_NAME}" already has data (${fillCount} fill-ups, ${oilCount} oil changes).`);
    console.error('delete via UI first, then re-run.');
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH);

  // --- Parse Form Responses 1 ---
  const formRows = XLSX.utils.sheet_to_json(wb.Sheets['Form Responses 1'], { header: 1, defval: null, raw: true });
  const fillUps = [];
  const oilChanges = [];
  for (let i = 1; i < formRows.length; i++) {
    const r = formRows[i];
    const [, dateSerial, mileage, gallons, price, total, , note] = r;

    const hasFill = dateSerial != null && mileage != null && gallons != null && price != null && total != null;
    let fillIso = null;
    if (hasFill) {
      fillIso = excelSerialToIsoDate(dateSerial);
      fillUps.push({
        user_id: userId,
        vehicle_id: vehicle.id,
        date: fillIso,
        mileage: Math.round(Number(mileage)),
        gallons: Number(gallons),
        price_per_gallon: Number(price),
        total_price: Number(total),
      });
    }

    if (note) {
      const parsed = parseOilNote(String(note), fillIso);
      const oilDate = parsed.date ?? fillIso;
      if (!oilDate) {
        console.warn(`skipping note with no resolvable date: ${JSON.stringify(note)}`);
        continue;
      }
      oilChanges.push({
        user_id: userId,
        vehicle_id: vehicle.id,
        date: oilDate,
        mileage: parsed.mileage ?? (hasFill ? Math.round(Number(mileage)) : null),
        notes: String(note),
      });
    }
  }

  // --- Parse Kelly oil sheet ---
  if (wb.Sheets['Kelly oil']) {
    const kellyRows = XLSX.utils.sheet_to_json(wb.Sheets['Kelly oil'], { header: 1, defval: null, raw: true });
    for (let i = 1; i < kellyRows.length; i++) {
      const [mileage, dateSerial] = kellyRows[i];
      if (dateSerial == null) continue;
      oilChanges.push({
        user_id: userId,
        vehicle_id: vehicle.id,
        date: excelSerialToIsoDate(dateSerial),
        mileage: mileage != null ? Math.round(Number(mileage)) : null,
        notes: 'Kelly oil',
      });
    }
  }

  console.log(`Prepared: ${fillUps.length} fill-ups, ${oilChanges.length} oil changes`);
  console.log('Sample fill-up:', fillUps[0]);
  console.log('Oil changes:', oilChanges);

  if (process.argv.includes('--dry-run')) {
    console.log('dry run — no inserts performed');
    return;
  }

  for (let i = 0; i < fillUps.length; i += 500) {
    const batch = fillUps.slice(i, i + 500);
    const { error } = await sb.from('gas_fill_ups').insert(batch);
    if (error) throw new Error(`fill-up insert error at batch ${i}: ${error.message}`);
    console.log(`inserted fill-ups ${i + 1}..${i + batch.length}`);
  }

  if (oilChanges.length > 0) {
    const { error } = await sb.from('gas_oil_changes').insert(oilChanges);
    if (error) throw new Error(`oil-change insert error: ${error.message}`);
    console.log(`inserted ${oilChanges.length} oil changes`);
  }

  console.log('done.');
}

main().catch((e) => {
  console.error('FAILED:', e.message ?? e);
  process.exit(1);
});
