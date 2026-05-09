"use client"

import { useEffect, useState } from "react"
import { Package, Plus, Search, AlertTriangle, Pencil, Trash2, X, Tag } from "lucide-react"
import api from "@/lib/axios"
import { useCurrentUser, authHeaders } from "@/lib/auth"
import TopBar from "@/components/ui/layout/TopBar"

type Category = { id: string; name: string }

type Product = {
  id: string
  name: string
  price: number
  unit: string
  stock: number
  minStock: number
  categoryId: string
  category: { id: string; name: string }
}

type ProductForm = {
  name: string
  price: string
  unit: string
  stock: string
  minStock: string
  categoryId: string
}

const UNITS = ["porciones", "unidades", "kg", "litros", "gramos", "ml"]

const BADGE = {
  ok:    { className: "bg-green-500/[0.13] text-green-400",  label: "OK" },
  low:   { className: "bg-amber-400/[0.13] text-amber-400",  label: "Stock bajo" },
  empty: { className: "bg-red-400/[0.13] text-[#f87171]",    label: "Sin stock" },
}

function Badge({ type }: { type: "ok" | "low" | "empty" }) {
  const b = BADGE[type]
  return (
    <span className={`${b.className} px-2.5 py-0.5 rounded-full text-xs font-semibold`}>
      {b.label}
    </span>
  )
}

const inputCls = "w-full bg-[#0d1117] border border-white/8 rounded-lg px-3 py-[9px] text-[#e6edf3] text-sm font-[inherit] outline-none"

