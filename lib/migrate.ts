import { sql } from "./db";
import { SCHEMA_SQL } from "./schema";

/**
 * Membuat / memigrasi tabel secara otomatis. Aman dijalankan berulang dan dari beberapa instance sekaligus
 * (dikunci dengan advisory lock), jadi tidak perlu lagi membuka halaman /setup setelah update kode.
 */
export async function ensureSchema() {
  if (!process.env.DATABASE_URL) return;
  try {
    await sql.begin(async (tx: any) => {
      await tx`select pg_advisory_xact_lock(727274)`;
      await tx.unsafe(SCHEMA_SQL);
    });
  } catch (e) {
    console.error("[ensureSchema] gagal memigrasi database:", e);
  }
}
