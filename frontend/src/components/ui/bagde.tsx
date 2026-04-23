type BadgeColor = "green" | "orange" | "red" | "blue" | "amber" | "purple"

const MAP: Record<BadgeColor, { bg: string; fg: string }> = {
  green:  { bg: "rgba(34,197,94,0.13)",   fg: "#22c55e" },
  orange: { bg: "rgba(249,115,22,0.14)",  fg: "#f97316" },
  red:    { bg: "rgba(248,113,113,0.13)", fg: "#f87171" },
  blue:   { bg: "rgba(96,165,250,0.13)",  fg: "#60a5fa" },
  amber:  { bg: "rgba(251,191,36,0.13)",  fg: "#fbbf24" },
  purple: { bg: "rgba(192,132,252,0.13)", fg: "#c084fc" },
}

export function Badge({ color = "green", children }: { color?: BadgeColor; children: React.ReactNode }) {
  const { bg, fg } = MAP[color]
  return (
    <span style={{
      background: bg, color: fg,
      padding: "2px 10px", borderRadius: 99,
      fontSize: 12, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 4,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  )
}