export default function InventoryPage() {
  const [products,   setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search,     setSearch]     = useState("")
  const [catFilter,  setCatFilter]  = useState("Todas")
  const [modal,      setModal]      = useState(false)
  const [delModal,   setDelModal]   = useState(false)
  const [editing,    setEditing]    = useState<Product | null>(null)
  const [delTarget,  setDelTarget]  = useState<Product | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [catModal,   setCatModal]   = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [savingCat,  setSavingCat]  = useState(false)
  const { token, restaurantId } = useCurrentUser()

  const FORM_INIT: ProductForm = {
    name: "", price: "", unit: "unidades", stock: "", minStock: "5", categoryId: "",
  }
  const [form, setForm] = useState<ProductForm>(FORM_INIT)

  useEffect(() => {
    if (!restaurantId || !token) return
    const headers = authHeaders()
    api.get(`/products/${restaurantId}`, { headers }).then(r => setProducts(r.data))
    api.get(`/categories/${restaurantId}`, { headers }).then(r => setCategories(r.data))
  }, [restaurantId, token])

  const headers = authHeaders()

  const lowStock   = products.filter(p => p.stock <= p.minStock && p.stock > 0)
  const emptyStock = products.filter(p => p.stock === 0)
  const alertCount = lowStock.length + emptyStock.length

  const filtered = products.filter(p => {
    const matchCat    = catFilter === "Todas" || p.category?.name === catFilter
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const getStatus = (p: Product): "ok" | "low" | "empty" => {
    if (p.stock === 0)         return "empty"
    if (p.stock <= p.minStock) return "low"
    return "ok"
  }

  const openNew = () => {
    setEditing(null)
    setForm({ ...FORM_INIT, categoryId: categories[0]?.id ?? "" })
    setModal(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name, price: String(p.price), unit: p.unit,
      stock: String(p.stock), minStock: String(p.minStock), categoryId: p.categoryId,
    })
    setModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const body = {
      name: form.name, price: Number(form.price), unit: form.unit,
      stock: Number(form.stock), minStock: Number(form.minStock),
      categoryId: form.categoryId, restaurantId,
    }
    try {
      if (editing) {
        const res = await api.put(`/products/${editing.id}`, body, { headers })
        setProducts(prev => prev.map(p => p.id === editing.id ? res.data : p))
      } else {
        const res = await api.post("/products", body, { headers })
        setProducts(prev => [...prev, res.data])
      }
      setModal(false)
    } catch {
      alert("Error al guardar el producto")
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (p: Product) => { setDelTarget(p); setDelModal(true) }

  const handleDelete = async () => {
    if (!delTarget) return
    try {
      await api.delete(`/products/${delTarget.id}`, { headers })
      setProducts(prev => prev.filter(p => p.id !== delTarget.id))
      setDelModal(false)
      setDelTarget(null)
    } catch {
      alert("Error al eliminar el producto")
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    setSavingCat(true)
    try {
      const res = await api.post("/categories", { name: newCatName.trim(), restaurantId }, { headers })
      setCategories(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCatName("")
      setCatModal(false)
    } catch {
      alert("Error al crear la categoría")
    } finally {
      setSavingCat(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (products.some(p => p.categoryId === id)) {
      alert(`No puedes eliminar "${name}" porque tiene productos asignados.`)
      return
    }
    if (!confirm(`¿Eliminar la categoría "${name}"?`)) return
    try {
      await api.delete(`/categories/${id}`, { headers })
      setCategories(prev => prev.filter(c => c.id !== id))
      if (catFilter === name) setCatFilter("Todas")
    } catch {
      alert("Error al eliminar la categoría")
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar title="Inventario" />

      <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-[18px]">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[21px] font-extrabold text-[#e6edf3]">Inventario</h2>
            <p className="text-sm text-[#8b949e] mt-1">{products.length} productos registrados</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCatModal(true)}
              className="flex items-center gap-2 px-4 py-[9px] rounded-[9px] bg-[#1c2128] text-[#e6edf3] font-bold text-sm border border-white/8 cursor-pointer hover:bg-[#21262d] transition-colors"
            >
              <Tag size={15} /> Categorías
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-[9px] rounded-[9px] bg-orange-500 text-white font-bold text-sm border-none cursor-pointer shadow-[0_0_12px_#f9731640] hover:bg-orange-600 transition-colors"
            >
              <Plus size={15} /> Nuevo producto
            </button>
          </div>
        </div>

        {/* Alerta stock bajo */}
        {alertCount > 0 && (
          <div className="bg-red-400/[0.08] border border-red-400/[0.22] rounded-[10px] px-[18px] py-[13px] flex items-start gap-3">
            <AlertTriangle size={17} className="text-[#f87171] mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-[#f87171] text-sm">
                {alertCount} producto{alertCount > 1 ? "s" : ""} con stock bajo o agotado
              </p>
              <p className="text-xs text-[#8b949e] mt-0.5">
                {[...emptyStock, ...lowStock].map(p => `${p.name} (${p.stock} ${p.unit})`).join(" · ")}
              </p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2.5 items-center flex-wrap">
          <div className="flex items-center gap-2 bg-[#1c2128] border border-white/8 rounded-lg px-3 py-[7px] w-[220px]">
            <Search size={13} className="text-[#8b949e]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="bg-transparent border-none text-[#8b949e] text-[13px] w-full outline-none"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["Todas", ...categories.map(c => c.name)].map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border cursor-pointer transition-all ${
                  catFilter === c
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-[#1c2128] text-[#8b949e] border-white/8 hover:border-orange-500/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-[#1c2128] border border-white/8 rounded-xl overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/8">
                {["Producto","Categoría","Precio","Stock","Unidad","Estado",""].map(h => (
                  <th key={h} className="text-left px-4 py-[11px] text-[11px] font-bold text-[#484f58] uppercase tracking-[0.6px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  className="transition-colors duration-100 hover:bg-white/[0.03]"
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                >
                  <td className="px-4 py-[11px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-[30px] h-[30px] rounded-[7px] bg-[#0d1117] flex items-center justify-center text-orange-500 shrink-0">
                        <Package size={13} />
                      </div>
                      <span className="font-semibold text-[#e6edf3] text-sm">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-[11px] text-[#8b949e] text-[13px]">{p.category?.name ?? "–"}</td>
                  <td className="px-4 py-[11px] font-semibold text-[#e6edf3]">${p.price.toLocaleString()}</td>
                  <td className="px-4 py-[11px]">
                    <span className={`font-extrabold text-[15px] ${
                      p.stock === 0 ? "text-[#f87171]" : p.stock <= p.minStock ? "text-amber-400" : "text-green-400"
                    }`}>
                      {p.stock}
                    </span>
                    <span className="text-[#484f58] text-[11px]"> / {p.minStock} mín</span>
                  </td>
                  <td className="px-4 py-[11px] text-[#8b949e] text-[13px]">{p.unit}</td>
                  <td className="px-4 py-[11px]"><Badge type={getStatus(p)} /></td>
                  <td className="px-4 py-[11px]">
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-[#484f58] hover:text-blue-400 cursor-pointer border-none bg-transparent transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => confirmDelete(p)}
                        className="text-[#484f58] hover:text-[#f87171] cursor-pointer border-none bg-transparent transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#484f58] text-sm">
                    No hay productos que coincidan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal crear / editar producto ─────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-5">
          <div className="scale-in bg-[#161b22] border border-white/8 rounded-[14px] w-full max-w-[520px]">
            <div className="px-[22px] py-[18px] border-b border-white/8 flex items-center justify-between">
              <p className="font-bold text-[17px] text-[#e6edf3]">
                {editing ? "Editar producto" : "Nuevo producto"}
              </p>
              <button onClick={() => setModal(false)} className="text-[#8b949e] cursor-pointer border-none bg-transparent">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-[22px] flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3.5">

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#484f58] mb-1.5 uppercase tracking-[0.5px]">Nombre</label>
                  <input className={inputCls} required value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej. Pollo a la plancha" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#484f58] mb-1.5 uppercase tracking-[0.5px]">Precio</label>
                  <input type="number" min="0" className={inputCls} required value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#484f58] mb-1.5 uppercase tracking-[0.5px]">Stock actual</label>
                  <input type="number" min="0" className={inputCls} required value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#484f58] mb-1.5 uppercase tracking-[0.5px]">Stock mínimo</label>
                  <input type="number" min="0" className={inputCls} required value={form.minStock}
                    onChange={e => setForm({ ...form, minStock: e.target.value })} placeholder="5" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#484f58] mb-1.5 uppercase tracking-[0.5px]">Unidad</label>
                  <select className={inputCls} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#484f58] mb-1.5 uppercase tracking-[0.5px]">Categoría</label>
                  <select className={inputCls} required value={form.categoryId}
                    onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="submit" disabled={saving}
                  className="flex-1 py-[11px] rounded-[9px] bg-orange-500 text-white font-bold text-sm border-none cursor-pointer hover:bg-orange-600 transition-colors disabled:opacity-70 disabled:cursor-wait"
                >
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear producto"}
                </button>
                <button
                  type="button" onClick={() => setModal(false)}
                  className="flex-1 py-[11px] rounded-[9px] bg-transparent border border-white/8 text-[#8b949e] font-semibold text-sm cursor-pointer hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal categorías ──────────────────────────────── */}
      {catModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-5">
          <div className="scale-in bg-[#161b22] border border-white/8 rounded-[14px] w-full max-w-[420px]">
            <div className="px-[22px] py-[18px] border-b border-white/8 flex items-center justify-between">
              <p className="font-bold text-[17px] text-[#e6edf3]">Gestionar categorías</p>
              <button onClick={() => setCatModal(false)} className="text-[#8b949e] cursor-pointer border-none bg-transparent">
                <X size={20} />
              </button>
            </div>

            <div className="p-[22px] flex flex-col gap-4">
              <form onSubmit={handleCreateCategory} className="flex gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Nueva categoría (ej. Postres)"
                  required
                />
                <button
                  type="submit" disabled={savingCat}
                  className="px-4 py-[9px] rounded-lg bg-orange-500 text-white font-bold text-sm border-none cursor-pointer hover:bg-orange-600 transition-colors disabled:opacity-70 disabled:cursor-wait"
                >
                  <Plus size={14} />
                </button>
              </form>

              <div className="bg-[#0d1117] border border-white/8 rounded-[10px] overflow-hidden">
                {categories.length === 0 && (
                  <p className="py-5 text-center text-[#484f58] text-[13px]">No hay categorías creadas</p>
                )}
                {categories.map((c, i) => {
                  const count = products.filter(p => p.categoryId === c.id).length
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-4 py-[11px]"
                      style={{ borderBottom: i < categories.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                    >
                      <div>
                        <span className="text-[#e6edf3] font-semibold text-sm">{c.name}</span>
                        <span className="text-[#484f58] text-xs ml-2">{count} producto{count !== 1 ? "s" : ""}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(c.id, c.name)}
                        className="text-[#484f58] hover:text-[#f87171] bg-transparent border-none cursor-pointer flex transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar producto ─────────────── */}
      {delModal && delTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-5">
          <div className="scale-in bg-[#161b22] border border-white/8 rounded-[14px] w-full max-w-[380px] p-6 text-center">
            <div className="w-11 h-11 rounded-full bg-red-400/[0.13] flex items-center justify-center mx-auto mb-3.5">
              <Trash2 size={20} className="text-[#f87171]" />
            </div>
            <p className="font-bold text-[16px] text-[#e6edf3] mb-2">¿Eliminar producto?</p>
            <p className="text-[#8b949e] text-sm mb-5">
              Vas a eliminar <span className="text-[#e6edf3] font-semibold">"{delTarget.name}"</span>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDelModal(false)}
                className="flex-1 py-2.5 rounded-[9px] bg-transparent border border-white/8 text-[#8b949e] font-semibold text-sm cursor-pointer hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-[9px] bg-red-400/[0.15] border border-red-400/25 text-[#f87171] font-bold text-sm cursor-pointer hover:bg-red-400/25 transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
