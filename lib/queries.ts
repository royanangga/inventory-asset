import { sql } from "./db";
import { DUE_SOON_DAYS } from "./format";
import type { Asset, AssetRow, ClaimRow, GlAccount } from "./types";

export type AssetFilters = { q?: string; gl?: string; project?: string; plant?: string; check?: string; due?: string };

/** Hari ini menurut waktu Jakarta (agar alert jatuh tempo tidak bergeser karena zona waktu server). */
const TODAY = () => sql`(now() at time zone 'Asia/Jakarta')::date`;
/** Aset sudah di-claim bila record claim bertanda claimed (atau ada data W-AD dari Excel). */
const CLAIMED = () => sql`c.claimed`;
/** Tanpa join (dipakai di where() atas tabel assets). */
const IS_CLAIMED = () => sql`id in (select asset_id from asset_claims where claimed)`;

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
      or item_name ilike ${like} or po_no ilike ${like} or trans_no ilike ${like})`);
  }
  if (f.gl) parts.push(f.gl === "none" ? sql`gl_account is null` : sql`gl_account = ${f.gl}`);
  if (f.project) parts.push(sql`project = ${f.project}`);
  if (f.plant) parts.push(sql`div_plant = ${f.plant}`);
  if (f.due === "due") parts.push(sql`due_date <= ${TODAY()} and not ${IS_CLAIMED()}`);
  if (f.due === "soon") parts.push(sql`due_date > ${TODAY()} and due_date <= ${TODAY()} + ${DUE_SOON_DAYS}::int and not ${IS_CLAIMED()}`);
  if (f.due === "nodue") parts.push(sql`due_date is null and not ${IS_CLAIMED()}`);
  if (f.due === "claimed") parts.push(IS_CLAIMED());
  if (f.check && CHECKS[f.check]) parts.push(CHECKS[f.check].where());
  if (!parts.length) return sql`true`;
  return parts.reduce((a, b) => sql`${a} and ${b}`);
}

export async function listAssets(f: AssetFilters, page = 1, pageSize = 50) {
  const w = where(f);
  const [{ total, amount, qty }] = await sql`select count(*)::int as total, coalesce(sum(amount),0) as amount, coalesce(sum(qty),0) as qty from assets where ${w}`;
  const rows = await sql<AssetRow[]>`select a.*, c.id as claim_id, coalesce(${CLAIMED()}, false) as claimed
    from (select * from assets where ${w} order by source_row nulls last, id limit ${pageSize} offset ${(page - 1) * pageSize}) a
    left join asset_claims c on c.asset_id = a.id
    order by a.source_row nulls last, a.id`;
  return { rows, total: total as number, amount: amount as number, qty: qty as number };
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

export type ClaimFilters = { q?: string; claim_to?: string; status?: string };

function claimWhere(f: ClaimFilters) {
  const parts: any[] = [];
  if (f.q?.trim()) {
    const like = `%${f.q.trim()}%`;
    parts.push(sql`(a.vendor ilike ${like} or a.project ilike ${like} or a.po_no ilike ${like} or a.item_name ilike ${like}
      or c.trans_ref ilike ${like} or c.remark ilike ${like} or c.mvd_status ilike ${like} or c.mvd_note ilike ${like})`);
  }
  if (f.claim_to) parts.push(sql`a.claim_to = ${f.claim_to}`);
  // default (kosong) = hanya yang sudah diclaim; "all" = termasuk aset yang baru punya catatan Remark/MVD
  if (f.status === "notes") parts.push(sql`not ${CLAIMED()}`);
  else if (f.status !== "all") parts.push(CLAIMED());
  if (f.status === "overdue") parts.push(sql`a.due_date < ${TODAY()}`);
  if (f.status === "nodue") parts.push(sql`a.due_date is null`);
  if (f.status === "upcoming") parts.push(sql`a.due_date >= ${TODAY()}`);
  if (!parts.length) return sql`true`;
  return parts.reduce((a, b) => sql`${a} and ${b}`);
}

export async function listClaims(f: ClaimFilters) {
  const w = claimWhere(f);
  const rows = await sql<ClaimRow[]>`select c.*, a.due_date, a.gl_account, a.vendor, a.project, a.po_no, a.item_name, a.claim_to, a.amount
    from asset_claims c join assets a on a.id = c.asset_id where ${w}
    order by a.due_date nulls last, a.source_row nulls last, c.id`;
  return rows;
}

export async function claimCustomers() {
  const r = await sql`select distinct a.claim_to from asset_claims c join assets a on a.id = c.asset_id where a.claim_to is not null order by 1`;
  return r.map((x) => x.claim_to as string);
}

export type DueAlerts = { due: number; dueAmount: number; overdue: number; today: number; soon: number; soonAmount: number };

/** Aset yang belum di-claim dan sudah/akan jatuh tempo — untuk alert di seluruh halaman. */
export async function dueAlerts(): Promise<DueAlerts> {
  const [r] = await sql`select
      count(*) filter (where due_date <= ${TODAY()})::int as due,
      coalesce(sum(amount) filter (where due_date <= ${TODAY()}), 0) as due_amount,
      count(*) filter (where due_date < ${TODAY()})::int as overdue,
      count(*) filter (where due_date = ${TODAY()})::int as today,
      count(*) filter (where due_date > ${TODAY()} and due_date <= ${TODAY()} + ${DUE_SOON_DAYS}::int)::int as soon,
      coalesce(sum(amount) filter (where due_date > ${TODAY()} and due_date <= ${TODAY()} + ${DUE_SOON_DAYS}::int), 0) as soon_amount
    from assets where due_date is not null and id not in (select asset_id from asset_claims where claimed)`;
  return { due: r.due, dueAmount: Number(r.due_amount), overdue: r.overdue, today: r.today, soon: r.soon, soonAmount: Number(r.soon_amount) };
}
