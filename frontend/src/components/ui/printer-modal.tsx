"use client"

import { useEffect, useMemo, useState } from "react"
import { Printer, Usb } from "lucide-react"

import { useCurrentUser } from "@/lib/auth"
import { renderLines } from "@/lib/escpos"
import { OPEN_PRINTER_EVENT, PrinterError, usePrinter } from "@/lib/printer"
import { buildTestReceipt } from "@/lib/receipt"
import { apiMessage } from "@/lib/errors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, Input, Select } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"

const STATUS_BADGE = {
  ready: { tone: "good", label: "Conectada" },
  connecting: { tone: "warn", label: "Conectando..." },
  disconnected: { tone: "soft", label: "Sin conectar" },
  unsupported: { tone: "bad", label: "No disponible en este navegador" },
} as const

export default function PrinterModal() {
  const toast = useToast()
  const { user } = useCurrentUser()
  const printer = usePrinter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_PRINTER_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_PRINTER_EVENT, onOpen)
  }, [])

  const restaurant = user?.restaurantName ?? "RestaurantOS"
  const ops = useMemo(() => buildTestReceipt(restaurant, printer.settings.footer), [restaurant, printer.settings.footer])
  const preview = useMemo(() => renderLines(ops, { cols: printer.settings.cols }), [ops, printer.settings.cols])

  const badge = STATUS_BADGE[printer.status]
  const ready = printer.status === "ready"

  const testPrint = async () => {
    setBusy(true)
    try {
      await printer.print(ops)
      toast.success("Se envió el tiquete de prueba a la impresora.")
    } catch (err) {
      toast.error(err instanceof PrinterError ? err.message : apiMessage(err, "No se pudo imprimir."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Impresora" subtitle={ready ? printer.deviceName : "Tiquetes de 80 mm por USB"} size="md">
      <div className="flex flex-col gap-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <Usb size={20} className="text-soft" aria-hidden />
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
          <div className="flex gap-2">
            {ready ? (
              <Button size="sm" variant="secondary" onClick={printer.disconnect}>Olvidar</Button>
            ) : (
              <Button size="sm" onClick={() => void printer.connect()} loading={printer.status === "connecting"} disabled={!printer.supported}>
                Conectar impresora
              </Button>
            )}
          </div>
        </div>

        {printer.error && (
          <div role="alert" className="rounded-md bg-bad/10 px-3 py-2.5 text-[15px] text-bad">
            <p>{printer.error}</p>
            {printer.detail && <p className="mt-1.5 break-words font-mono text-xs opacity-80">Detalle: {printer.detail}</p>}
          </div>
        )}

        {!printer.supported && (
          <p className="rounded-md bg-warn/10 px-3 py-2.5 text-sm text-warn">
            Este navegador no puede hablar con la impresora por USB. Abre la app en Chrome desde la tablet Android o desde un
            computador. Mientras tanto puedes imprimir con el diálogo del navegador.
          </p>
        )}

        {printer.supported && !ready && (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-soft">
            <li>Conecta la impresora a la tablet con el cable USB y un adaptador OTG, y enciéndela.</li>
            <li>Toca «Conectar impresora» y elige la impresora en la lista.</li>
            <li>Acepta el permiso. Queda recordada: no hay que repetirlo.</li>
          </ol>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={testPrint} loading={busy} disabled={!ready}>
            <Printer size={17} /> Imprimir prueba
          </Button>
          <Button variant="secondary" onClick={() => printer.printInBrowser(ops)}>
            Probar desde el navegador
          </Button>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 font-display text-base font-bold">Opciones</legend>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={printer.settings.autoPrint}
              onChange={e => printer.updateSettings({ autoPrint: e.target.checked })}
              className="mt-1 size-5 accent-[var(--color-brand)]"
            />
            <span>
              <span className="block font-semibold">Imprimir al cobrar</span>
              <span className="block text-sm text-soft">Saca el comprobante de pago apenas se cierra la cuenta.</span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={printer.settings.asciiOnly}
              onChange={e => printer.updateSettings({ asciiOnly: e.target.checked })}
              className="mt-1 size-5 accent-[var(--color-brand)]"
            />
            <span>
              <span className="block font-semibold">Sin tildes ni ñ</span>
              <span className="block text-sm text-soft">Actívalo solo si en el papel salen símbolos raros en lugar de letras.</span>
            </span>
          </label>

          <Field label="Ancho del texto" hint="Si el texto queda corto o se corta a la derecha, prueba con el otro valor.">
            <Select
              value={printer.settings.cols}
              onChange={e => printer.updateSettings({ cols: e.target.value === "48" ? 48 : 42 })}
            >
              <option value={42}>42 caracteres (recomendado)</option>
              <option value={48}>48 caracteres</option>
            </Select>
          </Field>

          <Field label="Mensaje al final del tiquete">
            <Input
              value={printer.settings.footer}
              onChange={e => printer.updateSettings({ footer: e.target.value.slice(0, 80) })}
              placeholder="¡Gracias por su visita!"
              maxLength={80}
            />
          </Field>
        </fieldset>

        <div>
          <p className="mb-2 text-sm font-semibold text-soft">Así se verá el tiquete</p>
          <div className="overflow-x-auto rounded-md bg-plate p-3 text-canvas">
            <pre className="m-0 w-fit font-mono text-[11px] leading-[1.25]" aria-label="Vista previa del tiquete">
              {preview.map((l, i) => (
                <div key={i} className={[l.big ? "text-[22px] leading-[1.1]" : "", l.bold ? "font-bold" : "", "min-h-[1.25em]"].join(" ")}>
                  {l.text}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </Modal>
  )
}
