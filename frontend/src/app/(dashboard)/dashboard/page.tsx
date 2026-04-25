"use client"

import { useEffect, useState } from "react"
import { ShoppingBag, Users, UtensilsCrossed, TrendingUp, Trash2 } from "lucide-react"
import api from "@/lib/axios"
import TopBar from "@/components/ui/layout/TopBar"
import StatCard from "@/components/ui/layout/StatCard"

type Stats = {
  totalIngresos: number
  totalPropinas: number
  totalRecibido: number
  totalPedidos: number
  totalPlatos: number
  mesasOcupadas: number
  totalMesas: number
}

type Order = {
  id: string
  total: number
  tip: number | null
  createdAt: string
  paymentMethod: string | null
  table: { number: number }
  items: { id: string; quantity: number; product: { name: string } }[]
}

type SummaryChart = {
  date: string
  day: string
  pedidos: number
  ingresos: number
  platos: number
  propinas: number
  efectivo: number
  datafono: number
  nequi: number
}

type SummaryHistory = {
  id: string
  date: string
  totalOrdenes: number
  totalPlatos: number
  totalPropinas: number
  totalGastos: number
  totalIngresos: number
}

const PAY_COLORS: Record<string, string> = {
  Efectivo: "#22c55e",
  Datafono: "#fbbf24",
  Nequi:    "#60a5fa",
}

