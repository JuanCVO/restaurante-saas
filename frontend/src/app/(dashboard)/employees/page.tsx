"use client"

import { useEffect, useState } from "react"
import { Users, Plus, Trash2, X, Loader2, Shield, UserCheck } from "lucide-react"
import api from "@/lib/axios"
import TopBar from "@/components/ui/layout/TopBar"

type Employee = {
  id: string
  name: string
  email: string
  role: "ADMIN" | "EMPLOYEE"
  createdAt: string
}

type FormState = "idle" | "loading" | "error"

export default function EmployeesPage() {
  const [employees, setEmployees]   = useState<Employee[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [formState, setFormState]   = useState<FormState>("idle")
  const [formError, setFormError]   = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [name, setName]         = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")

  const getAuth = () => {
    const token = localStorage.getItem("token") || ""
    const user  = JSON.parse(localStorage.getItem("user") || "{}")
    return { token, restaurantId: user?.restaurantId || "" }
  }

  const fetchEmployees = async () => {
    const { token, restaurantId } = getAuth()
    if (!restaurantId) return
    try {
      const res = await api.get(`/auth/users/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setEmployees(res.data)
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployees() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim()) return

    setFormState("loading")
    setFormError("")

    try {
      const { token } = getAuth()
      await api.post(
        "/auth/employees",
        { name, email, password },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setName("")
      setEmail("")
      setPassword("")
      setShowForm(false)
      setFormState("idle")
      await fetchEmployees()
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Error al crear el empleado")
      setFormState("error")
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm("¿Eliminar este empleado?")) return
    setDeletingId(userId)
    try {
      const { token } = getAuth()
      await api.delete(`/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setEmployees(prev => prev.filter(e => e.id !== userId))
    } catch (err: any) {
      alert(err?.response?.data?.message || "Error al eliminar")
    } finally {
      setDeletingId(null)
    }
  }

  const admins    = employees.filter(e => e.role === "ADMIN")
  const empList   = employees.filter(e => e.role === "EMPLOYEE")

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <TopBar title="Empleados" />

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: "#e6edf3" }}>Gestión de empleados</h2>
            <p style={{ fontSize: 14, color: "#8b949e", marginTop: 4 }}>
              {employees.length} usuario{employees.length !== 1 ? "s" : ""} en el restaurante
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setFormError(""); setFormState("idle") }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 9,
              background: "#f97316", border: "none",
              color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            <Plus size={16} />
            Agregar empleado
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
          {[
            { label: "Administradores", value: admins.length, icon: Shield, color: "#f97316", bg: "rgba(249,115,22,0.13)" },
            { label: "Empleados", value: empList.length, icon: UserCheck, color: "#60a5fa", bg: "rgba(96,165,250,0.13)" },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} style={{
                background: "#1c2128", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "16px 18px",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{ background: s.bg, borderRadius: 10, padding: 10 }}>
                  <Icon size={20} color={s.color} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#e6edf3" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#8b949e" }}>{s.label}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tabla */}
        <div style={{ background: "#1c2128", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#e6edf3", display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} color="#8b949e" />
              Usuarios del restaurante
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Loader2 size={28} color="#f97316" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
            </div>
          ) : employees.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#484f58", fontSize: 14 }}>
              No hay usuarios registrados
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Nombre", "Email", "Rol", "Desde", ""].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "10px 20px",
                      fontSize: 11, fontWeight: 700, color: "#484f58",
                      textTransform: "uppercase", letterSpacing: 0.6,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr key={emp.id} style={{
                    borderBottom: i < employees.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "13px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: emp.role === "ADMIN" ? "rgba(249,115,22,0.2)" : "rgba(96,165,250,0.2)",
                          border: `1px solid ${emp.role === "ADMIN" ? "rgba(249,115,22,0.4)" : "rgba(96,165,250,0.4)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 700,
                          color: emp.role === "ADMIN" ? "#f97316" : "#60a5fa", flexShrink: 0,
                        }}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: "#e6edf3", fontSize: 14 }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 20px", color: "#8b949e", fontSize: 13 }}>{emp.email}</td>
                    <td style={{ padding: "13px 20px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: emp.role === "ADMIN" ? "rgba(249,115,22,0.13)" : "rgba(96,165,250,0.13)",
                        color: emp.role === "ADMIN" ? "#f97316" : "#60a5fa",
                      }}>
                        {emp.role === "ADMIN" ? "Admin" : "Empleado"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 20px", color: "#8b949e", fontSize: 13 }}>
                      {new Date(emp.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td style={{ padding: "13px 20px" }}>
                      {emp.role !== "ADMIN" && (
                        <button
                          onClick={() => handleDelete(emp.id)}
                          disabled={deletingId === emp.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "6px 12px", borderRadius: 7,
                            background: "rgba(248,113,113,0.1)",
                            border: "1px solid rgba(248,113,113,0.2)",
                            color: "#f87171", fontSize: 12, fontWeight: 600,
                            cursor: deletingId === emp.id ? "wait" : "pointer",
                            opacity: deletingId === emp.id ? 0.5 : 1,
                          }}
                        >
                          {deletingId === emp.id
                            ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                            : <Trash2 size={13} />
                          }
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal crear empleado */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{
            background: "#161b22", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, width: "100%", maxWidth: 420, overflow: "hidden",
          }}>
            <div style={{
              padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#e6edf3" }}>Nuevo empleado</div>
              <button onClick={() => setShowForm(false)} style={{ color: "#8b949e", cursor: "pointer", border: "none", background: "none" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Nombre completo", value: name, set: setName, type: "text", placeholder: "Juan García" },
                { label: "Email", value: email, set: setEmail, type: "email", placeholder: "juan@restaurante.com" },
                { label: "Contraseña", value: password, set: setPassword, type: "password", placeholder: "Mínimo 6 caracteres" },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8b949e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    required
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
                      color: "#e6edf3", fontSize: 14, outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              {formError && (
                <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 12px", color: "#f87171", fontSize: 13 }}>
                  {formError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{
                  flex: 1, padding: "11px", borderRadius: 9,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#8b949e", fontWeight: 600, fontSize: 14, cursor: "pointer",
                }}>
                  Cancelar
                </button>
                <button type="submit" disabled={formState === "loading"} style={{
                  flex: 1, padding: "11px", borderRadius: 9,
                  background: formState === "loading" ? "rgba(249,115,22,0.5)" : "#f97316",
                  border: "none", color: "#fff", fontWeight: 700, fontSize: 14,
                  cursor: formState === "loading" ? "wait" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  {formState === "loading" && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
                  {formState === "loading" ? "Creando..." : "Crear empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
