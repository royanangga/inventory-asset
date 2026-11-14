import { redirect } from "next/navigation";
import Nav from "../../components/Nav";
import DueBanner from "../../components/DueBanner";
import Topbar from "../../components/Topbar";
import CommandPalette from "../../components/CommandPalette";
import { sql } from "../../lib/db";
import { dueAlerts, type DueAlerts } from "../../lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Jika tabel belum dibuat, arahkan ke halaman setup
  let ready = false;
  try { ready = (await sql`select to_regclass('public.assets') is not null as r`)[0].r; } catch { ready = false; }
  if (!ready) redirect("/setup");
  let alerts: DueAlerts = { due: 0, dueAmount: 0, overdue: 0, today: 0, soon: 0, soonAmount: 0 };
  try { alerts = await dueAlerts(); } catch { /* kolom jatuh tempo belum termigrasi: abaikan alert */ }
  return (
    <>
      <Nav alertCount={alerts.due} />
      <CommandPalette />
      <main className="md:ml-60 px-4 md:px-8 pb-28 max-w-[1500px]">
        <Topbar />
        <DueBanner a={alerts} />
        {children}
      </main>
    </>
  );
}
