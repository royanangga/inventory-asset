import { sql } from "./db";
import type { Asset, GlAccount } from "./types";

export type AssetFilters = { q?: string; gl?: string; project?: string; plant?: string; check?: string };

const CHECKS: Record<string, { label: string; where: () => any }> = {
  dup: {
    label: "Kemungkinan duplikat",
    where: () => sql`id in (
      select id from (
        select id, count(*) over (partition by po_no, coalesce(product_code, part_number, item_name, ''), amount) c
        from assets where po_no is not null
      ) t where c > 1)`,
  },
  nonpos: { label: "Nilai nol / negatif", where: () => sql`amount <= 0` },
  nogl: { label: "Tanpa akun GL", where: () => sql`gl_account is null` },
  noproject: { label: "Tanpa project", where: () => sql`(project is null or project = '')` },
};
export const CHECK_LABELS = Object.fromEntries(Object.entries(CHECKS).map(([k, v]) => [k, v.label]));

function where(f: AssetFilters) {
  const parts: any[] = [];
  if (f.q?.trim()) {
    const like = `%${f.q.trim()}%`;
    parts.push(sql`(vendor ilike ${like} or project ilike ${like} or product_code ilike ${like} or part_number ilike ${like}
      or item_name ilike ${like} or po_no ilike ${like} or remark ilike ${like} or trans_no ilike ${like})`);
  }
  if (f.gl) parts.push(f.gl === "none" ? sql`gl_account is null` : sql`gl_account = ${f.gl}`);
  if (f.project) parts.push(sql`project = ${f.project}`);
  if (f.plant) parts.push(sql`div_plant = ${f.plant}`);
  if (f.check && CHECKS[f.check]) parts.push(CHECKS[f.check].where());
  if (!parts.length) return sql`true`;
  return parts.reduce((a, b) => sql`${a} and ${b}`);
}

export async function listAssets(f: AssetFilters, page = 1, pageSize = 50) {
  const w = where(f);
  const [{ total, amount }] = await sql`select count(*)::int as total, coalesce(sum(amount),0) as amount from assets where ${w}`;
  const rows = await sql<Asset[]>`select * from assets where ${w}
    order by source_row nulls last, id limit ${pageSize} offset ${(page - 1) * pageSize}`;
  return { rows, total: total as number, amount: amount as number };
}

export async function allAssets(f: AssetFilters) {
  return sql<Asset[]>`select a.*, g.name as gl_name from assets a left join gl_accounts g on g.code = a.gl_account
    where ${where(f)} order by source_row nulls last, id`;
}

export async function getAccounts() {
  return sql<GlAccount[]>`select code, name, sort_order from gl_accounts order by sort_order, code`;
}

export type SystemBalance = { gl_account: string | null; balance: number; count: number };
export async function systemBalances(): Promise<SystemBalance[]> {
  return sql<SystemBalance[]>`select gl_account, coalesce(sum(amount),0) as balance, count(*)::int as count
    from assets group by gl_account`;
}

export async function distinctValues() {
  const projects = await sql`select distinct project from assets where project is not null order by 1`;
  const plants = await sql`select distinct div_plant from assets where div_plant is not null order by 1`;
  return { projects: projects.map((r) => r.project as string), plants: plants.map((r) => r.div_plant as string) };
}

export async function dashboardData() {
  const [tot] = await sql`select count(*)::int as items, coalesce(sum(amount),0) as amount,
    count(distinct project)::int as projects, count(distinct vendor)::int as vendors from assets`;
  const byAccount = await sql`select g.code, g.name, coalesce(sum(a.amount),0) as amount, count(a.id)::int as items
    from gl_accounts g left join assets a on a.gl_account = g.code group by g.code, g.name, g.sort_order order by g.sort_order, g.code`;
  const byProject = await sql`select coalesce(project,'(tanpa project)') as project, sum(amount) as amount, count(*)::int as items
    from assets group by 1 order by amount desc`;
  const byPlant = await sql`select coalesce(div_plant,'(kosong)') as plant, sum(amount) as amount, count(*)::int as items
    from assets group by 1 order by amount desc`;
  const checks = await Promise.all(
    Object.entries(CHECKS).map(async ([key, c]) => {
      const [{ n, total }] = await sql`select count(*)::int as n, coalesce(sum(amount),0) as total from assets where ${c.where()}`;
      return { key, label: c.label, count: n as number, amount: total as number };
    })
  );
  const [lastRecon] = await sql`select id, title, as_of, status from reconciliations order by updated_at desc limit 1`;
  return { tot, byAccount, byProject, byPlant, checks, lastRecon };
}
