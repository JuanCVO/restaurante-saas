"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UtensilsCrossed, Plus, Trash2, X, ShoppingBag, CheckCircle, Minus, Search } from "lucide-react"
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
  tip: number        
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

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [tipAmount, setTipAmount] = useState<number>(0)
  const [tableSearch, setTableSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")

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
      
      const res = await api.post("/orders", { tableId: table.id, restaurantId }, { headers })
      setActiveOrder(res.data)
      
    } else {
      await fetchActiveOrder(table.id)
    }

    setLoading(false)
    setDrawerOpen(true)
  }

  
  const handleAddProduct = async (productId: string, quantity: number) => {
    if (!activeOrder) return
    try {
      await api.post(`/orders/${activeOrder.id}/items`, { productId, quantity }, { headers })

      
      if (selectedTable?.status === "DISPONIBLE") {
        await api.patch(`/tables/${selectedTable.id}/status`, { status: "OCUPADA" }, { headers })
       
        setSelectedTable(prev => prev ? { ...prev, status: "OCUPADA" } : prev)
      }

      const res = await api.get(`/orders/${activeOrder.id}`, { headers })
      setActiveOrder(res.data)
      setQuantities(q => ({ ...q, [productId]: 1 }))
      await fetchTables()
    } catch (error: any) {
      alert(error?.response?.data?.message || "Error al agregar producto")
    }
  }

  
  const handleCloseOrder = async () => {
  if (!activeOrder) return
  await api.patch(`/orders/${activeOrder.id}/close`, {
    paymentMethod,
    tip: tipAmount,   
  }, { headers })
  setDrawerOpen(false)
  setActiveOrder(null)
  setSelectedTable(null)
  setShowPayment(false)
  setPaymentMethod("")
  setTipAmount(0)   
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

  // ── Helpers para cantidad ──
  const getQty = (productId: string) => quantities[productId] ?? 1
  const changeQty = (productId: string, delta: number) => {
    setQuantities(q => ({ ...q, [productId]: Math.max(1, (q[productId] ?? 1) + delta) }))
  }

  const subtotal = activeOrder?.total ?? 0
  const totalConPropina = subtotal + tipAmount

  const filteredTables = tables.filter(t =>
    t.number.toString().includes(tableSearch.trim())
  )
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase().trim()) ||
    p.category?.name.toLowerCase().includes(productSearch.toLowerCase().trim())
  )

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

      {/* Buscador de mesas */}
      <div style={{ position: "relative", maxWidth: 240 }}>
        <Search style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#8b949e" }} />
        <input
          type="text"
          value={tableSearch}
          onChange={e => setTableSearch(e.target.value)}
          placeholder="Buscar mesa..."
          style={{
            width: "100%", background: "#1c2128", color: "#e6edf3",
            borderRadius: 8, paddingLeft: 34, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
            fontSize: 13, border: "1px solid rgba(255,255,255,0.08)",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Grid de mesas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTables.map(table => {
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />

          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col h-full overflow-hidden">

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

            <div className="flex-1 overflow-y-auto p-4" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Pedido actual */}
              {activeOrder && activeOrder.items && activeOrder.items.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "#484f58", textTransform: "uppercase", marginBottom: 10 }}>
                    Pedido actual
                  </p>
                  <div style={{ background: "#1c2128", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                    {activeOrder.items.map((item, i) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "11px 16px",
                          borderBottom: i < activeOrder.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <p style={{ color: "#e6edf3", fontSize: 13, fontWeight: 600 }}>{item.product.name}</p>
                          <p style={{ color: "#8b949e", fontSize: 11, marginTop: 2 }}>
                            x{item.quantity} · ${item.unitPrice.toLocaleString()} c/u
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ color: "#f97316", fontWeight: 700, fontSize: 14 }}>
                            ${(item.quantity * item.unitPrice).toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            style={{ color: "#484f58", background: "none", border: "none", cursor: "pointer", display: "flex" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#484f58")}
                          >
                            <Trash2 style={{ width: 15, height: 15 }} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ color: "#8b949e", fontWeight: 600, fontSize: 13 }}>Total orden</span>
                      <span style={{ color: "#f97316", fontWeight: 800, fontSize: 16 }}>${activeOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Agregar productos */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "#484f58", textTransform: "uppercase", marginBottom: 10 }}>
                  Agregar productos
                </p>

                {/* Buscador */}
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <Search style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#8b949e" }} />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Buscar por nombre o categoría..."
                    style={{
                      width: "100%", background: "#161b22", color: "#e6edf3",
                      borderRadius: 8, paddingLeft: 34, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                      fontSize: 13, border: "1px solid rgba(255,255,255,0.08)",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Grid de productos */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      style={{
                        background: "#161b22",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 10, padding: 12,
                        display: "flex", flexDirection: "column", gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: "#8b949e", textTransform: "uppercase" }}>
                        {product.category?.name ?? "—"}
                      </span>
                      <p style={{ color: "#e6edf3", fontWeight: 600, fontSize: 13, lineHeight: 1.3, flex: 1, margin: 0 }}>
                        {product.name}
                      </p>
                      <p style={{ color: "#f97316", fontWeight: 700, fontSize: 15, margin: 0 }}>
                        ${product.price.toLocaleString()}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <button
                          onClick={() => changeQty(product.id, -1)}
                          style={{
                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                            color: "#e6edf3", borderRadius: 6, width: 26, height: 26,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", flexShrink: 0,
                          }}
                        >
                          <Minus style={{ width: 11, height: 11 }} />
                        </button>
                        <span style={{ color: "#e6edf3", fontWeight: 700, fontSize: 13, width: 20, textAlign: "center" }}>
                          {getQty(product.id)}
                        </span>
                        <button
                          onClick={() => changeQty(product.id, 1)}
                          style={{
                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                            color: "#e6edf3", borderRadius: 6, width: 26, height: 26,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", flexShrink: 0,
                          }}
                        >
                          <Plus style={{ width: 11, height: 11 }} />
                        </button>
                        <button
                          onClick={() => handleAddProduct(product.id, getQty(product.id))}
                          style={{
                            flex: 1, background: "rgba(249,115,22,0.15)",
                            border: "1px solid rgba(249,115,22,0.3)",
                            color: "#f97316", borderRadius: 6, padding: "5px 0",
                            fontSize: 11, fontWeight: 700, cursor: "pointer",
                          }}
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredProducts.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "24px 0", color: "#484f58", fontSize: 13 }}>
                      Sin resultados
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
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
                  {/* Método de pago */}
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
                        {method}
                      </button>
                    ))}
                  </div>

                  {/* Propina */}
                  <div className="bg-slate-800 rounded-xl p-4 space-y-3">
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">Propina</p>

                    {/* Botones rápidos de montos comunes */}
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 2000, 5000, 10000].map(amount => (
                        <button
                          key={amount}
                          onClick={() => setTipAmount(amount)}
                          className={`py-2 rounded-lg text-sm font-bold transition-all border ${
                            tipAmount === amount
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-orange-400'
                          }`}
                        >
                          {amount === 0 ? 'Sin propina' : `$${amount.toLocaleString()}`}
                        </button>
                      ))}
                    </div>

                    {/* Input para monto personalizado */}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        min={0}
                        value={tipAmount === 0 ? '' : tipAmount}
                        onChange={e => setTipAmount(Math.max(0, Number(e.target.value)))}
                        placeholder="Monto personalizado"
                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-orange-500 outline-none placeholder:text-slate-500"
                      />
                    </div>

                    {/* Desglose */}
                    <div className="space-y-1 pt-1 border-t border-slate-700">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Subtotal</span>
                        <span className="text-white">${subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Propina</span>
                        <span className="text-green-400">+${tipAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-white">Total</span>
                        <span className="text-orange-400 text-lg">${totalConPropina.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleCloseOrder}
                    disabled={!paymentMethod}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Confirmar · ${totalConPropina.toLocaleString()}
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