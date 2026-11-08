// The API sends entity numbers as strings ("12.5000") and computed numbers unrounded.
export function toNumber(v: string | number | null | undefined): number {
  const n = typeof v === "number" ? v : parseFloat(v ?? "");
  return Number.isFinite(n) ? n : 0;
}

function format(v: string | number | null | undefined, prefix: string): string {
  const fixed = toNumber(v).toFixed(2);
  const negative = Number(fixed) < 0;
  const [int, dec] = fixed.replace("-", "").split(".");
  // Venezuelan convention: "." groups thousands, "," separates decimals.
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${prefix}${grouped},${dec}`;
}

export const formatUsd = (v: string | number | null | undefined) => format(v, "$");
export const formatBs = (v: string | number | null | undefined) => format(v, "Bs. ");
export const formatPercent = (v: string | number | null | undefined) => `${toNumber(v).toFixed(1).replace(".", ",")}%`;
