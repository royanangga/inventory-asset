"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fmt, fmtIdr } from "../lib/format";
import type { DueDay } from "../lib/queries";

const DAYS = 45;
const addDays = (iso: string, n: number) => { const t = new Date(Date.parse(iso) + n * 86400000); return t.toISOString().slice(0, 10); };
const dow = new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "UTC" });
const dm = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const long = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

type Col = { key: string; d: string | null; n: number; amount: number; kind: "late" | "soon" | "later" };

/** Claim Radar: jatuh tempo claim 45 hari ke depan. Kolom merah = sudah lewat. Tinggi batang = nilai aset. */
export default function ClaimRadar({ rows, today }: { rows: DueDay[]; today: string }) {
  const { cols, max, late } = useMemo(() => {
    const byDay = new Map(rows.map((r) => [r.d, r]));
    const late = rows.filter((r) => r.d < today).reduce((a, r) => ({ n: a.n + r.n, amount: a.amount + r.amount }), { n: 0, amount: 0 });
    const cols: Col[] = [{ key: "late", d: null, n: late.n, amount: late.amount, kind: "late" }];
    for (let i = 0; i < DAYS; i++) {
      const d = addDays(today, i); const r = byDay.get(d);
      cols.push({ key: d, d, n: r?.n ?? 0, amount: r?.amount ?? 0, kind: i <= 7 ? "soon" : "later" });
    }
    return { cols, max: Math.max(...cols.map((c) => c.amount), 1), late };
  }, [rows, today]);
  const [hot, setHot] = useState<string | null>(null);
  const upcoming = cols.filter((c) => c.kind !== "late");
  const upN = upcoming.reduce((s, c) => s + c.n, 0), upAmt = upcoming.reduce((s, c) => s + c.amount, 0);
  const active = cols.find((c) => c.key === hot);
  const color = (k: Col["kind"]) => (k === "late" ? "var(--r500)" : k === "soon" ? "var(--a600)" : "var(--b500)");

  const readout = active
    ? active.kind === "late"
      ? <><b className="text-red-600">Sudah lewat jatuh tempo</b> · {fmt(active.n)} aset · <span className="amt">{fmtIdr(active.amount)}</span></>
      : <><b>{long.format(new Date(Date.parse(active.d!)))}</b> · {active.n ? <>{fmt(active.n)} aset · <span className="amt">{fmtIdr(active.amount)}</span></> : "tidak ada yang jatuh tempo"}</>
    : <>{late.n > 0 && <><b className="text-red-600">{fmt(late.n)} aset sudah lewat</b> · </>}{fmt(upN)} aset jatuh tempo dalam {DAYS} hari ke depan · <span className="amt">{fmtIdr(upAmt)}</span></>;

  return (
    <div>
      <p className="text-sm text-slate-600 min-h-5 mb-3" aria-live="polite">{readout}</p>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[680px] relative">
          <div className="flex items-end gap-[3px] h-36" role="list" aria-label="Jatuh tempo claim per hari">
            {cols.map((c, i) => {
              const h = c.n ? Math.max(Math.sqrt(c.amount / max) * 100, 9) : 0;
              const weekend = c.d ? [0, 6].includes(new Date(Date.parse(c.d)).getUTCDay()) : false;
              const href = c.kind === "late" ? (c.n ? "/assets?due=due" : undefined) : c.n ? `/assets?dueon=${c.d}` : undefined;
              const label = c.kind === "late" ? `Sudah lewat: ${c.n} aset` : `${c.d}: ${c.n} aset`;
              const bar = (
                <div className="relative flex flex-col justify-end h-full w-full rounded-[4px]" style={{ background: weekend ? "var(--s100)" : "transparent" }}>
                  {c.n > 0
                    ? <div className="grow-y w-full rounded-[4px]" style={{ height: `${h}%`, background: color(c.kind), opacity: hot && hot !== c.key ? 0.35 : 1, animationDelay: `${i * 14}ms` }} />
                    : <div className="w-full h-[2px] rounded" style={{ background: "var(--s200)" }} />}
                </div>
              );
              const common = { onMouseEnter: () => setHot(c.key), onMouseLeave: () => setHot(null), onFocus: () => setHot(c.key), onBlur: () => setHot(null), "aria-label": label, className: "h-full block outline-offset-2" };
              return (
                <div key={c.key} role="listitem" className="h-full" style={{ width: c.kind === "late" ? 54 : undefined, flex: c.kind === "late" ? "none" : 1, marginRight: c.kind === "late" ? 10 : 0 }}>
                  {href ? <Link href={href} {...common}>{bar}</Link> : <button type="button" tabIndex={-1} {...common} style={{ cursor: "default", width: "100%" }}>{bar}</button>}
                </div>
              );
            })}
          </div>
          {/* sumbu tanggal */}
          <div className="flex gap-[3px] mt-2 text-[11px] text-slate-500">
            <div style={{ width: 54, marginRight: 10 }} className="shrink-0 text-red-600 font-medium">Lewat</div>
            {cols.slice(1).map((c, i) => (
              <div key={c.key} className="flex-1 relative h-4">
                {i % 7 === 0 && <span className="absolute left-0 whitespace-nowrap">{i === 0 ? "Hari ini" : dm.format(new Date(Date.parse(c.d!)))}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--r500)" }} />Lewat jatuh tempo</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--a600)" }} />Dalam 7 hari</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--b500)" }} />Setelahnya</span>
        <span>Latar abu-abu = akhir pekan · {dow.format(new Date(Date.parse(today)))}, {dm.format(new Date(Date.parse(today)))} hari ini</span>
      </div>
    </div>
  );
}
