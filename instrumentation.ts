// Dijalankan Next.js sekali setiap server/instance Vercel mulai, sebelum request pertama dilayani.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSchema } = await import("./lib/migrate");
    await ensureSchema();
  }
}
