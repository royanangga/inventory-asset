const idr = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "-" : idr.format(n));
export const fmtIdr = (n: number | null | undefined) => (n === null || n === undefined ? "-" : "Rp " + idr.format(n));
/** Tanggal hari ini (YYYY-MM-DD) menurut waktu Jakarta */
export const todayJakarta = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
/** Selisih hari dari hari ini ke tanggal jatuh tempo (negatif = sudah lewat) */
export const daysUntil = (due: string, today = todayJakarta()) => Math.round((Date.parse(due.slice(0, 10)) - Date.parse(today)) / 86400000);
export const DUE_SOON_DAYS = 7;

export function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}
/** parse "1.234.567,89" / "1234567.89" / "-1,234,567" menjadi number */
export function parseNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  let s = input.trim().replace(/[Rp\s]/gi, "");
  if (!s) return null;
  const neg = s.startsWith("(") && s.endsWith(")");
  s = s.replace(/[()]/g, "");
  const lastComma = s.lastIndexOf(","), lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // yang muncul terakhir adalah desimal
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const parts = s.split(",");
    s = parts.length > 2 || parts[parts.length - 1].length === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1) {
    const parts = s.split(".");
    if (parts.length > 2 || parts[parts.length - 1].length === 3) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}
