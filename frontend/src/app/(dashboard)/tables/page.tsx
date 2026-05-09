"use client"

import { useEffect, useState } from "react"
import { UtensilsCrossed, Plus, Trash2, X, ShoppingBag, CheckCircle, Minus, Search } from "lucide-react"
import api from "@/lib/axios"
import { useCurrentUser, authHeaders } from "@/lib/auth"
import type { Table, Order, OrderItem } from "@/types/api"

type Product = {
  id: string
  name: string
  price: number
  unit: string
  category: { name: string }
}

type ConfirmModal = {
  title: string
  message: string
  onConfirm: () => void
}

export default function TablesPage() {
  const [tables,        setTables]        = useState<Table[]>([])
  const [products,      setProducts]      = useState<Product[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [activeOrder,   setActiveOrder]   = useState<Order | null>(null)
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [showPayment,   setShowPayment]   = useState(false)
  const [confirmModal,  setConfirmModal]  = useState<ConfirmModal | null>(null)
  const [quantities,    setQuantities]    = useState<Record<string, number>>({})
  const [tipAmount,     setTipAmount]     = useState(0)
  const [tableSearch,   setTableSearch]   = useState("")
  const [productSearch, setProductSearch] = useState("")

  const { token, restaurantId } = useCurrentUser()

  useEffect(() => {
    if (!restaurantId || !token) return
    fetchTables()
    fetchProducts()
  }, [restaurantId, token])

  const fetchTables = async () => {
    const res = await api.get(`/tables/${restaurantId}`, { headers: authHeaders() })
    setTables(res.data)
  }

  const fetchProducts = async () => {
    const res = await api.get(`/products/${restaurantId}`, { headers: authHeaders() })
    setProducts(res.data)
  }

  const handleTableClick = async (table: Table) => {
    setSelectedTable(table)
    setLoading(true)
    const existingRes = await api.get(`/orders/table/${table.id}`, { headers: authHeaders() })
    const existingOrder = existingRes.data
    if (existingOrder) {
      setActiveOrder(existingOrder)
    } else {
      const res = await api.post("/orders", { tableId: table.id, restaurantId }, { headers: authHeaders() })
      setActiveOrder(res.data)
    }
    setLoading(false)
    setDrawerOpen(true)
  }

  const handleAddProduct = async (productId: string, quantity: number) => {
    if (!activeOrder) return

    const product = products.find(p => p.id === productId)
    if (!product) return

    const prevOrder = activeOrder
    const existingItem = activeOrder.items?.find((i: OrderItem) => i.product.id === productId)

    const optimisticItems = existingItem
      ? activeOrder.items.map((i: OrderItem) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + quantity } : i
        )
      : [
          ...(activeOrder.items ?? []),
          {
            id: `temp-${productId}`,
            orderId: activeOrder.id,
            productId,
            quantity,
            unitPrice: product.price,
            product,
          } as OrderItem,
        ]

    const optimisticTotal = optimisticItems.reduce(
      (sum: number, i: OrderItem) => sum + i.unitPrice * i.quantity, 0
    )

    setActiveOrder({ ...activeOrder, items: optimisticItems, total: optimisticTotal })
    setQuantities(q => ({ ...q, [productId]: 1 }))
    setTables(prev => prev.map(t => t.id === selectedTable?.id ? { ...t, status: "OCUPADA" } : t))
    setSelectedTable(prev => prev ? { ...prev, status: "OCUPADA" } : prev)

    try {
      const { data: savedItem } = await api.post(
        `/orders/${activeOrder.id}/items`,
        { productId, quantity },
        { headers: authHeaders() }
      )
      setActiveOrder(prev => {
        if (!prev) return prev
        const items = prev.items.map((i: OrderItem) =>
          i.id === `temp-${productId}` ? { ...savedItem, product } : i
        )
        const total = items.reduce((sum: number, i: OrderItem) => sum + i.unitPrice * i.quantity, 0)
        return { ...prev, items, total }
      })
    } catch (error: any) {
      setActiveOrder(prevOrder)
      alert(error?.response?.data?.message || "Error al agregar producto")
    }
  }

  const handleCloseOrder = async () => {
    if (!activeOrder) return
    await api.patch(`/orders/${activeOrder.id}/close`, { paymentMethod, tip: tipAmount }, { headers: authHeaders() })
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
    await api.post("/tables", { number: nextNumber, restaurantId }, { headers: authHeaders() })
    fetchTables()
  }

  const handleDeleteTable = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const table = tables.find(t => t.id === id)
    setConfirmModal({
      title: "Eliminar mesa",
      message: `¿Estás seguro de que quieres eliminar la Mesa ${table?.number ?? ""}? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        await api.delete(`/tables/${id}`, { headers: authHeaders() })
        setTables(prev => prev.filter(t => t.id !== id))
        setConfirmModal(null)
      },
    })
  }

  const handleRemoveItem = async (itemId: string) => {
    await api.delete(`/orders/items/${itemId}`, { headers: authHeaders() })
    const res = await api.get(`/orders/${activeOrder!.id}`, { headers: authHeaders() })
    setActiveOrder(res.data)
  }

  const handleDrawerClose = () => {
    if (activeOrder?.items?.length) {
      setConfirmModal({
        title: "¿Cerrar sin guardar?",
        message: "La mesa tiene productos añadidos. ¿Deseas cerrar el panel? La orden quedará abierta y podrás retomar desde la mesa.",
        onConfirm: () => {
          setDrawerOpen(false)
          setActiveOrder(null)
          setSelectedTable(null)
          setShowPayment(false)
          setConfirmModal(null)
        },
      })
    } else {
      setDrawerOpen(false)
    }
  }

  const getQty = (productId: string) => quantities[productId] ?? 1
  const changeQty = (productId: string, delta: number) =>
    setQuantities(q => ({ ...q, [productId]: Math.max(1, (q[productId] ?? 1) + delta) }))

  const subtotal       = activeOrder?.total ?? 0
  const totalConPropina = subtotal + tipAmount

  const filteredTables   = tables.filter(t => t.number.toString().includes(tableSearch.trim()))
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase().trim()) ||
    p.category?.name.toLowerCase().includes(productSearch.toLowerCase().trim())
  )

  const disponibles = tables.filter(t => t.status === "DISPONIBLE").length
  const ocupadas    = tables.filter(t => t.status === "OCUPADA").length

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[21px] font-extrabold text-[#e6edf3]">Mesas</h1>
            <p className="text-sm text-[#8b949e] mt-1">{disponibles} disponibles · {ocupadas} ocupadas</p>
          </div>
          <button
            onClick={handleAddTable}
            className="flex items-center gap-2 px-4 py-[9px] rounded-[9px] bg-orange-500 text-white font-bold text-sm border-none cursor-pointer shadow-[0_0_12px_#f9731640] hover:bg-orange-600 transition-colors"
          >
            <Plus size={15} /> Nueva mesa
          </button>
        </div>

        {/* Buscador de mesas */}
        <div className="relative max-w-[240px]">
          <Search className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[#8b949e]" size={14} />
          <input
            type="text"
            value={tableSearch}
            onChange={e => setTableSearch(e.target.value)}
            placeholder="Buscar mesa..."
            aria-label="Buscar mesa por número"
            className="w-full bg-[#1c2128] text-[#e6edf3] rounded-lg pl-[34px] pr-3.5 py-2 text-[13px] border border-white/8 outline-none"
          />
        </div>

        {/* Grid de mesas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredTables.map(table => {
            const isOcupada = table.status === "OCUPADA"
            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`rounded-xl border-2 cursor-pointer transition-all hover:scale-105 p-4 flex flex-col gap-3 ${
                  isOcupada
                    ? "bg-orange-500/10 border-orange-500"
                    : "bg-[#1c2128] border-[#30363d] hover:border-green-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${isOcupada ? "bg-orange-500/20" : "bg-[#21262d]"}`}>
                    <UtensilsCrossed className={`h-5 w-5 ${isOcupada ? "text-orange-400" : "text-[#8b949e]"}`} />
                  </div>
                  <button
                    onClick={e => handleDeleteTable(table.id, e)}
                    aria-label={`Eliminar mesa ${table.number}`}
                    className="text-[#484f58] hover:text-[#f87171] transition-colors bg-transparent border-none cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div>
                  <p className="text-[#e6edf3] font-bold text-lg">Mesa {table.number}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isOcupada ? "bg-orange-500/20 text-orange-400" : "bg-green-500/20 text-green-400"
                  }`}>
                    {isOcupada ? "Ocupada" : "Disponible"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Drawer lateral */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={handleDrawerClose} aria-hidden="true" />

          <div className="relative w-full max-w-md bg-[#0d1117] border-l border-white/8 flex flex-col h-full overflow-hidden">

            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <div>
                <h2 className="text-[#e6edf3] font-bold text-xl">Mesa {selectedTable?.number}</h2>
                <p className="text-[#8b949e] text-sm mt-0.5">
                  {loading ? "Cargando orden..." : `Orden #${activeOrder?.id.slice(0, 8) ?? "—"}`}
                </p>
              </div>
              <button onClick={handleDrawerClose} aria-label="Cerrar panel de mesa" className="text-[#8b949e] hover:text-[#e6edf3] bg-transparent border-none cursor-pointer transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

              {/* Pedido actual */}
              {activeOrder?.items?.length ? (
                <div>
                  <p className="text-[11px] font-bold tracking-[0.8px] text-[#484f58] uppercase mb-2.5">
                    Pedido actual
                  </p>
                  <div className="bg-[#1c2128] border border-white/8 rounded-xl overflow-hidden">
                    {activeOrder.items.map((item: OrderItem, i: number) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-[11px]"
                        style={{ borderBottom: i < activeOrder.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                      >
                        <div className="flex-1">
                          <p className="text-[#e6edf3] text-[13px] font-semibold">{item.product.name}</p>
                          <p className="text-[#8b949e] text-[11px] mt-0.5">
                            x{item.quantity} · ${item.unitPrice.toLocaleString()} c/u
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-orange-500 font-bold text-sm">
                            ${(item.quantity * item.unitPrice).toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            aria-label={`Eliminar ${item.product.name} de la orden`}
                            className="text-[#484f58] hover:text-[#f87171] bg-transparent border-none cursor-pointer flex transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center px-4 py-3 border-t border-white/8">
                      <span className="text-[#8b949e] font-semibold text-[13px]">Total orden</span>
                      <span className="text-orange-500 font-extrabold text-base">${activeOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Agregar productos */}
              <div className="flex-1">
                <p className="text-[11px] font-bold tracking-[0.8px] text-[#484f58] uppercase mb-2.5">
                  Agregar productos
                </p>

                <div className="relative mb-3">
                  <Search className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[#8b949e]" size={14} />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Buscar por nombre o categoría..."
                    aria-label="Buscar producto"
                    className="w-full bg-[#161b22] text-[#e6edf3] rounded-lg pl-[34px] pr-3.5 py-[9px] text-[13px] border border-white/8 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className="bg-[#161b22] border border-white/[0.07] rounded-[10px] p-3 flex flex-col gap-1.5"
                    >
                      <span className="text-[10px] font-bold tracking-[0.4px] text-[#8b949e] uppercase">
                        {product.category?.name ?? "—"}
                      </span>
                      <p className="text-[#e6edf3] font-semibold text-[13px] leading-snug flex-1">
                        {product.name}
                      </p>
                      <p className="text-orange-500 font-bold text-[15px]">
                        ${product.price.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <button
                          onClick={() => changeQty(product.id, -1)}
                          aria-label={`Reducir cantidad de ${product.name}`}
                          className="w-[26px] h-[26px] flex items-center justify-center bg-white/[0.06] border border-white/8 text-[#e6edf3] rounded-[6px] cursor-pointer shrink-0 hover:bg-white/10 transition-colors"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-[#e6edf3] font-bold text-[13px] w-5 text-center">
                          {getQty(product.id)}
                        </span>
                        <button
                          onClick={() => changeQty(product.id, 1)}
                          aria-label={`Aumentar cantidad de ${product.name}`}
                          className="w-[26px] h-[26px] flex items-center justify-center bg-white/[0.06] border border-white/8 text-[#e6edf3] rounded-[6px] cursor-pointer shrink-0 hover:bg-white/10 transition-colors"
                        >
                          <Plus size={11} />
                        </button>
                        <button
                          onClick={() => handleAddProduct(product.id, getQty(product.id))}
                          aria-label={`Agregar ${product.name} a la orden`}
                          className="flex-1 bg-orange-500/15 border border-orange-500/30 text-orange-500 rounded-[6px] py-[5px] text-[11px] font-bold cursor-pointer hover:bg-orange-500/25 transition-colors"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredProducts.length === 0 && (
                    <div className="col-span-2 text-center py-6 text-[#484f58] text-[13px]">
                      Sin resultados
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="p-4 border-t border-white/8 flex flex-col gap-3">
              {!showPayment ? (
                <>
                  <button
                    onClick={() => setShowPayment(true)}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl border-none cursor-pointer transition-colors text-sm"
                  >
                    <CheckCircle size={20} />
                    Cerrar cuenta · ${activeOrder?.total.toLocaleString() ?? 0}
                  </button>
                  <button
                    onClick={handleDrawerClose}
                    className="w-full flex items-center justify-center gap-2 bg-transparent border border-white/8 text-[#8b949e] hover:bg-white/5 font-semibold py-3 rounded-xl cursor-pointer transition-colors text-sm"
                  >
                    <ShoppingBag size={20} />
                    Seguir agregando
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[#8b949e] text-sm font-medium uppercase tracking-wide">Método de pago</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["Efectivo", "Datafono", "Nequi"].map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        aria-pressed={paymentMethod === method}
                        className={`py-3 rounded-xl text-sm font-bold transition-all border-2 cursor-pointer ${
                          paymentMethod === method
                            ? "bg-orange-500 border-orange-500 text-white"
                            : "bg-[#1c2128] border-white/8 text-[#8b949e] hover:border-orange-500"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#1c2128] rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-[#8b949e] text-sm font-medium uppercase tracking-wide">Propina</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 2000, 5000, 10000].map(amount => (
                        <button
                          key={amount}
                          onClick={() => setTipAmount(amount)}
                          aria-pressed={tipAmount === amount}
                          className={`py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            tipAmount === amount
                              ? "bg-orange-500 border-orange-500 text-white"
                              : "bg-[#161b22] border-white/8 text-[#8b949e] hover:border-orange-400"
                          }`}
                        >
                          {amount === 0 ? "Sin propina" : `$${amount.toLocaleString()}`}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#8b949e] text-sm">$</span>
                      <input
                        type="number"
                        min={0}
                        value={tipAmount === 0 ? "" : tipAmount}
                        onChange={e => setTipAmount(Math.max(0, Number(e.target.value)))}
                        placeholder="Monto personalizado"
                        aria-label="Monto de propina personalizado"
                        className="w-full bg-[#161b22] text-[#e6edf3] rounded-lg px-3 py-2 text-sm border border-white/8 focus:border-orange-500 outline-none placeholder:text-[#484f58]"
                      />
                    </div>
                    <div className="flex flex-col gap-1 pt-1 border-t border-white/8">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8b949e]">Subtotal</span>
                        <span className="text-[#e6edf3]">${subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8b949e]">Propina</span>
                        <span className="text-green-400">+${tipAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-[#e6edf3]">Total</span>
                        <span className="text-orange-400 text-lg">${totalConPropina.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCloseOrder}
                    disabled={!paymentMethod}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl border-none cursor-pointer transition-colors text-sm disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={20} />
                    Confirmar · ${totalConPropina.toLocaleString()}
                  </button>
                  <button
                    onClick={() => setShowPayment(false)}
                    className="w-full bg-transparent border border-white/8 text-[#8b949e] hover:bg-white/5 font-semibold py-3 rounded-xl cursor-pointer transition-colors text-sm"
                  >
                    Volver
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-5">
          <div className="scale-in bg-[#161b22] border border-white/8 rounded-[14px] w-full max-w-[400px] p-6">
            <h3 className="font-bold text-[16px] text-[#e6edf3] mb-2.5">{confirmModal.title}</h3>
            <p className="text-[#8b949e] text-sm leading-relaxed mb-5">{confirmModal.message}</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-[9px] bg-transparent border border-white/8 text-[#8b949e] font-semibold text-sm cursor-pointer hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-2.5 rounded-[9px] bg-red-400/15 border border-red-400/25 text-[#f87171] font-bold text-sm cursor-pointer hover:bg-red-400/25 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
