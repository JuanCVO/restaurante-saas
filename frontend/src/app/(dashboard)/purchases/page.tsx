"use client"

import { useEffect, useState } from "react"
import { ShoppingCart, TrendingDown, Wallet, Users, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/axios"
import { useCurrentUser, authHeaders } from "@/lib/auth"
import type { MovementType, CashMovement, EmployeePayment, Employee } from "@/types/api"

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
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payments, setPayments] = useState<EmployeePayment[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPago, setLoadingPago] = useState(false)
  const { token, restaurantId } = useCurrentUser()

  const [type, setType] = useState<MovementType>("COMPRA")
  const [concept, setConcept] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Efectivo")
  const [notes, setNotes] = useState("")
  const [baseCajaAmount, setBaseCajaAmount] = useState("")

  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [salary, setSalary] = useState("")
  const [tipPago, setTipPago] = useState("")
  const [notesPago, setNotesPago] = useState("")

  useEffect(() => {
    if (!restaurantId || !token) return
    const headers = authHeaders()
    fetchMovements()
    api.get(`/auth/users/${restaurantId}`, { headers })
      .then(res => setEmployees(res.data))
      .catch(console.error)
    fetchPayments()
  }, [restaurantId, token])

  const fetchMovements = async () => {
    const headers = authHeaders()
    const res = await api.get(`/cash-movements/${restaurantId}`, { headers })
    setMovements(res.data)
  }

  const fetchPayments = async () => {
    const headers = authHeaders()
    const res = await api.get(`/employee-payments/${restaurantId}`, { headers })
    setPayments(res.data)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!concept || !amount) return
    setLoading(true)
    try {
      const headers = authHeaders()
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
    const headers = authHeaders()
    await api.delete(`/cash-movements/${id}`, { headers })
    setMovements(prev => prev.filter(m => m.id !== id))
  }

  const handlePagoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedEmployee || !salary) return
    setLoadingPago(true)
    try {
      const headers = authHeaders()
      await api.post(
        "/employee-payments",
        {
          userId: selectedEmployee,
          restaurantId,
          salary: Number(salary),
          tip: Number(tipPago || 0),
          notes: notesPago || null,
        },
        { headers }
      )
      setSelectedEmployee("")
      setSalary("")
      setTipPago("")
      setNotesPago("")
      await fetchPayments()
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPago(false)
    }
  }

  const handleDeletePago = async (id: string) => {
    const headers = authHeaders()
    await api.delete(`/employee-payments/${id}`, { headers })
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  const today = new Date().toDateString()
  const movementsToday = movements.filter(
    m => new Date(m.createdAt).toDateString() === today
  )

  const totalCompras = movementsToday.filter(m => m.type === "COMPRA").reduce((s, m) => s + m.amount, 0)
  const totalGastos = movementsToday.filter(m => m.type === "GASTO").reduce((s, m) => s + m.amount, 0)
  const baseCaja = movementsToday.filter(m => m.type === "BASE_CAJA").reduce((s, m) => s + m.amount, 0)
  const baseCajaYaRegistrada = movementsToday.some(m => m.type === "BASE_CAJA")
  const totalPagosHoy = payments.reduce((s, p) => s + p.salary + p.tip, 0)

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
    {
      title: "Pagos empleados hoy",
      value: `$${totalPagosHoy.toLocaleString()}`,
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ]

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto">

      <div>
        <h1 className="text-3xl font-bold text-white">Compras y Gastos</h1>
        <p className="text-slate-400 mt-1">Registro de movimientos del día</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-slate-400 text-xs mt-1">solo movimientos de hoy</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Movimientos de caja */}
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
                  const headers = authHeaders()
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

      {/* Pagos a empleados */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Pagos a empleados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          <form onSubmit={handlePagoSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-sm">Empleado</label>
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                required
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Seleccionar empleado...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role === "ADMIN" ? "Admin" : "Empleado"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-sm">Pago del día ($)</label>
              <input
                type="number"
                value={salary}
                onChange={e => setSalary(e.target.value)}
                placeholder="0"
                min={0}
                required
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-sm">Propina asignada ($)</label>
              <input
                type="number"
                value={tipPago}
                onChange={e => setTipPago(e.target.value)}
                placeholder="0"
                min={0}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-slate-400 text-sm">Notas (opcional)</label>
              <input
                type="text"
                value={notesPago}
                onChange={e => setNotesPago(e.target.value)}
                placeholder="Observación..."
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loadingPago || !selectedEmployee || !salary}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
              >
                {loadingPago ? "Guardando..." : "Registrar pago"}
              </button>
            </div>

          </form>

          {payments.length > 0 ? (
            <div>
              <p className="text-slate-400 text-sm mb-3">Pagos registrados hoy</p>
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-white text-sm font-medium">{p.user.name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Pago: ${p.salary.toLocaleString()}
                        {p.tip > 0 && `  +  Propina: $${p.tip.toLocaleString()}`}
                        {p.notes && `  ·  ${p.notes}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-purple-400 font-bold text-sm">
                        ${(p.salary + p.tip).toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleDeletePago(p.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between px-4 pt-2 border-t border-slate-700">
                  <span className="text-slate-400 text-sm">Total pagos hoy</span>
                  <span className="text-purple-400 font-bold">${totalPagosHoy.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">No hay pagos a empleados registrados hoy</p>
          )}

        </CardContent>
      </Card>

      {/* Historial de movimientos */}
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
