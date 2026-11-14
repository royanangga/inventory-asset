"use client";
import { useEffect, useRef, useState } from "react";
import { fmt } from "../lib/format";

/** Angka yang berhitung naik saat halaman dibuka (hormati prefers-reduced-motion). */
export default function CountUp({ value, prefix = "", className = "", ms = 1300 }: { value: number; prefix?: string; className?: string; ms?: number }) {
  const [v, setV] = useState(value);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(value); return; }
    done.current = true;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / ms, 1);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // easeOutExpo
      setV(value * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <span className={`amt ${className}`} aria-label={prefix + fmt(value)}>{prefix}{fmt(Math.round(v))}</span>;
}
