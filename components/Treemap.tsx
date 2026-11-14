"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fmt } from "../lib/format";
import { squarify, type TItem } from "../lib/treemap";

/** Peta pohon: luas kotak = nilai aset. Klik kotak untuk membuka daftar aset project tersebut. */
export default function Treemap({ items, height = 360 }: { items: TItem[]; height?: number }) {
  const rects = useMemo(() => squarify(items), [items]);
  const total = useMemo(() => rects.reduce((s, r) => s + r.value, 0) || 1, [rects]);
  const top = rects[0]?.value || 1;
  const [hot, setHot] = useState<string | null>(null);
  if (!rects.length) return <p className="text-sm text-slate-500">Belum ada data project.</p>;
  const active = rects.find((r) => r.label === hot);
  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-xl" style={{ height }} role="list" aria-label="Peta nilai aset per project">
        {rects.map((r, i) => {
          const p = Math.round(18 + 82 * Math.pow(r.value / top, 0.55));
          const light = p >= 55;
          const small = r.w < 11 || r.h < 14;
          const inner = (
            <div className="h-full w-full p-2.5 overflow-hidden flex flex-col justify-between text-left" style={{ color: light ? "#fff" : "var(--fg)" }}>
              {!small && <span className="text-[13px] font-medium leading-tight line-clamp-2">{r.label}</span>}
              {!small && r.h > 22 && <span className="text-xs tabular-nums opacity-80 amt">{fmt(r.value)}</span>}
            </div>
          );
          const style: React.CSSProperties = {
            left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%`, padding: 1.5,
            opacity: hot && hot !== r.label ? 0.45 : 1, transition: "opacity .15s", animationDelay: `${i * 25}ms`,
          };
          const face: React.CSSProperties = { background: `color-mix(in oklab, var(--primary) ${p}%, var(--surface))`, borderRadius: 8, height: "100%", width: "100%", overflow: "hidden" };
          return (
            <div key={r.label} role="listitem" className="absolute rise" style={style} onMouseEnter={() => setHot(r.label)} onMouseLeave={() => setHot(null)}>
              {r.href
                ? <Link href={r.href} className="block" style={face} title={`${r.label}: ${fmt(r.value)}`}>{inner}</Link>
                : <div style={face} title={`${r.label}: ${fmt(r.value)}`}>{inner}</div>}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-slate-600 min-h-5" aria-live="polite">
        {active
          ? <><b>{active.label}</b>{active.sub && <span className="text-slate-500"> · {active.sub}</span>} · <span className="amt tabular-nums">Rp {fmt(active.value)}</span> · {((active.value / total) * 100).toFixed(1)}% dari total</>
          : <span className="text-slate-500">Arahkan kursor ke kotak untuk melihat rincian. Klik untuk membuka daftar asetnya.</span>}
      </p>
    </div>
  );
}
