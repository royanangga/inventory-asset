import { bad } from "./api";
import { latestStage, isPaymentStatus } from "./types";
import { parseNumber } from "./format";

/**
 * Hitung ulang aset dari riwayat pembayarannya:
 *  - Inventory Asset (Purchase) = jumlah seluruh nominal pembayaran
 *  - Status pembayaran = tahap tertinggi yang sudah dicatat
 */
export async function recalcAsset(tx: any, assetId: number) {
  const pays = await tx`select stage from asset_payments where asset_id = ${assetId}`;
  const status = latestStage(pays.map((p: any) => p.stage));
  const [row] = await tx`update assets set
      amount = (select coalesce(sum(amount), 0) from asset_payments where asset_id = ${assetId}),
      payment_status = ${status}, updated_at = now()
    where id = ${assetId} returning id, amount, payment_status`;
  return row as { id: number; amount: number; payment_status: string } | undefined;
}

/** Validasi payload pembayaran dari klien. Mengembalikan data bersih atau Response error. */
export function cleanPayment(body: any) {
  const stage = body?.stage;
  if (!isPaymentStatus(stage)) return { error: bad("Tahap pembayaran tidak valid") };
  const amount = parseNumber(body?.amount);
  if (amount === null) return { error: bad("Isi nominal pembayaran") };
  const d = body?.pay_date ? String(body.pay_date) : null;
  if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: bad("Tanggal bayar tidak valid") };
  return { data: { stage: stage as string, amount, pay_date: d } };
}

export const isUnique = (e: any) => e?.code === "23505";
