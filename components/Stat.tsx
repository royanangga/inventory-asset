/** Kartu angka ringkas. Nominal diberi kelas `amt` agar ikut mode privasi. */
export default function Stat({ label, value, sub, tone, money = true }: { label: string; value: string; sub?: string; tone?: "good" | "bad" | "warn"; money?: boolean }) {
  const color = tone === "bad" ? "text-red-600" : tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-700" : "";
  return (
    <div className="card p-4 md:p-5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1.5 text-[1.6rem] leading-none font-light tracking-tight tabular-nums ${color} ${money ? "amt" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-2">{sub}</div>}
    </div>
  );
}
