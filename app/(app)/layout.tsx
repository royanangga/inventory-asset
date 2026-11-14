import { redirect } from "next/navigation";
import Nav from "../../components/Nav";
import { sql } from "../../lib/db";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Jika tabel belum dibuat, arahkan ke halaman setup
  let ready = false;
  try { ready = (await sql`select to_regclass('public.assets') is not null as r`)[0].r; } catch { ready = false; }
  if (!ready) redirect("/setup");
  return (
    <>
      <Nav />
      <main className="md:ml-60 px-4 md:px-8 py-6 md:py-8 max-w-[1500px]">{children}</main>
    </>
  );
}
