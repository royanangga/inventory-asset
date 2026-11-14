import { fmt } from "../lib/format";

export default function Bars({ rows, max }: { rows: { label: string; amount: number; sub?: string; href?: string }[]; max?: number }) {
  const top = max ?? Math.max(...rows.map((r) => Math.abs(r.amount)), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="flex justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{r.label}{r.sub && <span className="text-slate-400"> · {r.sub}</span>}</span>
              <span className="tabular-nums text-slate-900 font-medium">{fmt(r.amount)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max((Math.abs(r.amount) / top) * 100, r.amount ? 1.5 : 0)}%` }} />
            </div>
          </>
        );
        return <li key={r.label}>{r.href ? <a href={r.href} className="block hover:opacity-80">{inner}</a> : inner}</li>;
      })}
    </ul>
  );
}
