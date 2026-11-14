import postgres from "postgres";

const url = process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof makeSql> | undefined;
}

function makeSql(connectionString: string) {
  const local = /localhost|127\.0\.0\.1/.test(connectionString);
  return postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    onnotice: () => {}, // abaikan NOTICE "already exists" dari migrasi otomatis
    prepare: false, // kompatibel dengan connection pooler (Neon/Supabase/pgbouncer)
    ssl: local ? false : "require",
    types: {
      // numeric -> number, bigint -> number, date -> 'YYYY-MM-DD'
      numeric: { to: 1700, from: [1700], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
      bigint: { to: 20, from: [20], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
      date: { to: 1082, from: [1082], serialize: (x: unknown) => String(x), parse: (x: string) => x },
    },
  });
}

export function getSql() {
  if (!url) throw new Error("DATABASE_URL belum diatur");
  if (!globalThis.__sql) globalThis.__sql = makeSql(url);
  return globalThis.__sql;
}

// Proxy supaya `sql` bisa dipakai langsung sebagai tagged template tanpa error saat build
export const sql = new Proxy((() => {}) as unknown as ReturnType<typeof makeSql>, {
  apply: (_t, _this, args) => (getSql() as any)(...args),
  get: (_t, prop) => (getSql() as any)[prop],
});
