"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { href: "/assets", label: "Daftar Aset", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/claims", label: "Claim Customer", icon: "M9 5h6M9 9h6m-6 4h3M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" },
  { href: "/reconciliation", label: "Rekonsiliasi TB", icon: "M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function Nav({ alertCount = 0 }: { alertCount?: number }) {
  const path = usePathname();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <aside className="md:w-60 md:min-h-screen bg-slate-900 text-slate-200 md:fixed md:inset-y-0 flex md:flex-col items-center md:items-stretch gap-2 px-3 py-3 md:py-5 overflow-x-auto">
      <div className="hidden md:block px-3 pb-5">
        <div className="text-[11px] font-semibold tracking-[0.2em] text-brand-100/70 uppercase">FJI</div>
        <div className="text-lg font-semibold text-white leading-tight">Inventory Asset</div>
      </div>
      <nav className="flex md:flex-col gap-1 flex-1">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${active ? "bg-white/10 text-white font-medium" : "text-slate-300 hover:bg-white/5"}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={it.icon} /></svg>
              {it.label}
              {it.href === "/assets" && alertCount > 0 && <span className="ml-auto rounded-full bg-red-500 text-white text-[11px] font-semibold px-1.5 min-w-5 text-center" title="Aset yang sudah waktunya di-claim">{alertCount}</span>}
            </Link>
          );
        })}
      </nav>
      <button onClick={logout} className="text-sm text-slate-400 hover:text-white px-3 py-2 text-left cursor-pointer whitespace-nowrap">Keluar</button>
    </aside>
  );
}
