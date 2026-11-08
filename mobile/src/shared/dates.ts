// Local calendar date as YYYY-MM-DD. Never use toISOString(): it is UTC and
// the backend's "today" would drift from the user's evening.
export function localDateString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Local Date at midnight for a YYYY-MM-DD string (never `${date}T00:00:00`-style parsing).
export const parseLocalDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Strict YYYY-MM-DD that is a real calendar day (rejects 2026-02-30 etc.).
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return localDateString(parseLocalDate(s)) === s;
}

// Local time of day (HH:mm) of an ISO timestamp.
export const localTime = (iso: string) => new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", hour12: false });

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
