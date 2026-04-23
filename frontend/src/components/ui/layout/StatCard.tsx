import { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown } from "lucide-react"

type Props = {
  label: string
  value: string | number
  sub: string
  icon: LucideIcon
  color: string
  bg: string
  trend?: number
  delay?: number
}

export default function StatCard({ label, value, sub, icon: Icon, color, bg, trend = 0, delay = 0 }: Props) {
  const up = trend >= 0
  return (
    <div className="fade-up" style={{
      background: "#1c2128", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: 20,
      display: "flex", flexDirection: "column", gap: 14,
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ background: bg, borderRadius: 9, padding: 9, color }}>
          <Icon size={17} />
        </div>
        {trend !== 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 12, fontWeight: 600,
            color: up ? "#22c55e" : "#f87171",
            background: up ? "rgba(34,197,94,0.13)" : "rgba(248,113,113,0.13)",
            padding: "3px 8px", borderRadius: 99,
          }}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#e6edf3", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: "#8b949e", marginTop: 5 }}>{label}</div>
        <div style={{ fontSize: 11, color: "#484f58", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  )
}