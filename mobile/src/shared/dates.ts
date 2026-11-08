// Local calendar date as YYYY-MM-DD. Never use toISOString(): it is UTC and
// the backend's "today" would drift from the user's evening.
export function localDateString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
