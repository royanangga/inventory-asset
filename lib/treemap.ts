export type TItem = { label: string; value: number; sub?: string; href?: string };
export type TRect = TItem & { x: number; y: number; w: number; h: number };

/** Squarified treemap pada bidang 100×100 (persen). Nilai ≤ 0 diabaikan. */
export function squarify(items: TItem[]): TRect[] {
  const src = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = src.reduce((s, i) => s + i.value, 0);
  if (!total) return [];
  const area = src.map((i) => ({ ...i, a: (i.value / total) * 10000 }));
  const out: TRect[] = [];
  let x = 0, y = 0, w = 100, h = 100;
  let row: typeof area = [];

  const worst = (r: typeof area, side: number) => {
    const s = r.reduce((t, i) => t + i.a, 0);
    const mx = Math.max(...r.map((i) => i.a)), mn = Math.min(...r.map((i) => i.a));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  const flush = () => {
    if (!row.length) return;
    const s = row.reduce((t, i) => t + i.a, 0);
    if (w >= h) { // kolom di sisi kiri
      const cw = s / h; let cy = y;
      for (const i of row) { const ch = i.a / cw; out.push({ label: i.label, value: i.value, sub: i.sub, href: i.href, x, y: cy, w: cw, h: ch }); cy += ch; }
      x += cw; w -= cw;
    } else { // baris di sisi atas
      const rh = s / w; let cx = x;
      for (const i of row) { const cw = i.a / rh; out.push({ label: i.label, value: i.value, sub: i.sub, href: i.href, x: cx, y, w: cw, h: rh }); cx += cw; }
      y += rh; h -= rh;
    }
    row = [];
  };
  for (const it of area) {
    const side = Math.min(w, h);
    if (!row.length || worst([...row, it], side) <= worst(row, side)) row.push(it);
    else { flush(); row.push(it); }
  }
  flush();
  return out;
}
