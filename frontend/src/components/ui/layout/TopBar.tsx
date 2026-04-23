"use client"

import { useState } from "react"
import { Bell, Search, AlertTriangle, CheckCircle } from "lucide-react"

export default function TopBar({ title }: { title: string }) {
  const [showNotif, setShowNotif] = useState(false)

  const day = new Date().toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long",
  })

  return (
    <header style={{
      height: 58, background: "#161b22",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center",
      padding: "0 24px", gap: 14, flexShrink: 0, position: "relative",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#e6edf3", lineHeight: 1 }}>{title}</div>
        <div style={{ fontSize: 11, color: "#8b949e", marginTop: 2, textTransform: "capitalize" }}>{day}</div>
      </div>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#1c2128", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8, padding: "7px 12px", width: 200,
      }}>
        <Search size={13} color="#8b949e" />
        <input placeholder="Buscar..." style={{
          background: "none", border: "none", color: "#8b949e",
          fontSize: 13, width: "100%", outline: "none",
        }} />
      </div>

      {/* Bell */}
      <div style={{ position: "relative" }}>
        <button onClick={() => setShowNotif(p => !p)} style={{
          width: 36, height: 36, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#1c2128", border: "1px solid rgba(255,255,255,0.08)",
          color: "#8b949e", position: "relative", cursor: "pointer",
        }}>
          <Bell size={15} />
          <div style={{
            position: "absolute", top: 7, right: 7, width: 8, height: 8,
            borderRadius: 99, background: "#f87171",
            border: "2px solid #161b22",
          }} />
        </button>
        {showNotif && (
          <div className="scale-in" style={{
            position: "absolute", right: 0, top: 44, width: 300,
            background: "#1c2128", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: 8, zIndex: 100,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#484f58", padding: "4px 8px 8px", textTransform: "uppercase", letterSpacing: 0.8 }}>
              Notificaciones
            </div>
            {[
              { icon: AlertTriangle, c: "#f87171", msg: "Stock bajo en algún producto", t: "hace 5 min" },
              { icon: CheckCircle, c: "#22c55e", msg: "Cierre del día completado", t: "hace 12 min" },
            ].map((n, i) => {
              const Icon = n.icon
              return (
                <div key={i} style={{
                  display: "flex", gap: 10, padding: 8, borderRadius: 8, cursor: "pointer",
                }}>
                  <Icon size={14} color={n.c} style={{ marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, color: "#e6edf3", fontWeight: 500 }}>{n.msg}</div>
                    <div style={{ fontSize: 11, color: "#484f58", marginTop: 2 }}>{n.t}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}