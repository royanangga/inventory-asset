"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Dashboard", keys: "g d", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { href: "/assets", label: "Daftar Aset", keys: "g a", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/claims", label: "Claim Customer", keys: "g c", icon: "M9 5h6M9 9h6m-6 4h3M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" },
  { href: "/reconciliation", label: "Rekonsiliasi TB", keys: "g r", icon: "M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function Nav({ alertCount = 0 }: { alertCount?: number }) {
  const path = usePathname();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <aside className="ledger md:w-60 md:min-h-screen md:fixed md:inset-y-0 z-40 flex md:flex-col items-center md:items-stretch gap-2 px-3 py-3 md:py-5 overflow-x-auto md:overflow-visible">
      <div className="hidden md:flex items-center gap-3 px-3 pb-6">
        <svg width="34" height="34" viewBox="0 0 100 100" fill="none" stroke="#c3cbfa" aria-hidden="true">
          <circle cx="50" cy="50" r="45" strokeWidth="5" /><circle cx="50" cy="50" r="37" strokeWidth="1.6" />
          <path d="M30 66V34h26M30 50h20" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="67" cy="63" r="4.5" fill="#c3cbfa" stroke="none" />
        </svg>
        <div>
          <div className="text-[11px] font-medium text-white/50 leading-none">FJI</div>
          <div className="text-[17px] font-semibold text-white leading-tight tracking-tight">Inventory Asset</div>
        </div>
      </div>
      <nav className="flex md:flex-col gap-1 flex-1" aria-label="Menu utama">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${active ? "bg-white/10 text-white font-medium" : "text-white/65 hover:bg-white/5 hover:text-white"}`}>
              {active && <span className="hidden md:block absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#c3cbfa]" />}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={it.icon} /></svg>
              {it.label}
              {it.href === "/assets" && alertCount > 0 && (
                <span className="ml-auto rounded-full bg-[#c8372d] text-white text-[11px] font-semibold px-1.5 min-w-5 text-center pulse-ring" title="Aset yang sudah waktunya di-claim">{alertCount}</span>
              )}
              <span className="hidden md:group-hover:inline ml-auto text-[10px] tracking-widest text-white/35">{alertCount > 0 && it.href === "/assets" ? "" : it.keys}</span>
            </Link>
          );
        })}
      </nav>
      <button onClick={logout} className="text-sm text-white/50 hover:text-white px-3 py-2 text-left cursor-pointer whitespace-nowrap">Keluar</button>
    </aside>
  );
}
