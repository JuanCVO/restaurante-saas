"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UtensilsCrossed, Plus, Trash2, X, ShoppingBag, CheckCircle } from "lucide-react"
import api from "@/lib/axios"

type OrderItem = {
  id: string
  quantity: number
  unitPrice: number
  product: { id: string; name: string; price: number }
}

type Order = {
  id: string
  total: number
  status: string
  items: OrderItem[]
}

type Table = {
  id: string
  number: number
  status: "DISPONIBLE" | "OCUPADA"
  orders: Order[]
}

type Product = {
  id: string
  name: string
  price: number
  unit: string
  category: { name: string }
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [restaurantId, setRestaurantId] = useState("")
  const [token, setToken] = useState("")
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    const t = localStorage.getItem("token") || ""
    if (user.restaurantId) setRestaurantId(user.restaurantId)
    setToken(t)
  }, [])

  useEffect(() => {
    if (!restaurantId || !token) return
    fetchTables()
    fetchProducts()
  }, [restaurantId, token])

  const headers = { Authorization: `Bearer ${token}` }

  const fetchTables = async () => {
    const res = await api.get(`/tables/${restaurantId}`, { headers })
    setTables(res.data)
  }

  const fetchProducts = async () => {
    const res = await api.get(`/products/${restaurantId}`, { headers })
    setProducts(res.data)
  }

  const fetchActiveOrder = async (tableId: string) => {
    const res = await api.get(`/orders/table/${tableId}`, { headers })
    setActiveOrder(res.data)
  }

  const handleTableClick = async (table: Table) => {
    setSelectedTable(table)
    setLoading(true)

    if (table.status === "DISPONIBLE") {
      // Crear orden nueva
      const res = await api.post("/orders", { tableId: table.id, restaurantId }, { headers })
      setActiveOrder(res.data)
      await fetchTables()
    } else {
      // Cargar orden activa
      await fetchActiveOrder(table.id)
    }

    setLoading(false)
    setDrawerOpen(true)
  }

  const handleAddProduct = async (productId: string) => {
    if (!activeOrder) return
    try {
      await api.post(`/orders/${activeOrder.id}/items`, { productId, quantity: 1 }, { headers })
      // Refrescar orden
      const res = await api.get(`/orders/${activeOrder.id}`, { headers })
      setActiveOrder(res.data)
    } catch (error: any) {
      alert(error?.response?.data?.message || "Error al agregar producto")
    }
  }

  const handleCloseOrder = async () => {
    if (!activeOrder) return
    await api.patch(`/orders/${activeOrder.id}/close`, { paymentMethod }, { headers })
    setDrawerOpen(false)
    setActiveOrder(null)
    setSelectedTable(null)
    setShowPayment(false)
    setPaymentMethod("")
    await fetchTables()
  }

  const handleAddTable = async () => {
    const nextNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1
    await api.post("/tables", { number: nextNumber, restaurantId }, { headers })
    fetchTables()
  }

  const handleDeleteTable = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("¿Eliminar esta mesa?")) return
    await api.delete(`/tables/${id}`, { headers })
    fetchTables()
  }

  const handleRemoveItem = async (itemId: string) => {
  await api.delete(`/orders/items/${itemId}`, { headers })
  const res = await api.get(`/orders/${activeOrder!.id}`, { headers })
  setActiveOrder(res.data)
  }

  const disponibles = tables.filter(t => t.status === "DISPONIBLE").length
  const ocupadas = tables.filter(t => t.status === "OCUPADA").length

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Mesas</h1>
          <p className="text-slate-400 mt-1">
            {disponibles} disponibles · {ocupadas} ocupadas
          </p>
        </div>
        <Button onClick={handleAddTable} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="h-4 w-4 mr-2" /> Nueva mesa
        </Button>
      </div>

      {/* Grid de mesas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map(table => {
          const isOcupada = table.status === "OCUPADA"
          return (
            <Card
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`border-2 cursor-pointer transition-all hover:scale-105 ${
                isOcupada
                  ? "bg-orange-500/10 border-orange-500"
                  : "bg-slate-800 border-slate-700 hover:border-green-500"
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${isOcupada ? "bg-orange-500/20" : "bg-slate-700"}`}>
                    <UtensilsCrossed className={`h-5 w-5 ${isOcupada ? "text-orange-400" : "text-slate-400"}`} />
                  </div>
                  <button
                    onClick={(e) => handleDeleteTable(table.id, e)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Mesa {table.number}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isOcupada ? "bg-orange-500/20 text-orange-400" : "bg-green-500/20 text-green-400"
                  }`}>
                    {isOcupada ? "Ocupada" : "Disponible"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Drawer lateral */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col h-full overflow-hidden">

            {/* Header del drawer */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h2 className="text-white font-bold text-xl">Mesa {selectedTable?.number}</h2>
                <p className="text-slate-400 text-sm">
                  {loading ? "Creando orden..." : `Orden #${activeOrder?.id.slice(0, 8)}`}
                </p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Lista de productos para agregar */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

              {/* Ítems actuales */}
              {activeOrder && activeOrder.items && activeOrder.items.length > 0 && (
                <div>
                  <h3 className="text-slate-400 text-sm font-medium mb-3 uppercase tracking-wide">
                    Pedido actual
                  </h3>
                  <div className="space-y-2">
                    {activeOrder.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{item.product.name}</p>
                          <p className="text-slate-400 text-xs">x{item.quantity} · ${item.unitPrice.toLocaleString()} c/u</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-orange-400 font-bold text-sm">
                            ${(item.quantity * item.unitPrice).toLocaleString()}
                          </p>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700">
                    <span className="text-white font-bold text-lg">Total</span>
                    <span className="text-orange-400 font-bold text-xl">
                      ${activeOrder.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Agregar productos */}
              <div>
                <h3 className="text-slate-400 text-sm font-medium mb-3 uppercase tracking-wide">
                  Agregar productos
                </h3>
                <div className="space-y-2">
                  {products.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-3 cursor-pointer transition-colors"
                      onClick={() => handleAddProduct(product.id)}
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{product.name}</p>
                        <p className="text-slate-400 text-xs">{product.category?.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-300 text-sm">${product.price.toLocaleString()}</span>
                        <div className="bg-orange-500/20 text-orange-400 rounded-full p-1">
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer con cerrar cuenta */}
            <div className="p-4 border-t border-slate-700 space-y-3">

              {!showPayment ? (
                <>
                  <Button
                    onClick={() => setShowPayment(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Cerrar cuenta · ${activeOrder?.total.toLocaleString() ?? 0}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    Seguir agregando
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">
                    Método de pago
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {['Efectivo', 'Datafono', 'Nequi'].map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                          paymentMethod === method
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-orange-500'
                        }`}
                      >
                        {method === 'Efectivo' ? '' : method === 'Datafono' ? '' : ''} {method}
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={handleCloseOrder}
                    disabled={!paymentMethod}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Confirmar · ${activeOrder?.total.toLocaleString() ?? 0}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowPayment(false)}
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Volver
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}