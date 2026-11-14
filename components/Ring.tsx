/** Cincin progres sederhana (0–1). tone menentukan warna. */
export default function Ring({ value, size = 96, stroke = 9, tone = "brand", children }: {
  value: number; size?: number; stroke?: number; tone?: "brand" | "good" | "warn" | "bad"; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  const color = { brand: "var(--b500)", good: "var(--e600)", warn: "var(--a600)", bad: "var(--r500)" }[tone];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--s200)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
