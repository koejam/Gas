import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('public/icons', { recursive: true });

const iconSvg = (size, padding = 0) => {
  const inner = size - padding * 2;
  const fontSize = Math.round(inner * 0.66);
  const textY = Math.round(size / 2 + fontSize * 0.35);
  const radius = Math.round(inner * 0.12);
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${radius}" fill="#0f172a"/>
  <text x="${size / 2}" y="${textY}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="${fontSize}" font-weight="700" fill="#22d3ee">G</text>
</svg>
  `);
};

await sharp(iconSvg(192)).png().toFile('public/icons/icon-192.png');
await sharp(iconSvg(512)).png().toFile('public/icons/icon-512.png');
await sharp(iconSvg(512, 64)).png().toFile('public/icons/icon-maskable.png');

console.log('Generated icons/{icon-192,icon-512,icon-maskable}.png');
