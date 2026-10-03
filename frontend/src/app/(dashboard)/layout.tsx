"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

import Sidebar from "@/components/ui/layout/Sidebar"
import PrinterModal from "@/components/ui/printer-modal"
import { useCurrentUser } from "@/lib/auth"

const ADMIN_ONLY = ["/dashboard", "/inventory", "/purchases", "/employees"]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, token, ready } = useCurrentUser()

  useEffect(() => {
    if (!ready) return
    if (!token) {
      router.replace("/login")
      return
    }
    if (user?.role === "EMPLOYEE") {
      const blocked = ADMIN_ONLY.some(p => pathname.startsWith(p))
      if (blocked) router.replace("/tables")
    }
  }, [ready, token, user, pathname, router])

  // evita mostrar pantallas a medias mientras se lee la sesión
  if (!ready || !token) {
    return (
      <div className="grid h-dvh place-items-center bg-canvas">
        <Loader2 className="animate-spin text-soft" size={28} aria-label="Cargando" />
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <Sidebar />
      {user?.role === "ADMIN" && <PrinterModal />}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
    </div>
  )
}
