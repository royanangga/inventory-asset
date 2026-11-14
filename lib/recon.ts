// Logika murni rekonsiliasi (dipakai server & klien, mudah diuji)

export const TOLERANCE = 1; // selisih ≤ Rp 1 dianggap sesuai (pembulatan sen)

export type LineInput = { gl_account: string; gl_name: string; tb_balance: number | null; system_balance: number; system_count: number };
export type Adj = { id?: number; gl_account: string; description: string; amount: number };

export type LineResult = LineInput & {
  diff: number | null;        // TB - Sistem
  explained: number;          // total penyesuaian
  unexplained: number | null; // diff - explained
  status: "empty" | "match" | "explained" | "diff";
};

export function computeLine(l: LineInput, adjs: Adj[]): LineResult {
  const explained = adjs.filter((a) => a.gl_account === l.gl_account).reduce((s, a) => s + (a.amount || 0), 0);
  if (l.tb_balance === null || l.tb_balance === undefined) return { ...l, diff: null, explained, unexplained: null, status: "empty" };
  const diff = round2(l.tb_balance - l.system_balance);
  const unexplained = round2(diff - explained);
  const status = Math.abs(diff) <= TOLERANCE ? "match" : Math.abs(unexplained) <= TOLERANCE ? "explained" : "diff";
  return { ...l, diff, explained, unexplained, status };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function totals(lines: LineResult[]) {
  const filled = lines.filter((l) => l.tb_balance !== null);
  const tb = filled.reduce((s, l) => s + (l.tb_balance ?? 0), 0);
  const sys = lines.reduce((s, l) => s + l.system_balance, 0);
  const sysFilled = filled.reduce((s, l) => s + l.system_balance, 0);
  return {
    tb: round2(tb), sys: round2(sys), sysFilled: round2(sysFilled), diff: round2(tb - sysFilled),
    filled: filled.length, total: lines.length,
    unexplained: round2(filled.reduce((s, l) => s + (computeLine(l, []).diff ?? 0), 0)),
  };
}

// ---------- Petunjuk kemungkinan penyebab selisih ----------
export type LiteAsset = { id: number; gl_account: string | null; project: string | null; vendor: string | null; item_name: string | null; product_code: string | null; amount: number };
export type Hint = { text: string; kind: "move_in" | "move_out" | "item" };

type Group = { key: string; project: string; gl: string | null; amount: number; count: number };

/**
 * Cari kombinasi project/item yang nilainya sama dengan selisih sebuah akun.
 * diff = TB - Sistem. diff > 0: sistem kurang -> mungkin ada aset di akun lain yang seharusnya masuk akun ini.
 * diff < 0: sistem berlebih -> mungkin ada aset di akun ini yang seharusnya di akun lain / tidak ada di TB.
 */
export function findHints(account: string, diff: number, assets: LiteAsset[], max = 5): Hint[] {
  const target = Math.abs(diff);
  if (target <= TOLERANCE) return [];
  const groupsMap = new Map<string, Group>();
  for (const a of assets) {
    const key = `${a.project ?? "(tanpa project)"}||${a.gl_account ?? ""}`;
    const g = groupsMap.get(key) ?? { key, project: a.project ?? "(tanpa project)", gl: a.gl_account, amount: 0, count: 0 };
    g.amount += a.amount; g.count++; groupsMap.set(key, g);
  }
  const pool = [...groupsMap.values()].filter((g) => (diff > 0 ? g.gl !== account : g.gl === account) && g.amount > 0);
  const out: Hint[] = [];
  const near = (v: number) => Math.abs(v - target) <= TOLERANCE;
  const label = (g: Group) => `${g.project}${g.gl ? ` (akun ${g.gl})` : " (tanpa akun)"} Rp ${g.amount.toLocaleString("id-ID")}`;
  const kind = diff > 0 ? "move_in" : "move_out";
  const verb = diff > 0 ? "Mungkin perlu masuk ke akun ini:" : "Mungkin bukan bagian akun ini:";

  const n = pool.length;
  // Hanya kombinasi kecil (maks 3 project): kombinasi lebih besar hampir selalu kebetulan angka
  const found: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (near(pool[i].amount)) found.push([i]);
    for (let j = i + 1; j < n; j++) {
      if (near(pool[i].amount + pool[j].amount)) found.push([i, j]);
      for (let k = j + 1; k < n; k++) if (near(pool[i].amount + pool[j].amount + pool[k].amount)) found.push([i, j, k]);
    }
  }
  found.sort((x, y) => x.length - y.length);
  for (const combo of found.slice(0, max)) out.push({ kind, text: `${verb} ${combo.map((i) => label(pool[i])).join(" + ")}` });

  // satu item dengan nilai sama persis
  for (const a of assets) {
    if (out.length >= max) break;
    if ((diff > 0 ? a.gl_account !== account : a.gl_account === account) && near(a.amount))
      out.push({ kind: "item", text: `Satu item bernilai sama: ${a.vendor ?? ""} – ${a.item_name ?? a.product_code ?? "#" + a.id} (akun ${a.gl_account ?? "-"})` });
  }
  return out;
}