function BarChart({ data, metric }: { data: SummaryChart[]; metric: "ingresos" | "pedidos" }) {
  const [hov, setHov] = useState<number | null>(null)

  const vals = data.map(d => d[metric])
  const max  = Math.max(...vals, 1)

  const fmt = (v: number) =>
    metric === "ingresos"
      ? v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}k`
      : `${v}`

  return (
    <div style={{ width: "100%", paddingBottom: 4 }}>
      {/* Bars area */}
      <div style={{ position: "relative", height: 180 }}>
        {/* Gridlines */}
        {[0.25, 0.5, 0.75, 1].map(t => (
          <div key={t} style={{
            position: "absolute", left: 0, right: 0,
            bottom: `${t * 100}%`, height: 1,
            background: "rgba(255,255,255,0.05)",
            pointerEvents: "none",
          }} />
        ))}

        {/* Bars */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "flex-end", gap: 6, padding: "0 4px",
        }}>
          {data.map((_d, i) => {
            const val    = vals[i]
            const pct    = (val / max) * 100
            const isHov  = hov === i
            const isLast = i === data.length - 1
            const fill   = isLast ? "#f97316" : isHov ? "#60a5fa" : "rgba(249,115,22,0.38)"

            return (
              <div
                key={i}
                style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", position: "relative", cursor: "default" }}
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)}
              >
                {/* Value label */}
                {val > 0 && (isHov || isLast) && (
                  <div style={{
                    position: "absolute",
                    bottom: `calc(${pct}% + 8px)`,
                    fontSize: 11, fontWeight: 700,
                    color: isLast ? "#f97316" : "#60a5fa",
                    whiteSpace: "nowrap",
                    background: "#161b22",
                    padding: "2px 7px", borderRadius: 5,
                    border: "1px solid rgba(255,255,255,0.08)",
                    zIndex: 10,
                  }}>
                    {fmt(val)}
                  </div>
                )}

                {/* Bar */}
                <div style={{
                  width: "62%",
                  height: `${Math.max(pct, val > 0 ? 1.5 : 0)}%`,
                  background: fill,
                  borderRadius: "5px 5px 2px 2px",
                  transition: "background 0.15s",
                }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Day labels row */}
      <div style={{ display: "flex", gap: 6, padding: "10px 4px 0" }}>
        {data.map((d, i) => {
          const isLast = i === data.length - 1
          return (
            <div key={i} style={{
              flex: 1, textAlign: "center",
              fontSize: 12,
              color: isLast ? "#f97316" : "#8b949e",
              fontWeight: isLast ? 700 : 400,
              userSelect: "none",
            }}>
              {d.day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [chartData, setChartData]         = useState<SummaryChart[]>([])
  const [period, setPeriod]               = useState<"week" | "month">("week")
  const [metric, setMetric]               = useState<"ingresos" | "pedidos">("ingresos")
  const [stats, setStats]                 = useState<Stats | null>(null)
  const [history, setHistory]             = useState<Order[]>([])
  const [restaurantId, setRestaurantId]   = useState("")
  const [token, setToken]                 = useState("")
  const [summaryHistory, setSummaryHistory] = useState<SummaryHistory[]>([])
  const [baseCaja, setBaseCaja]           = useState(0)
  const [restaurantName, setRestaurantName] = useState("")
  const [deletingId, setDeletingId]       = useState<string | null>(null)

  const handleDeleteSummary = async (id: string) => {
    if (!confirm("¿Eliminar este cierre del historial?")) return
    setDeletingId(id)
    try {
      await api.delete(`daily-summary/entry/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      setSummaryHistory(prev => prev.filter(s => s.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    const t    = localStorage.getItem("token") || ""
    if (user.restaurantId)   setRestaurantId(user.restaurantId)
    if (user.restaurantName) setRestaurantName(user.restaurantName)
    setToken(t)
  }, [])

  useEffect(() => {
    const handleDayClosed = () => {
      setHistory([])
      setStats(null)
    }
    window.addEventListener("day-closed", handleDayClosed)
    return () => window.removeEventListener("day-closed", handleDayClosed)
  }, [])

  useEffect(() => {
    if (!restaurantId || !token) return
    const headers = { Authorization: `Bearer ${token}` }

    api.get(`orders/stats/${restaurantId}`, { headers })
      .then(r => setStats(r.data))

    api.get(`orders/history/${restaurantId}`, { headers })
      .then(r => setHistory(r.data))

    api.get(`daily-summary/history/${restaurantId}`, { headers })
      .then(r => setSummaryHistory(r.data))

    api.get(`daily-summary/chart/${restaurantId}?period=${period}`, { headers })
      .then(r => {
        const fixedData = r.data.map((item: SummaryChart) => {
          const [, month, day] = item.date.slice(0, 10).split("-")
          return { ...item, day: `${day}/${month}` }
        })
        setChartData(fixedData)
      })

    api.get(`/cash-movements/${restaurantId}`, { headers })
      .then(r => {
        const today = new Date().toDateString()
        const todayMovements = r.data.filter(
          (m: { createdAt: string; type: string }) =>
            new Date(m.createdAt).toDateString() === today
        )
        const base = todayMovements
          .filter((m: { type: string }) => m.type === "BASE_CAJA")
          .reduce((s: number, m: { amount: number }) => s + m.amount, 0)
        setBaseCaja(base)
      })
  }, [restaurantId, token, period])

  const user = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("user") || "{}")
    : {}

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <TopBar title="Dashboard" />

      <div style={{
        flex: 1, overflowY: "auto",
        padding: "24px 28px",
        display: "flex", flexDirection: "column", gap: 22,
      }}>

        {/* Header */}
        <div>
          <h2 style={{ fontSize: 21, fontWeight: 800, color: "#e6edf3" }}>
            Bienvenidos
          </h2>
          <p style={{ fontSize: 14, color: "#8b949e", marginTop: 4 }}>
            Resumen de hoy en{" "}
            <span
              suppressHydrationWarning
              style={{ color: "#f97316", fontWeight: 600 }}
            >
              {restaurantName}
            </span>
          </p>
        </div>

        {/* Stat Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}>
          <StatCard
            label="Pedidos hoy"
            value={stats?.totalPedidos ?? 0}
            sub="órdenes cerradas"
            icon={ShoppingBag}
            color="#f97316"
            bg="rgba(249,115,22,0.14)"
            trend={12}
            delay={0}
          />
          <StatCard
            label="Mesas activas"
            value={stats ? `${stats.mesasOcupadas}/${stats.totalMesas}` : "–"}
            sub={`${stats ? stats.totalMesas - stats.mesasOcupadas : 0} disponibles`}
            icon={Users}
            color="#60a5fa"
            bg="rgba(96,165,250,0.13)"
            trend={5}
            delay={60}
          />
          <StatCard
            label="Platos vendidos"
            value={stats?.totalPlatos ?? 0}
            sub="ítems en órdenes de hoy"
            icon={UtensilsCrossed}
            color="#22c55e"
            bg="rgba(34,197,94,0.13)"
            trend={8}
            delay={120}
          />
          <StatCard
            label="Ingresos hoy"
            value={`$${((stats?.totalIngresos ?? 0) + baseCaja).toLocaleString()}`}
            sub="ventas + base de caja"
            icon={TrendingUp}
            color="#c084fc"
            bg="rgba(192,132,252,0.13)"
            trend={21}
            delay={180}
          />
          <StatCard
            label="Propinas hoy"
            value={`$${(stats?.totalPropinas ?? 0).toLocaleString()}`}
            sub="propinas del día"
            icon={TrendingUp}
            color="#fbbf24"
            bg="rgba(251,191,36,0.13)"
            delay={240}
          />
        </div>

        {/* Gráfica */}
        <div style={{
          background: "#1c2128",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#e6edf3" }}>
                Ventas archivadas
              </div>
              <div style={{ fontSize: 12, color: "#8b949e", marginTop: 2 }}>
                Último día resaltado en naranja
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {(["ingresos", "pedidos"] as const).map(m => (
                <button key={m} onClick={() => setMetric(m)} style={{
                  padding: "6px 14px", borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: metric === m ? "#f97316" : "#161b22",
                  color:      metric === m ? "#fff"    : "#8b949e",
                  border: `1px solid ${metric === m ? "#f97316" : "rgba(255,255,255,0.08)"}`,
                  transition: "all 0.15s",
                }}>
                  {m === "ingresos" ? "Ingresos" : "Pedidos"}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />
              {(["week", "month"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: "6px 12px", borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: period === p ? "rgba(255,255,255,0.08)" : "transparent",
                  color:      period === p ? "#e6edf3" : "#8b949e",
                  border: `1px solid ${period === p ? "rgba(255,255,255,0.14)" : "transparent"}`,
                  transition: "all 0.15s",
                }}>
                  {p === "week" ? "7d" : "30d"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: "16px 20px 0" }}>
            {chartData.length > 0 ? (
              <BarChart data={chartData} metric={metric} />
            ) : (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#484f58", fontSize: 14 }}>
                Sin datos archivados aún
              </div>
            )}
          </div>
        </div>

        {/* Historial de ventas */}
        <div>
          <h2 style={{ color: "#e6edf3", fontWeight: 700, fontSize: 17, marginBottom: 14 }}>
            Historial de ventas
          </h2>
          <div style={{
            background: "#1c2128",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Orden","Mesa","Productos","Hora","Pago","Propina","Total"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "10px 16px",
                      fontSize: 11, fontWeight: 700,
                      color: "#484f58", textTransform: "uppercase", letterSpacing: 0.6,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((order, i) => (
                  <tr key={order.id} style={{
                    borderBottom: i < history.length - 1
                      ? "1px solid rgba(255,255,255,0.05)" : "none",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "11px 16px", fontFamily: "monospace", fontSize: 12, color: "#8b949e" }}>
                      #{order.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: "11px 16px", fontWeight: 700, color: "#e6edf3", fontSize: 14 }}>
                      Mesa {order.table?.number ?? "–"}
                    </td>
                    <td style={{ padding: "11px 16px", color: "#8b949e", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {order.items.map(i => `${i.product.name} x${i.quantity}`).join(", ")}
                    </td>
                    <td style={{ padding: "11px 16px", color: "#8b949e", fontSize: 13 }}>
                      {new Date(order.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      {order.paymentMethod ? (
                        <span style={{
                          background: `${PAY_COLORS[order.paymentMethod] ?? "#8b949e"}20`,
                          color: PAY_COLORS[order.paymentMethod] ?? "#8b949e",
                          padding: "2px 10px", borderRadius: 99,
                          fontSize: 12, fontWeight: 600,
                        }}>
                          {order.paymentMethod}
                        </span>
                      ) : "–"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600 }}>
                      {order.tip && order.tip > 0
                        ? <span style={{ color: "#fbbf24" }}>${order.tip.toLocaleString()}</span>
                        : <span style={{ color: "#484f58" }}>–</span>
                      }
                    </td>
                    <td style={{ padding: "11px 16px", fontWeight: 700, color: "#f97316", fontSize: 14 }}>
                      ${order.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#484f58", fontSize: 14 }}>
                      No hay ventas cerradas hoy todavía
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial de cierres */}
        <div>
          <h2 style={{ color: "#e6edf3", fontWeight: 700, fontSize: 17, marginBottom: 14 }}>
            Historial de cierres
          </h2>
          <div style={{
            background: "#1c2128",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Fecha","Órdenes","Platos","Propinas","Gastos","Ingresos netos",""].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "10px 16px",
                      fontSize: 11, fontWeight: 700,
                      color: "#484f58", textTransform: "uppercase", letterSpacing: 0.6,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryHistory.map((s, i) => (
                  <tr key={s.id} style={{
                    borderBottom: i < summaryHistory.length - 1
                      ? "1px solid rgba(255,255,255,0.05)" : "none",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "11px 16px", color: "#8b949e", fontSize: 13 }}>
                      {new Date(s.date).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Bogota" })}
                    </td>
                    <td style={{ padding: "11px 16px", fontWeight: 700, color: "#e6edf3" }}>
                      {s.totalOrdenes}
                    </td>
                    <td style={{ padding: "11px 16px", color: "#8b949e", fontSize: 13 }}>
                      {s.totalPlatos}
                    </td>
                    <td style={{ padding: "11px 16px", fontWeight: 600, color: "#fbbf24", fontSize: 13 }}>
                      ${s.totalPropinas.toLocaleString()}
                    </td>
                    <td style={{ padding: "11px 16px", fontWeight: 600, color: "#f87171", fontSize: 13 }}>
                      {(s.totalGastos ?? 0) > 0
                        ? `- $${(s.totalGastos ?? 0).toLocaleString()}`
                        : <span style={{ color: "#484f58" }}>–</span>}
                    </td>
                    <td style={{ padding: "11px 16px", fontWeight: 700, color: "#f97316", fontSize: 14 }}>
                      ${s.totalIngresos.toLocaleString()}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <button
                        onClick={() => handleDeleteSummary(s.id)}
                        disabled={deletingId === s.id}
                        title="Eliminar cierre"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: deletingId === s.id ? "#484f58" : "#f87171",
                          padding: 4, display: "flex", alignItems: "center",
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {summaryHistory.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#484f58", fontSize: 14 }}>
                      No hay cierres registrados aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 12, paddingTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          textAlign: "center",
        }}>
          <p style={{ color: "#484f58", fontSize: 12 }}>
            Sistema desarrollado por{" "}
            <span style={{ color: "rgba(249,115,22,0.7)", fontWeight: 600 }}>@JuanCVO</span>
          </p>
        </div>

      </div>
    </div>
  )
}