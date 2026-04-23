"use client"

import { useEffect, useState } from "react"
import { Package, Plus, Search, AlertTriangle, Pencil, Trash2, X } from "lucide-react"
import api from "@/lib/axios"
import TopBar from "@/components/ui/layout/TopBar"

// ── Tipos ────────────────────────────────────────────────────
type Category = {
  id: string
  name: string
}

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

const BADGE: Record<string, { bg: string; color: string; label: string }> = {
  ok:    { bg: "rgba(34,197,94,0.13)",   color: "#22c55e", label: "OK" },
  low:   { bg: "rgba(251,191,36,0.13)",  color: "#fbbf24", label: "Stock bajo" },
  empty: { bg: "rgba(248,113,113,0.13)", color: "#f87171", label: "Sin stock" },
}

function Badge({ type }: { type: "ok" | "low" | "empty" }) {
  const b = BADGE[type]
  return (
    <span style={{
      background: b.bg, color: b.color,
      padding: "2px 10px", borderRadius: 99,
      fontSize: 12, fontWeight: 600,
    }}>{b.label}</span>
  )
}

const iSt: React.CSSProperties = {
  background: "#0d1117",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8, padding: "9px 12px",
  color: "#e6edf3", fontSize: 14, width: "100%",
  fontFamily: "inherit", outline: "none",
}

