"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LayoutDashboard, UtensilsCrossed, ShoppingBag, Users, LogOut, ChefHat, Package, FileText, CalendarCheck } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import api from "@/lib/axios"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Inventario", href: "/inventory" },
  //{ icon: UtensilsCrossed, label: "Menú", href: "/menu" },
  //{ icon: ShoppingBag, label: "Pedidos", href: "/pedidos" },
  { icon: Users, label: "Mesas", href: "/tables" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [restaurantId, setRestaurantId] = useState("")
  const [token, setToken] = useState("")
  const [closingDay, setClosingDay] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem("token")
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (!t) router.push("/login")
    setToken(t || "")
    setRestaurantId(user.restaurantId || "")
  }, [])

  const headers = { Authorization: `Bearer ${token}` }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  const handleCloseDay = async () => {
    if (!confirm("¿Cerrar el día? Se guardará el resumen de ventas.")) return
    setClosingDay(true)
    try {
      await api.post("/daily-summary/close", { restaurantId }, { headers })
      alert(" Día cerrado correctamente.")
      
      window.dispatchEvent(new Event("day-closed"))
    } catch (error: any) {
      alert(error?.response?.data?.message || "Error al cerrar el día.")
    } finally {
      setClosingDay(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const res = await api.get(`/daily-summary/pdf/${restaurantId}`, {
        headers,
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `reporte-${Date.now()}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()

    
      await api.delete(`/daily-summary/${restaurantId}`, { headers })
    } catch (error: any) {
      alert(error?.response?.data?.message || "Error al descargar el PDF.")
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-900">

      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">

        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <span className="text-white font-bold text-lg">RestaurantOS</span>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-orange-500 text-white"
                    : "text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Cerrar día + PDF */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          <button
            onClick={handleCloseDay}
            disabled={closingDay}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors w-full disabled:opacity-50"
          >
            <CalendarCheck className="h-5 w-5" />
            <span className="font-medium">{closingDay ? "Cerrando..." : "Cerrar día"}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors w-full"
          >
            <FileText className="h-5 w-5" />
            <span className="font-medium">Descargar PDF</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-700 hover:text-white transition-colors w-full"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}