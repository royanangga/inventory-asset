import { fmt } from "../lib/format";

export default function Bars({ rows, max }: { rows: { label: string; amount: number; sub?: string; href?: string }[]; max?: number }) {
  const nums = rows.map((r) => Number(r.amount));
  const top = max ?? Math.max(...nums.map((n) => Math.abs(n)), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => {
        const n = nums[i];
        const inner = (
          <>
            <div className="flex justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{r.label}{r.sub && <span className="text-slate-400"> · {r.sub}</span>}</span>
              <span className="tabular-nums text-slate-900 font-medium amt">{fmt(n)}</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="grow-x h-full rounded-full" style={{ width: `${Math.max((Math.abs(n) / top) * 100, n ? 1.5 : 0)}%`, background: "var(--b500)", animationDelay: `${i * 50}ms` }} />
            </div>
          </>
        );
        return <li key={r.label}>{r.href ? <a href={r.href} className="block rounded-md -mx-1.5 px-1.5 py-0.5 transition hover:bg-slate-50">{inner}</a> : inner}</li>;
      })}
    </ul>
  );
}
