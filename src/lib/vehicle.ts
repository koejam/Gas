const KEY = 'lastVehicleId';

export function getLastVehicleId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastVehicleId(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // ignore — private browsing
  }
}
