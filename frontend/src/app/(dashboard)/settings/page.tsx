"use client"

import { useState } from "react"
import { Mail, Send } from "lucide-react"

import api from "@/lib/axios"
import { getCurrentUser, setSession, useCurrentUser } from "@/lib/auth"
import { apiMessage } from "@/lib/errors"
import TopBar from "@/components/ui/layout/TopBar"
import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import type { TenantConfig } from "@/types/api"

export default function SettingsPage() {
  const toast = useToast()
  const { user, token } = useCurrentUser()

  const [bossEmail, setBossEmail] = useState(user?.tenant?.settings.bossEmail ?? "")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.patch<TenantConfig>("/tenant/settings", { bossEmail: bossEmail.trim() })
      // igual que al iniciar sesión: se guarda el tenant actualizado para que el resto de la app lo vea ya mismo
      const me = getCurrentUser()
      if (token && me) setSession(token, { ...me, tenant: data })
      toast.success(
        data.settings.bossEmail
          ? `Listo. El cierre del día se mandará a ${data.settings.bossEmail}.`
          : "Listo. El cierre del día ya no se manda por correo."
      )
    } catch (err) {
      toast.error(apiMessage(err, "No se pudo guardar el correo."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="Ajustes" />

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-2 md:px-7">
        <p className="mb-5 max-w-2xl text-soft">
          Configuración general del restaurante.
        </p>

        <section className="flex max-w-xl flex-col gap-5 rounded-lg bg-surface p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-brand/15 text-brand">
              <Mail size={20} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">Correo del cierre del día</h2>
              <p className="text-sm text-soft">
                Cuando cierres el día, el PDF se manda automáticamente a este correo (por ejemplo, el de tu jefe
                o dueño). Déjalo vacío para que no se mande a nadie; el PDF siempre queda disponible para descargar.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Correo" className="flex-1">
              <Input
                type="email"
                inputMode="email"
                autoCapitalize="none"
                value={bossEmail}
                onChange={e => setBossEmail(e.target.value)}
                placeholder="jefe@restaurante.com"
              />
            </Field>
            <Button type="submit" size="lg" loading={saving}>
              <Send size={17} /> Guardar
            </Button>
          </form>
        </section>
      </div>
    </div>
  )
}
