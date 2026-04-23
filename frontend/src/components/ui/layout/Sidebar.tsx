"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, Package, UtensilsCrossed, LogOut,
  ChefHat, Calendar, TrendingUp, ShoppingCart,
  Moon, FileDown, X, CheckCircle, Loader2, Users
} from "lucide-react"
import api from "@/lib/axios"

const ADMIN_NAV = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tables",     icon: UtensilsCrossed, label: "Mesas" },
  { href: "/inventory",  icon: Package,          label: "Inventario" },
  { href: "/purchases",  icon: ShoppingCart,     label: "Compras y Gastos" },
  { href: "/employees",  icon: Users,            label: "Empleados" },
]

const EMPLOYEE_NAV = [
  { href: "/tables", icon: UtensilsCrossed, label: "Mesas" },
]

const SOON = [
  { icon: ChefHat,    label: "Cocina KDS" },
  { icon: Calendar,   label: "Reservaciones" },
  { icon: TrendingUp, label: "Reportes" },
]

type ModalState = "idle" | "loading" | "success" | "error"

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeState, setCloseState]         = useState<ModalState>("idle")
  const [closeMsg, setCloseMsg]             = useState("")
  const [pdfLoading, setPdfLoading]         = useState(false)
  const [userRole, setUserRole]             = useState<"ADMIN" | "EMPLOYEE">("EMPLOYEE")
  const [userName, setUserName]             = useState("")

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    setUserRole(user.role || "EMPLOYEE")
    setUserName(user.name || "")
  }, [])

  const NAV = userRole === "ADMIN" ? ADMIN_NAV : EMPLOYEE_NAV

  const getAuth = () => {
    const token        = localStorage.getItem("token") || ""
    const user         = JSON.parse(localStorage.getItem("user") || "{}")
    const restaurantId = user?.restaurantId || ""
    return { token, restaurantId }
  }

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url    = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href     = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  // ── Cerrar día ─────────────────────────────────────────────
  const handleCloseDay = async () => {
    const { token, restaurantId } = getAuth()
    if (!restaurantId) return

    setCloseState("loading")
    setCloseMsg("")

    try {
      await api.post(
        "/daily-summary/close",
        { restaurantId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setCloseState("success")
      setCloseMsg("El día se cerró correctamente. Las órdenes fueron archivadas.")
      window.dispatchEvent(new Event("day-closed"))

      try {
        const pdfRes = await api.get(`/daily-summary/pdf/day/${restaurantId}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        })
        const today = new Date().toLocaleDateString("es-CO").replace(/\//g, "-")
        triggerBlobDownload(new Blob([pdfRes.data], { type: "application/pdf" }), `cierre-${today}.pdf`)
      } catch {
        // PDF fallido no bloquea el cierre
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? "Error al cerrar el día."
      setCloseState("error")
      setCloseMsg(msg)
    }
  }

  const handleCloseModalDismiss = () => {
    setShowCloseModal(false)
    setCloseState("idle")
    setCloseMsg("")
    if (closeState === "success") router.refresh()
  }

  // ── Descargar PDF semanal ──────────────────────────────────
  const handleDownloadPdf = async () => {
    const { token, restaurantId } = getAuth()
    if (!restaurantId || pdfLoading) return

    setPdfLoading(true)
    try {
      const res = await api.get(`/daily-summary/pdf/${restaurantId}`, {
        headers:      { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const today = new Date().toLocaleDateString("es-CO").replace(/\//g, "-")
      triggerBlobDownload(new Blob([res.data], { type: "application/pdf" }), `reporte-semanal-${today}.pdf`)

      await api.delete(`/daily-summary/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      window.dispatchEvent(new Event("day-closed"))
    } catch {
      alert("No se pudo descargar el PDF. Intenta después de cerrar al menos un día.")
    } finally {
      setPdfLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  return (
    <>
      <aside style={{
        width: 240, background: "#161b22",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column",
        height: "100vh", flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: "22px 18px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              background: "#f97316", borderRadius: 10, width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 16px #f9731655",
            }}>
              <ChefHat size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#e6edf3", lineHeight: 1 }}>
                RestaurantOS
              </div>
              <div style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>
                Sistema de gestión
              </div>
            </div>
          </div>
        </div>

        {/* Nav principal */}
        <nav style={{ flex: 1, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#484f58",
            textTransform: "uppercase", letterSpacing: 1, padding: "6px 10px 8px",
          }}>
            Menú principal
          </div>

          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            const Icon   = item.icon
            return (
              <button key={item.href} onClick={() => router.push(item.href)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8, textAlign: "left",
                  background: active ? "rgba(249,115,22,0.12)" : "transparent",
                  color:      active ? "#f97316" : "#8b949e",
                  fontWeight: active ? 600 : 500,
                  fontSize: 14,
                  border: active
                    ? "1px solid rgba(249,115,22,0.18)"
                    : "1px solid transparent",
                  cursor: "pointer", transition: "all 0.15s", width: "100%",
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.background = "transparent"
                }}
              >
                <Icon size={16} />
                {item.label}
              </button>
            )
          })}

          {/* Coming soon — solo admin */}
          {userRole === "ADMIN" && (
            <>
              <div style={{
                fontSize: 10, fontWeight: 700, color: "#484f58",
                textTransform: "uppercase", letterSpacing: 1, padding: "16px 10px 8px",
              }}>
                Próximamente
              </div>

              {SOON.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8, color: "#484f58",
                    fontSize: 13, cursor: "default",
                  }}>
                    <Icon size={15} />
                    {item.label}
                    <span style={{
                      marginLeft: "auto", fontSize: 10,
                      background: "rgba(255,255,255,0.08)", color: "#484f58",
                      padding: "2px 6px", borderRadius: 99,
                    }}>
                      Pronto
                    </span>
                  </div>
                )
              })}
            </>
          )}
        </nav>

        {/* Acciones admin (Cerrar día + PDF) */}
        {userRole === "ADMIN" && (
          <div style={{ padding: "10px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              {
                icon: Moon, label: "Cerrar día",
                color: "#fbbf24", mut: "rgba(251,191,36,0.13)",
                action: () => setShowCloseModal(true), loading: false,
              },
              {
                icon: FileDown, label: pdfLoading ? "Descargando..." : "Descargar PDF",
                color: "#22c55e", mut: "rgba(34,197,94,0.13)",
                action: handleDownloadPdf, loading: pdfLoading,
              },
            ].map(a => {
              const Icon = a.loading ? Loader2 : a.icon
              return (
                <button key={a.label} onClick={a.action} disabled={a.loading}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "9px 12px", borderRadius: 8,
                    color: a.color, fontWeight: 500, fontSize: 13,
                    background: "transparent", cursor: a.loading ? "wait" : "pointer",
                    border: "none", width: "100%", transition: "background 0.15s",
                    opacity: a.loading ? 0.7 : 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = a.mut)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <Icon size={15} style={a.loading ? { animation: "spin 1s linear infinite" } : {}} />
                  {a.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Usuario + Logout */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Info de usuario */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: userRole === "ADMIN" ? "rgba(249,115,22,0.2)" : "rgba(96,165,250,0.2)",
              border: `1px solid ${userRole === "ADMIN" ? "rgba(249,115,22,0.4)" : "rgba(96,165,250,0.4)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700,
              color: userRole === "ADMIN" ? "#f97316" : "#60a5fa",
              flexShrink: 0,
            }}>
              {userName.charAt(0).toUpperCase() || "?"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userName || "Usuario"}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                color: userRole === "ADMIN" ? "#f97316" : "#60a5fa",
              }}>
                {userRole === "ADMIN" ? "Administrador" : "Empleado"}
              </div>
            </div>
          </div>

          <button onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 12px", borderRadius: 8, color: "#8b949e",
              fontWeight: 500, fontSize: 13, background: "transparent",
              cursor: "pointer", border: "none", width: "100%",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={e => (e.currentTarget.style.color = "#8b949e")}
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Modal Cerrar Día ───────────────────────────────── */}
      {showCloseModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}>
          <div className="scale-in" style={{
            background: "#161b22",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, width: "100%", maxWidth: 440,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "18px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#e6edf3" }}>
                Cerrar día
              </div>
              {closeState !== "loading" && (
                <button onClick={handleCloseModalDismiss} style={{ color: "#8b949e", cursor: "pointer", border: "none", background: "none" }}>
                  <X size={20} />
                </button>
              )}
            </div>

            <div style={{ padding: 24 }}>
              {closeState === "idle" && (
                <>
                  <p style={{ color: "#8b949e", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                    Esta acción archivará todas las órdenes cerradas del día y generará el resumen diario.{" "}
                    <span style={{ color: "#f87171", fontWeight: 600 }}>No se puede deshacer.</span>
                  </p>
                  <div style={{
                    background: "rgba(251,191,36,0.08)",
                    border: "1px solid rgba(251,191,36,0.2)",
                    borderRadius: 10, padding: "12px 14px",
                    fontSize: 13, color: "#fbbf24", marginBottom: 20,
                  }}>
                    Asegúrate de haber cerrado todas las cuentas antes de continuar.
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handleCloseModalDismiss} style={{
                      flex: 1, padding: "11px 16px", borderRadius: 9,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#8b949e", fontWeight: 600, fontSize: 14,
                      cursor: "pointer",
                    }}>
                      Cancelar
                    </button>
                    <button onClick={handleCloseDay} style={{
                      flex: 1, padding: "11px 16px", borderRadius: 9,
                      background: "rgba(251,191,36,0.15)",
                      border: "1px solid rgba(251,191,36,0.3)",
                      color: "#fbbf24", fontWeight: 600, fontSize: 14,
                      cursor: "pointer",
                    }}>
                      Sí, cerrar día
                    </button>
                  </div>
                </>
              )}

              {closeState === "loading" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <Loader2 size={36} color="#fbbf24" style={{ margin: "0 auto 14px", animation: "spin 1s linear infinite" }} />
                  <p style={{ color: "#8b949e", fontSize: 14 }}>Cerrando el día...</p>
                </div>
              )}

              {closeState === "success" && (
                <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
                  <CheckCircle size={40} color="#22c55e" style={{ margin: "0 auto 14px" }} />
                  <p style={{ color: "#22c55e", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                    ¡Día cerrado exitosamente!
                  </p>
                  <p style={{ color: "#8b949e", fontSize: 13, marginBottom: 20 }}>{closeMsg}</p>
                  <button onClick={handleCloseModalDismiss} style={{
                    width: "100%", padding: "11px 16px", borderRadius: 9,
                    background: "rgba(34,197,94,0.13)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    color: "#22c55e", fontWeight: 600, fontSize: 14, cursor: "pointer",
                  }}>
                    Entendido
                  </button>
                </div>
              )}

              {closeState === "error" && (
                <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(248,113,113,0.13)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 14px", fontSize: 22, color: "#f87171",
                  }}>✕</div>
                  <p style={{ color: "#f87171", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                    No se pudo cerrar el día
                  </p>
                  <p style={{ color: "#8b949e", fontSize: 13, marginBottom: 20 }}>{closeMsg}</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handleCloseModalDismiss} style={{
                      flex: 1, padding: "10px", borderRadius: 9,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#8b949e", fontWeight: 600, fontSize: 14, cursor: "pointer",
                    }}>
                      Cancelar
                    </button>
                    <button onClick={handleCloseDay} style={{
                      flex: 1, padding: "10px", borderRadius: 9,
                      background: "rgba(248,113,113,0.13)",
                      border: "1px solid rgba(248,113,113,0.2)",
                      color: "#f87171", fontWeight: 600, fontSize: 14, cursor: "pointer",
                    }}>
                      Reintentar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
