"use client"

import { useEffect, useState } from "react"
import { Users, Plus, Trash2, X, Loader2, Shield, UserCheck } from "lucide-react"
import api from "@/lib/axios"
import { useCurrentUser, authHeaders } from "@/lib/auth"
import TopBar from "@/components/ui/layout/TopBar"

import type { Employee } from "@/types/api"

type FormState = "idle" | "loading" | "error"

type ConfirmModal = {
  employeeId: string
  employeeName: string
}

export default function EmployeesPage() {
  const [employees, setEmployees]     = useState<Employee[]>([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [formState, setFormState]     = useState<FormState>("idle")
  const [formError, setFormError]     = useState("")
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)

  const [name, setName]         = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")

  const { restaurantId } = useCurrentUser()

  const fetchEmployees = async () => {
    if (!restaurantId) return
    try {
      const res = await api.get(`/auth/users/${restaurantId}`, { headers: authHeaders() })
      setEmployees(res.data)
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployees() }, [restaurantId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim()) return

    setFormState("loading")
    setFormError("")

    try {
      await api.post(
        "/auth/employees",
        { name, email, password },
        { headers: authHeaders() }
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

  const handleDeleteRequest = (emp: Employee) => {
    setConfirmModal({ employeeId: emp.id, employeeName: emp.name })
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmModal) return
    const { employeeId } = confirmModal
    setConfirmModal(null)
    setDeletingId(employeeId)
    try {
      await api.delete(`/auth/users/${employeeId}`, { headers: authHeaders() })
      setEmployees(prev => prev.filter(e => e.id !== employeeId))
    } catch (err: any) {
      alert(err?.response?.data?.message || "Error al eliminar")
    } finally {
      setDeletingId(null)
    }
  }

  const admins  = employees.filter(e => e.role === "ADMIN")
  const empList = employees.filter(e => e.role === "EMPLOYEE")

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar title="Empleados" />

      <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[21px] font-extrabold text-[#e6edf3]">Gestión de empleados</h2>
            <p className="text-sm text-[#8b949e] mt-1">
              {employees.length} usuario{employees.length !== 1 ? "s" : ""} en el restaurante
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setFormError(""); setFormState("idle") }}
            className="flex items-center gap-2 px-[18px] py-[10px] rounded-[9px] bg-orange-500 text-white font-bold text-sm cursor-pointer hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} />
            Agregar empleado
          </button>
        </div>

        {/* Stats */}
        <div className="grid gap-[14px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {[
            { label: "Administradores", value: admins.length,  icon: Shield,    color: "text-orange-400", bg: "bg-orange-500/10" },
            { label: "Empleados",       value: empList.length, icon: UserCheck, color: "text-blue-400",   bg: "bg-blue-500/10"   },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-[#1c2128] border border-white/[0.08] rounded-xl px-[18px] py-4 flex items-center gap-[14px]">
                <div className={`${s.bg} rounded-[10px] p-[10px]`}>
                  <Icon size={20} className={s.color} />
                </div>
                <div>
                  <div className="text-[22px] font-extrabold text-[#e6edf3]">{s.value}</div>
                  <div className="text-xs text-[#8b949e]">{s.label}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tabla */}
        <div className="bg-[#1c2128] border border-white/[0.08] rounded-xl overflow-hidden">
          <div className="px-5 py-[14px] border-b border-white/[0.08]">
            <div className="font-bold text-[15px] text-[#e6edf3] flex items-center gap-2">
              <Users size={16} className="text-[#8b949e]" />
              Usuarios del restaurante
            </div>
          </div>

          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 size={28} className="animate-spin text-orange-500" />
            </div>
          ) : employees.length === 0 ? (
            <div className="p-10 text-center text-[#484f58] text-sm">
              No hay usuarios registrados
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {["Nombre", "Email", "Rol", "Desde", ""].map(h => (
                    <th key={h} className="text-left px-5 py-[10px] text-[11px] font-bold text-[#484f58] uppercase tracking-[0.6px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: i < employees.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                  >
                    <td className="px-5 py-[13px]">
                      <div className="flex items-center gap-[10px]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0
                          ${emp.role === "ADMIN"
                            ? "bg-orange-500/20 border border-orange-500/40 text-orange-400"
                            : "bg-blue-500/20 border border-blue-500/40 text-blue-400"
                          }`}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-[#e6edf3] text-sm">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-[13px] text-[#8b949e] text-[13px]">{emp.email}</td>
                    <td className="px-5 py-[13px]">
                      <span className={`px-[10px] py-[3px] rounded-full text-[11px] font-bold
                        ${emp.role === "ADMIN"
                          ? "bg-orange-500/[0.13] text-orange-400"
                          : "bg-blue-500/[0.13] text-blue-400"
                        }`}>
                        {emp.role === "ADMIN" ? "Admin" : "Empleado"}
                      </span>
                    </td>
                    <td className="px-5 py-[13px] text-[#8b949e] text-[13px]">
                      {new Date(emp.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-5 py-[13px]">
                      {emp.role !== "ADMIN" && (
                        <button
                          onClick={() => handleDeleteRequest(emp)}
                          aria-label={`Eliminar empleado ${emp.name}`}
                          disabled={deletingId === emp.id}
                          className="flex items-center gap-[6px] px-3 py-[6px] rounded-[7px] bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-semibold hover:bg-red-400/20 transition-colors disabled:opacity-50 disabled:cursor-wait"
                        >
                          {deletingId === emp.id
                            ? <Loader2 size={13} className="animate-spin" />
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
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-5">
          <div className="bg-[#161b22] border border-white/[0.08] rounded-2xl w-full max-w-[420px] overflow-hidden">
            <div className="px-5 py-[18px] border-b border-white/[0.08] flex items-center justify-between">
              <div className="font-bold text-base text-[#e6edf3]">Nuevo empleado</div>
              <button onClick={() => setShowForm(false)} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4">
              {[
                { label: "Nombre completo", value: name,     set: setName,     type: "text",     placeholder: "Juan García" },
                { label: "Email",           value: email,    set: setEmail,    type: "email",    placeholder: "juan@restaurante.com" },
                { label: "Contraseña",      value: password, set: setPassword, type: "password", placeholder: "Mínimo 6 caracteres" },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-[#8b949e] mb-[6px] uppercase tracking-[0.5px]">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    required
                    className="w-full px-3 py-[10px] rounded-lg bg-[#0d1117] border border-white/[0.08] text-[#e6edf3] text-sm outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-[#484f58]"
                  />
                </div>
              ))}

              {formError && (
                <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-[10px] text-red-400 text-[13px]">
                  {formError}
                </div>
              )}

              <div className="flex gap-[10px] mt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-[11px] rounded-[9px] bg-white/5 border border-white/[0.08] text-[#8b949e] font-semibold text-sm cursor-pointer hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formState === "loading"}
                  className="flex-1 py-[11px] rounded-[9px] bg-orange-500 disabled:opacity-50 disabled:cursor-wait text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
                >
                  {formState === "loading" && <Loader2 size={15} className="animate-spin" />}
                  {formState === "loading" ? "Creando..." : "Crear empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar empleado */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-5">
          <div className="bg-[#161b22] border border-white/[0.08] rounded-[14px] w-full max-w-[380px] p-6 text-center">
            <div className="w-11 h-11 rounded-full bg-red-400/[0.13] flex items-center justify-center mx-auto mb-[14px]">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <div className="font-bold text-base text-[#e6edf3] mb-2">¿Eliminar empleado?</div>
            <p className="text-[#8b949e] text-sm mb-5">
              Vas a eliminar a{" "}
              <span className="text-[#e6edf3] font-semibold">"{confirmModal.employeeName}"</span>.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-[10px]">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-[10px] rounded-[9px] bg-transparent border border-white/[0.08] text-[#8b949e] font-semibold text-sm cursor-pointer hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="flex-1 py-[10px] rounded-[9px] bg-red-400/[0.15] border border-red-400/25 text-red-400 font-bold text-sm cursor-pointer hover:bg-red-400/25 transition-colors"
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
