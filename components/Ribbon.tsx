"use client";
import Link from "next/link";
import { useState } from "react";
import { fmt } from "../lib/format";

export type Seg = { key: string; label: string; sub?: string; value: number; href?: string };
const COLORS = ["#7f90ee", "#38b6c4", "#e6b23a", "#b58be0", "#e58aa5", "#8ea0c4", "#5fc79b"];

/** Pita proporsi bersegmen + legenda yang saling tersorot saat disentuh. Dipakai di panel gelap (hero) atau terang. */
export default function Ribbon({ segs, onDark }: { segs: Seg[]; onDark?: boolean }) {
  const [hot, setHot] = useState<string | null>(null);
  const total = segs.reduce((s, x) => s + Math.max(x.value, 0), 0) || 1;
  const muted = onDark ? "rgba(233,236,245,0.6)" : "var(--s500)";
  return (
    <div>
      <div className="flex h-3.5 gap-[3px] rounded-full overflow-hidden" role="img" aria-label="Komposisi per akun">
        {segs.map((s, i) => (
          <div key={s.key} className="grow-x h-full rounded-[3px] transition-all duration-200"
            style={{ width: `${(Math.max(s.value, 0) / total) * 100}%`, minWidth: s.value > 0 ? 4 : 0, background: COLORS[i % COLORS.length], opacity: hot && hot !== s.key ? 0.3 : 1, transform: hot === s.key ? "scaleY(1.5)" : undefined, animationDelay: `${i * 70}ms` }}
            onMouseEnter={() => setHot(s.key)} onMouseLeave={() => setHot(null)} />
        ))}
      </div>
      <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {segs.map((s, i) => {
          const body = (
            <>
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="truncate">{s.label}</span>
              {s.sub && <span className="hidden sm:inline text-xs shrink-0" style={{ color: muted }}>{s.sub}</span>}
              <span className="ml-auto tabular-nums amt shrink-0 font-medium">{fmt(s.value)}</span>
              <span className="text-xs w-9 text-right tabular-nums shrink-0" style={{ color: muted }}>{((Math.max(s.value, 0) / total) * 100).toFixed(0)}%</span>
            </>
          );
          const cls = "flex items-center gap-2 py-1.5 text-sm rounded-md px-1.5 -mx-1.5 transition-colors";
          const style = { background: hot === s.key ? (onDark ? "rgba(255,255,255,0.08)" : "var(--s100)") : "transparent" };
          return (
            <li key={s.key} onMouseEnter={() => setHot(s.key)} onMouseLeave={() => setHot(null)}>
              {s.href ? <Link href={s.href} className={cls} style={style}>{body}</Link> : <div className={cls} style={style}>{body}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
