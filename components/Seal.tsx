/**
 * Cap ala hanko kantor Jepang, tinta indigo.
 * kind="check": cap kecil penanda "sudah diclaim".
 * kind="date":  cap tanggal (atas / tanggal / kata) untuk rekonsiliasi final.
 */
export default function Seal({ kind = "check", size = 26, top = "FJI", mid, bottom = "FINAL", animate, title }: {
  kind?: "check" | "date"; size?: number; top?: string; mid?: string; bottom?: string; animate?: boolean; title?: string;
}) {
  const common = { width: size, height: size, viewBox: "0 0 100 100", role: "img", "aria-label": title ?? (kind === "check" ? "Sudah diclaim" : `Final ${mid ?? ""}`), fill: "none", stroke: "var(--stamp)" } as const;
  const cls = `inline-block shrink-0 ${animate ? "stamp-in" : ""}`;
  const style = { color: "var(--stamp)", transform: "rotate(-8deg)", opacity: 0.94 } as const;
  if (kind === "check") {
    return (
      <svg {...common} className={cls} style={style}>
        <title>{title ?? "Sudah diclaim"}</title>
        <circle cx="50" cy="50" r="44" strokeWidth="8" />
        <path d="M27 52 L43 68 L74 32" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common} className={cls} style={style}>
      <title>{title ?? `Final ${mid ?? ""}`}</title>
      <circle cx="50" cy="50" r="46" strokeWidth="3.4" />
      <circle cx="50" cy="50" r="40" strokeWidth="1.2" />
      <line x1="14" y1="39" x2="86" y2="39" strokeWidth="1.2" />
      <line x1="14" y1="61" x2="86" y2="61" strokeWidth="1.2" />
      <g fill="var(--stamp)" stroke="none" textAnchor="middle" fontWeight="600" fontFamily="inherit">
        <text x="50" y="32" fontSize="13" letterSpacing="2.5">{top}</text>
        <text x="50" y="55" fontSize="12.5" letterSpacing="0.4">{mid}</text>
        <text x="50" y="77" fontSize="14" letterSpacing="2.5">{bottom}</text>
      </g>
    </svg>
  );
}
