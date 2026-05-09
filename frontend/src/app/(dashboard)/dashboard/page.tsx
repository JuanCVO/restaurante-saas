"use client"

import { useEffect, useState } from "react"
import { ShoppingBag, Users, UtensilsCrossed, TrendingUp, Trash2 } from "lucide-react"
import api from "@/lib/axios"
import { useCurrentUser, authHeaders } from "@/lib/auth"
import TopBar from "@/components/ui/layout/TopBar"
import StatCard from "@/components/ui/layout/StatCard"
import type { DashboardStats, Order, SummaryChart, DailySummary } from "@/types/api"

type Stats = DashboardStats
type SummaryHistory = Pick<
  DailySummary,
  "id" | "date" | "totalOrdenes" | "totalPlatos" | "totalPropinas" | "totalGastos" | "totalIngresos"
>

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
    <div className="w-full pb-1">
      {/* Bars area */}
      <div className="relative h-[180px]">
        {/* Gridlines */}
        {[0.25, 0.5, 0.75, 1].map(t => (
          <div
            key={t}
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ bottom: `${t * 100}%`, background: "rgba(255,255,255,0.05)" }}
          />
        ))}

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-1.5 px-1">
          {data.map((_d, i) => {
            const val    = vals[i]
            const pct    = (val / max) * 100
            const isHov  = hov === i
            const isLast = i === data.length - 1
            const fill   = isLast ? "#f97316" : isHov ? "#60a5fa" : "rgba(249,115,22,0.38)"

            return (
              <div
                key={i}
                className="flex-1 h-full flex flex-col justify-end items-center relative cursor-default"
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)}
              >
                {/* Value label */}
                {val > 0 && (isHov || isLast) && (
                  <div
                    className="absolute text-[11px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-[5px] border border-white/8 z-10"
                    style={{
                      bottom: `calc(${pct}% + 8px)`,
                      color: isLast ? "#f97316" : "#60a5fa",
                      background: "#161b22",
                    }}
                  >
                    {fmt(val)}
                  </div>
                )}

                {/* Bar */}
                <div
                  className="w-[62%] rounded-t-[5px] rounded-b-[2px] transition-[background] duration-150"
                  style={{
                    height: `${Math.max(pct, val > 0 ? 1.5 : 0)}%`,
                    background: fill,
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Day labels row */}
      <div className="flex gap-1.5 px-1 pt-2.5">
        {data.map((d, i) => {
          const isLast = i === data.length - 1
          return (
            <div
              key={i}
              className="flex-1 text-center text-xs select-none"
              style={{
                color: isLast ? "#f97316" : "#8b949e",
                fontWeight: isLast ? 700 : 400,
              }}
            >
              {d.day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [chartData, setChartData]           = useState<SummaryChart[]>([])
  const [period, setPeriod]                 = useState<"week" | "month">("week")
  const [metric, setMetric]                 = useState<"ingresos" | "pedidos">("ingresos")
  const [stats, setStats]                   = useState<Stats | null>(null)
  const [history, setHistory]               = useState<Order[]>([])
  const [summaryHistory, setSummaryHistory] = useState<SummaryHistory[]>([])
  const [baseCaja, setBaseCaja]             = useState(0)
  const [deletingId, setDeletingId]         = useState<string | null>(null)

  const { user, token, restaurantId } = useCurrentUser()
  const restaurantName = user?.restaurantName ?? ""

  const handleDeleteSummary = async (id: string) => {
    if (!confirm("¿Eliminar este cierre del historial?")) return
    setDeletingId(id)
    try {
      await api.delete(`daily-summary/entry/${id}`, { headers: authHeaders() })
      setSummaryHistory(prev => prev.filter(s => s.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

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
    const headers = authHeaders()

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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar title="Dashboard" />

      <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-6">

        {/* Header */}
        <div>
          <h2 className="text-[21px] font-extrabold text-[#e6edf3]">Bienvenidos</h2>
          <p className="text-sm text-[#8b949e] mt-1">
            Resumen de hoy en{" "}
            <span suppressHydrationWarning className="text-orange-500 font-semibold">
              {restaurantName}
            </span>
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
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
        <div className="bg-[#1c2128] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold text-[15px] text-[#e6edf3]">Ventas archivadas</p>
              <p className="text-xs text-[#8b949e] mt-0.5">Último día resaltado en naranja</p>
            </div>
            <div className="flex gap-1.5 items-center flex-wrap">
              {(["ingresos", "pedidos"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer transition-all border ${
                    metric === m
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-[#161b22] text-[#8b949e] border-white/8"
                  }`}
                >
                  {m === "ingresos" ? "Ingresos" : "Pedidos"}
                </button>
              ))}
              <div className="w-px h-5 bg-white/8" />
              {(["week", "month"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer transition-all border ${
                    period === p
                      ? "bg-white/8 text-[#e6edf3] border-white/[0.14]"
                      : "bg-transparent text-[#8b949e] border-transparent"
                  }`}
                >
                  {p === "week" ? "7d" : "30d"}
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 pt-4">
            {chartData.length > 0 ? (
              <BarChart data={chartData} metric={metric} />
            ) : (
              <div className="h-[180px] flex items-center justify-center text-[#484f58] text-sm">
                Sin datos archivados aún
              </div>
            )}
          </div>
        </div>

        {/* Historial de ventas */}
        <div>
          <h2 className="text-[#e6edf3] font-bold text-[17px] mb-3.5">Historial de ventas</h2>
          <div className="bg-[#1c2128] border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/8">
                  {["Orden","Mesa","Productos","Hora","Pago","Propina","Total"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-bold text-[#484f58] uppercase tracking-[0.6px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((order, i) => (
                  <tr
                    key={order.id}
                    className="transition-colors duration-100 hover:bg-white/[0.03]"
                    style={{ borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                  >
                    <td className="px-4 py-[11px] font-mono text-xs text-[#8b949e]">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-[11px] font-bold text-[#e6edf3] text-sm">
                      Mesa {order.table?.number ?? "–"}
                    </td>
                    <td className="px-4 py-[11px] text-[#8b949e] text-[13px] max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {order.items.map(i => `${i.product.name} x${i.quantity}`).join(", ")}
                    </td>
                    <td className="px-4 py-[11px] text-[#8b949e] text-[13px]">
                      {new Date(order.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-[11px]">
                      {order.paymentMethod ? (
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background: `${PAY_COLORS[order.paymentMethod] ?? "#8b949e"}20`,
                            color: PAY_COLORS[order.paymentMethod] ?? "#8b949e",
                          }}
                        >
                          {order.paymentMethod}
                        </span>
                      ) : "–"}
                    </td>
                    <td className="px-4 py-[11px] text-[13px] font-semibold">
                      {order.tip && order.tip > 0
                        ? <span className="text-amber-400">${order.tip.toLocaleString()}</span>
                        : <span className="text-[#484f58]">–</span>
                      }
                    </td>
                    <td className="px-4 py-[11px] font-bold text-orange-500 text-sm">
                      ${order.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#484f58] text-sm">
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
          <h2 className="text-[#e6edf3] font-bold text-[17px] mb-3.5">Historial de cierres</h2>
          <div className="bg-[#1c2128] border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/8">
                  {["Fecha","Órdenes","Platos","Propinas","Gastos","Ingresos netos",""].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-bold text-[#484f58] uppercase tracking-[0.6px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryHistory.map((s, i) => (
                  <tr
                    key={s.id}
                    className="transition-colors duration-100 hover:bg-white/[0.03]"
                    style={{ borderBottom: i < summaryHistory.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                  >
                    <td className="px-4 py-[11px] text-[#8b949e] text-[13px]">
                      {new Date(s.date).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Bogota" })}
                    </td>
                    <td className="px-4 py-[11px] font-bold text-[#e6edf3]">{s.totalOrdenes}</td>
                    <td className="px-4 py-[11px] text-[#8b949e] text-[13px]">{s.totalPlatos}</td>
                    <td className="px-4 py-[11px] font-semibold text-amber-400 text-[13px]">
                      ${s.totalPropinas.toLocaleString()}
                    </td>
                    <td className="px-4 py-[11px] font-semibold text-[#f87171] text-[13px]">
                      {(s.totalGastos ?? 0) > 0
                        ? `- $${(s.totalGastos ?? 0).toLocaleString()}`
                        : <span className="text-[#484f58]">–</span>}
                    </td>
                    <td className="px-4 py-[11px] font-bold text-orange-500 text-sm">
                      ${s.totalIngresos.toLocaleString()}
                    </td>
                    <td className="px-4 py-[11px]">
                      <button
                        onClick={() => handleDeleteSummary(s.id)}
                        disabled={deletingId === s.id}
                        title="Eliminar cierre"
                        className={`flex items-center p-1 border-none bg-transparent cursor-pointer transition-colors ${
                          deletingId === s.id ? "text-[#484f58]" : "text-[#f87171] hover:text-red-400"
                        }`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {summaryHistory.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#484f58] text-sm">
                      No hay cierres registrados aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-5 border-t border-white/5 text-center">
          <p className="text-[#484f58] text-xs">
            Sistema desarrollado por{" "}
            <span className="text-orange-500/70 font-semibold">@JuanCVO</span>
          </p>
        </div>

      </div>
    </div>
  )
}
