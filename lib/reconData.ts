import { sql } from "./db";
import type { Adj, LineInput } from "./recon";

export type Recon = { id: number; title: string; as_of: string; status: "draft" | "final"; notes: string | null; created_at: string; updated_at: string; finalized_at: string | null };

export async function loadRecon(id: number) {
  const [recon] = await sql<Recon[]>`select * from reconciliations where id = ${id}`;
  if (!recon) return null;
  const adjustments = await sql<Adj[]>`select id, gl_account, description, amount from reconciliation_adjustments where reconciliation_id = ${id} order by id`;
  let lines: LineInput[];
  let unassigned = { count: 0, amount: 0 };

  if (recon.status === "final") {
    lines = await sql<LineInput[]>`select gl_account, coalesce(gl_name, gl_account) as gl_name, tb_balance,
        coalesce(system_balance,0) as system_balance, coalesce(system_count,0) as system_count
      from reconciliation_lines where reconciliation_id = ${id} order by gl_account`;
  } else {
    lines = await sql<LineInput[]>`select g.code as gl_account, g.name as gl_name, l.tb_balance,
        coalesce(s.balance,0) as system_balance, coalesce(s.cnt,0) as system_count
      from gl_accounts g
      left join reconciliation_lines l on l.gl_account = g.code and l.reconciliation_id = ${id}
      left join (select gl_account, sum(amount) as balance, count(*)::int as cnt from assets group by gl_account) s on s.gl_account = g.code
      order by g.sort_order, g.code`;
  }
  const [u] = await sql`select count(*)::int as c, coalesce(sum(amount),0) as a from assets where gl_account is null`;
  unassigned = { count: u.c, amount: u.a };
  return { recon, lines, adjustments, unassigned };
}

export async function listRecons() {
  return sql`select r.id, r.title, r.as_of, r.status, r.updated_at,
      (select coalesce(sum(tb_balance),0) from reconciliation_lines l where l.reconciliation_id = r.id) as tb_total,
      (select count(*)::int from reconciliation_lines l where l.reconciliation_id = r.id and l.tb_balance is not null) as filled
    from reconciliations r order by r.as_of desc, r.id desc`;
}

export async function liteAssets() {
  return sql`select id, gl_account, project, vendor, item_name, product_code, amount from assets order by source_row nulls last, id`;
}
