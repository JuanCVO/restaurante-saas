"use client"

import { useEffect, useState } from "react"
import { ShoppingCart, TrendingDown, Wallet, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/axios"

type MovementType = "COMPRA" | "GASTO" | "BASE_CAJA"

type CashMovement = {
  id: string
  type: MovementType
  concept: string
  amount: number
  paymentMethod: string | null
  notes: string | null
  createdAt: string
}

const TYPE_LABELS: Record<MovementType, string> = {
  COMPRA: "Compra",
  GASTO: "Gasto",
  BASE_CAJA: "Base de caja",
}

const TYPE_COLORS: Record<MovementType, string> = {
  COMPRA: "text-blue-400 bg-blue-500/10",
  GASTO: "text-red-400 bg-red-500/10",
  BASE_CAJA: "text-green-400 bg-green-500/10",
}

export default function ComprasPage() {
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [restaurantId, setRestaurantId] = useState("")
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)

  const [type, setType] = useState<MovementType>("COMPRA")
  const [concept, setConcept] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Efectivo")
  const [notes, setNotes] = useState("")
  const [baseCajaAmount, setBaseCajaAmount] = useState("")

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    const t = localStorage.getItem("token") || ""
    if (user.restaurantId) setRestaurantId(user.restaurantId)
    setToken(t)
  }, [])

  useEffect(() => {
    if (!restaurantId || !token) return
    fetchMovements()
  }, [restaurantId, token])

  const fetchMovements = async () => {
    const headers = { Authorization: `Bearer ${token}` }
    const res = await api.get(`/cash-movements/${restaurantId}`, { headers })
    setMovements(res.data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!concept || !amount) return
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      await api.post(
        "/cash-movements",
        { type, concept, amount: Number(amount), paymentMethod, notes, restaurantId },
        { headers }
      )
      setConcept("")
      setAmount("")
      setNotes("")
      await fetchMovements()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const headers = { Authorization: `Bearer ${token}` }
    await api.delete(`/cash-movements/${id}`, { headers })
    setMovements(prev => prev.filter(m => m.id !== id))
  }

  const today = new Date().toDateString()
  const movementsToday = movements.filter(
    m => new Date(m.createdAt).toDateString() === today
  )

  const totalCompras = movementsToday.filter(m => m.type === "COMPRA").reduce((s, m) => s + m.amount, 0)
  const totalGastos = movementsToday.filter(m => m.type === "GASTO").reduce((s, m) => s + m.amount, 0)
  const baseCaja = movementsToday.filter(m => m.type === "BASE_CAJA").reduce((s, m) => s + m.amount, 0)
  const baseCajaYaRegistrada = movementsToday.some(m => m.type === "BASE_CAJA")

  const statCards = [
    {
      title: "Compras hoy",
      value: `$${totalCompras.toLocaleString()}`,
      icon: ShoppingCart,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Gastos hoy",
      value: `$${totalGastos.toLocaleString()}`,
      icon: TrendingDown,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      title: "Base de caja",
      value: `$${baseCaja.toLocaleString()}`,
      icon: Wallet,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
  ]

  return (
    <div className="p-8 space-y-8">

      <div>
        <h1 className="text-3xl font-bold text-white">Compras y Gastos</h1>
        <p className="text-slate-400 mt-1">Registro de movimientos del día</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map(stat => {
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
                <p className="text-slate-400 text-sm mt-1">solo movimientos de hoy</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Registrar movimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {!baseCajaYaRegistrada ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!baseCajaAmount) return
                setLoading(true)
                try {
                  const headers = { Authorization: `Bearer ${token}` }
                  await api.post("/cash-movements", {
                    type: "BASE_CAJA",
                    concept: "Base de caja",
                    amount: Number(baseCajaAmount),
                    paymentMethod: "Efectivo",
                    restaurantId,
                  }, { headers })
                  setBaseCajaAmount("")
                  await fetchMovements()
                } catch (err) {
                  console.error(err)
                } finally {
                  setLoading(false)
                }
              }}
              className="flex items-center gap-4 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4"
            >
              <Wallet className="h-5 w-5 text-green-400 shrink-0" />
              <div className="flex-1">
                <p className="text-white font-medium text-sm mb-1">Base de caja</p>
                <p className="text-slate-400 text-xs">Dinero inicial en caja para dar vueltas</p>
              </div>
              <input
                type="number"
                value={baseCajaAmount}
                onChange={e => setBaseCajaAmount(e.target.value)}
                placeholder="Monto ($)"
                min={1}
                required
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm w-40 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={loading || !baseCajaAmount}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
              >
                {loading ? "Guardando..." : "Registrar base"}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-xl px-5 py-4">
              <Wallet className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-green-400 font-medium text-sm">Base de caja ya registrada hoy</p>
                <p className="text-slate-400 text-xs">${baseCaja.toLocaleString()} — no se puede modificar</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-sm">Tipo</label>
              <select
                value={type === "BASE_CAJA" ? "COMPRA" : type}
                onChange={e => setType(e.target.value as MovementType)}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="COMPRA">Compra (ingredientes)</option>
                <option value="GASTO">Gasto (se resta del ingreso)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-sm">Concepto</label>
              <input
                type="text"
                value={concept}
                onChange={e => setConcept(e.target.value)}
                placeholder="Ej: Compra de arroz, Domicilio..."
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-sm">Monto ($)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min={1}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-sm">Método de pago</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Nequi">Nequi</option>
                <option value="Datafono">Datafono</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-sm">Notas (opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observación adicional..."
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
              >
                {loading ? "Guardando..." : "Registrar"}
              </button>
            </div>

          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-white font-bold text-xl mb-4">Historial de movimientos</h2>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-medium p-4">Tipo</th>
                  <th className="text-left text-slate-400 font-medium p-4">Concepto</th>
                  <th className="text-left text-slate-400 font-medium p-4">Pago</th>
                  <th className="text-left text-slate-400 font-medium p-4">Notas</th>
                  <th className="text-left text-slate-400 font-medium p-4">Hora</th>
                  <th className="text-left text-slate-400 font-medium p-4">Monto</th>
                  <th className="text-left text-slate-400 font-medium p-4"></th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${TYPE_COLORS[m.type]}`}>
                        {TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="p-4 text-white text-sm">{m.concept}</td>
                    <td className="p-4 text-slate-300 text-sm">{m.paymentMethod ?? "—"}</td>
                    <td className="p-4 text-slate-400 text-sm">{m.notes || "—"}</td>
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(m.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-4 text-orange-400 font-bold">${m.amount.toLocaleString()}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No hay movimientos registrados todavía
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