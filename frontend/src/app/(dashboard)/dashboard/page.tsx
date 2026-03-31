"use client"

import { useEffect, useState } from "react"
import { ShoppingBag, Users, UtensilsCrossed, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/axios"

type Stats = {
  totalIngresos: number
  totalPedidos: number
  totalPlatos: number
  mesasOcupadas: number
  totalMesas: number
}

type Order = {
  id: string
  total: number
  createdAt: string
  paymentMethod: string | null
  table: { number: number }
  items: { id: string; quantity: number; product: { name: string } }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [history, setHistory] = useState<Order[]>([])
  const [restaurantId, setRestaurantId] = useState("")
  const [token, setToken] = useState("")

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    const t = localStorage.getItem("token") || ""
    if (user.restaurantId) setRestaurantId(user.restaurantId)
    setToken(t)
  }, [])

  useEffect(() => {
    if (!restaurantId || !token) return
    const headers = { Authorization: `Bearer ${token}` }
    api.get(`/orders/stats/${restaurantId}`, { headers }).then(r => setStats(r.data))
    api.get(`/orders/history/${restaurantId}`, { headers }).then(r => setHistory(r.data))
  }, [restaurantId, token])
  useEffect(() => {
    const handleDayClosed = () => {
      setHistory([])   
      setStats(null)   
    }
    window.addEventListener("day-closed", handleDayClosed)
    return () => window.removeEventListener("day-closed", handleDayClosed)
  }, [])

  const statCards = [
    {
      title: "Pedidos hoy",
      value: stats?.totalPedidos ?? 0,
      description: "órdenes cerradas",
      icon: ShoppingBag,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Mesas activas",
      value: stats ? `${stats.mesasOcupadas}/${stats.totalMesas}` : "–",
      description: `${stats ? stats.totalMesas - stats.mesasOcupadas : 0} disponibles`,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Platos vendidos",
      value: stats?.totalPlatos ?? 0,
      description: "ítems en órdenes de hoy",
      icon: UtensilsCrossed,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Ingresos hoy",
      value: `$${(stats?.totalIngresos ?? 0).toLocaleString()}`,
      description: "total del día",
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ]

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Bienvenido de nuevo 👋</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-slate-400 text-sm font-medium">{stat.title}</CardTitle>
                <div className={`${stat.bg} p-2 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-slate-400 text-sm mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Historial de ventas */}
      <div>
        <h2 className="text-white font-bold text-xl mb-4">Historial de ventas</h2>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-medium p-4">Orden</th>
                  <th className="text-left text-slate-400 font-medium p-4">Mesa</th>
                  <th className="text-left text-slate-400 font-medium p-4">Productos</th>
                  <th className="text-left text-slate-400 font-medium p-4">Hora</th>
                  <th className="text-left text-slate-400 font-medium p-4">Pago</th>
                  <th className="text-left text-slate-400 font-medium p-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {history.map(order => (
                  <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-4 text-slate-400 text-sm font-mono">#{order.id.slice(0, 8)}</td>
                    <td className="p-4 text-white font-medium">Mesa {order.table?.number ?? '–'}</td>
                    <td className="p-4 text-slate-300 text-sm">
                      {order.items.map(i => `${i.product.name} x${i.quantity}`).join(', ')}
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 text-slate-300 text-sm">{order.paymentMethod ?? '–'}</td>
                    <td className="p-4 text-orange-400 font-bold">${order.total.toLocaleString()}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No hay ventas cerradas hoy todavía
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}