// ── Página ───────────────────────────────────────────────────
export default function InventoryPage() {
  const [products,    setProducts]    = useState<Product[]>([])
  const [categories,  setCategories]  = useState<Category[]>([])
  const [search,      setSearch]      = useState("")
  const [catFilter,   setCatFilter]   = useState("Todas")
  const [modal,       setModal]       = useState(false)
  const [delModal,    setDelModal]    = useState(false)
  const [editing,     setEditing]     = useState<Product | null>(null)
  const [delTarget,   setDelTarget]   = useState<Product | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [restaurantId, setRestaurantId] = useState("")
  const [token,       setToken]       = useState("")

  const FORM_INIT: ProductForm = {
    name: "", price: "", unit: "unidades",
    stock: "", minStock: "5", categoryId: "",
  }
  const [form, setForm] = useState<ProductForm>(FORM_INIT)

  // Leer auth
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    const t    = localStorage.getItem("token") || ""
    if (user.restaurantId) setRestaurantId(user.restaurantId)
    setToken(t)
  }, [])

  // Fetch datos
  useEffect(() => {
    if (!restaurantId || !token) return
    const headers = { Authorization: `Bearer ${token}` }

    api.get(`/products/${restaurantId}`, { headers })
      .then(r => setProducts(r.data))

    api.get(`/categories/${restaurantId}`, { headers })
      .then(r => setCategories(r.data))
  }, [restaurantId, token])

  // ── Helpers ─────────────────────────────────────────────
  const headers = { Authorization: `Bearer ${token}` }

  const lowStock  = products.filter(p => p.stock <= p.minStock && p.stock > 0)
  const emptyStock = products.filter(p => p.stock === 0)
  const alertCount = lowStock.length + emptyStock.length

  const filtered = products.filter(p => {
    const matchCat    = catFilter === "Todas" || p.category?.name === catFilter
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const getStatus = (p: Product): "ok" | "low" | "empty" => {
    if (p.stock === 0)            return "empty"
    if (p.stock <= p.minStock)    return "low"
    return "ok"
  }

  // ── Modal handlers ───────────────────────────────────────
  const openNew = () => {
    setEditing(null)
    setForm({ ...FORM_INIT, categoryId: categories[0]?.id ?? "" })
    setModal(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name:       p.name,
      price:      String(p.price),
      unit:       p.unit,
      stock:      String(p.stock),
      minStock:   String(p.minStock),
      categoryId: p.categoryId,
    })
    setModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const body = {
      name:        form.name,
      price:       Number(form.price),
      unit:        form.unit,
      stock:       Number(form.stock),
      minStock:    Number(form.minStock),
      categoryId:  form.categoryId,
      restaurantId,
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

  const confirmDelete = (p: Product) => {
    setDelTarget(p)
    setDelModal(true)
  }

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

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <TopBar title="Inventario" />

      <div style={{
        flex: 1, overflowY: "auto", padding: "24px 28px",
        display: "flex", flexDirection: "column", gap: 18,
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <div>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: "#e6edf3" }}>Inventario</h2>
            <p style={{ fontSize: 14, color: "#8b949e", marginTop: 4 }}>
              {products.length} productos registrados
            </p>
          </div>
          <button onClick={openNew} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 16px", borderRadius: 9,
            background: "#f97316", color: "#fff",
            fontWeight: 700, fontSize: 14,
            border: "none", cursor: "pointer",
            boxShadow: "0 0 12px #f9731640",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "#ea6c0a")}
            onMouseLeave={e => (e.currentTarget.style.background = "#f97316")}
          >
            <Plus size={15} /> Nuevo producto
          </button>
        </div>

        {/* Alerta stock bajo */}
        {alertCount > 0 && (
          <div style={{
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.22)",
            borderRadius: 10, padding: "13px 18px",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <AlertTriangle size={17} color="#f87171" style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: "#f87171", fontSize: 14 }}>
                {alertCount} producto{alertCount > 1 ? "s" : ""} con stock bajo o agotado
              </div>
              <div style={{ fontSize: 12, color: "#8b949e", marginTop: 3 }}>
                {[...emptyStock, ...lowStock]
                  .map(p => `${p.name} (${p.stock} ${p.unit})`)
                  .join(" · ")}
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#1c2128", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8, padding: "7px 12px", width: 220,
          }}>
            <Search size={13} color="#8b949e" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              style={{ background: "none", border: "none", color: "#8b949e", fontSize: 13, width: "100%", outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["Todas", ...categories.map(c => c.name)].map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={{
                padding: "6px 13px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: catFilter === c ? "#f97316" : "#1c2128",
                color:      catFilter === c ? "#fff"    : "#8b949e",
                border: `1px solid ${catFilter === c ? "#f97316" : "rgba(255,255,255,0.08)"}`,
                cursor: "pointer", transition: "all 0.15s",
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div style={{
          background: "#1c2128",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, overflowY: "auto",
          
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Producto", "Categoría", "Precio", "Stock", "Unidad", "Estado", ""].map(h => (
                  <th key={h} style={{
                    textAlign: "left", padding: "11px 16px",
                    fontSize: 11, fontWeight: 700,
                    color: "#484f58", textTransform: "uppercase", letterSpacing: 0.6,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}
                  style={{
                    borderBottom: i < filtered.length - 1
                      ? "1px solid rgba(255,255,255,0.05)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 7,
                        background: "#0d1117", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        color: "#f97316", flexShrink: 0,
                      }}>
                        <Package size={13} />
                      </div>
                      <span style={{ fontWeight: 600, color: "#e6edf3", fontSize: 14 }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 16px", color: "#8b949e", fontSize: 13 }}>
                    {p.category?.name ?? "–"}
                  </td>
                  <td style={{ padding: "11px 16px", fontWeight: 600, color: "#e6edf3" }}>
                    ${p.price.toLocaleString()}
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{
                      fontWeight: 800, fontSize: 15,
                      color: p.stock === 0 ? "#f87171" : p.stock <= p.minStock ? "#fbbf24" : "#22c55e",
                    }}>
                      {p.stock}
                    </span>
                    <span style={{ color: "#484f58", fontSize: 11 }}> / {p.minStock} mín</span>
                  </td>
                  <td style={{ padding: "11px 16px", color: "#8b949e", fontSize: 13 }}>{p.unit}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <Badge type={getStatus(p)} />
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => openEdit(p)}
                        style={{ color: "#484f58", cursor: "pointer", border: "none", background: "none", transition: "color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#60a5fa")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#484f58")}
                      >
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => confirmDelete(p)}
                        style={{ color: "#484f58", cursor: "pointer", border: "none", background: "none", transition: "color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#484f58")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#484f58", fontSize: 14 }}>
                    No hay productos que coincidan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal crear / editar ──────────────────────────── */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50, padding: 20,
        }}>
          <div className="scale-in" style={{
            background: "#161b22",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, width: "100%", maxWidth: 520,
          }}>
            {/* Header */}
            <div style={{
              padding: "18px 22px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#e6edf3" }}>
                {editing ? "Editar producto" : "Nuevo producto"}
              </div>
              <button onClick={() => setModal(false)}
                style={{ color: "#8b949e", cursor: "pointer", border: "none", background: "none" }}>
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

                {/* Nombre */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#484f58", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Nombre
                  </label>
                  <input
                    style={iSt} required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej. Pollo a la plancha"
                  />
                </div>

                {/* Precio */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#484f58", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Precio
                  </label>
                  <input
                    type="number" min="0" style={iSt} required
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder="0"
                  />
                </div>

                {/* Stock */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#484f58", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Stock actual
                  </label>
                  <input
                    type="number" min="0" style={iSt} required
                    value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })}
                    placeholder="0"
                  />
                </div>

                {/* Stock mínimo */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#484f58", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Stock mínimo
                  </label>
                  <input
                    type="number" min="0" style={iSt} required
                    value={form.minStock}
                    onChange={e => setForm({ ...form, minStock: e.target.value })}
                    placeholder="5"
                  />
                </div>

                {/* Unidad */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#484f58", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Unidad
                  </label>
                  <select style={iSt} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                {/* Categoría */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#484f58", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Categoría
                  </label>
                  <select
                    style={iSt} required
                    value={form.categoryId}
                    onChange={e => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button type="submit" disabled={saving} style={{
                  flex: 1, padding: "11px", borderRadius: 9,
                  background: "#f97316", color: "#fff",
                  fontWeight: 700, fontSize: 14, border: "none",
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.7 : 1, transition: "all 0.15s",
                }}>
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear producto"}
                </button>
                <button type="button" onClick={() => setModal(false)} style={{
                  flex: 1, padding: "11px", borderRadius: 9,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#8b949e", fontWeight: 600, fontSize: 14,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar ──────────────────────── */}
      {delModal && delTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50, padding: 20,
        }}>
          <div className="scale-in" style={{
            background: "#161b22",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, width: "100%", maxWidth: 380, padding: 24,
            textAlign: "center",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(248,113,113,0.13)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
            }}>
              <Trash2 size={20} color="#f87171" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#e6edf3", marginBottom: 8 }}>
              ¿Eliminar producto?
            </div>
            <p style={{ color: "#8b949e", fontSize: 14, marginBottom: 20 }}>
              Vas a eliminar <span style={{ color: "#e6edf3", fontWeight: 600 }}>"{delTarget.name}"</span>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDelModal(false)} style={{
                flex: 1, padding: "10px", borderRadius: 9,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#8b949e", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}>
                Cancelar
              </button>
              <button onClick={handleDelete} style={{
                flex: 1, padding: "10px", borderRadius: 9,
                background: "rgba(248,113,113,0.15)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: "#f87171", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}