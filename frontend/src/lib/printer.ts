"use client"

import { useEffect, useSyncExternalStore } from "react"
import { renderEscPos, renderLines, type Op } from "@/lib/escpos"

// Impresora térmica por USB con WebUSB (Chrome en Android o en computador).
// Solo funciona en https o localhost; el permiso se pide una vez y queda recordado.

// tipos mínimos de WebUSB; TypeScript no los trae
type UsbEndpoint = { endpointNumber: number; direction: "in" | "out"; type: string }
type UsbAlternate = { alternateSetting: number; interfaceClass: number; endpoints: UsbEndpoint[] }
type UsbInterface = { interfaceNumber: number; claimed: boolean; alternates: UsbAlternate[] }
type UsbDevice = {
  vendorId: number
  productId: number
  productName?: string
  manufacturerName?: string
  opened: boolean
  configuration: { interfaces: UsbInterface[] } | null
  open(): Promise<void>
  selectConfiguration(n: number): Promise<void>
  claimInterface(n: number): Promise<void>
  selectAlternateInterface(i: number, a: number): Promise<void>
  transferOut(endpoint: number, data: BufferSource): Promise<{ status: string; bytesWritten: number }>
}
type UsbApi = {
  requestDevice(options: { filters: unknown[] }): Promise<UsbDevice>
  getDevices(): Promise<UsbDevice[]>
  addEventListener(type: "connect" | "disconnect", cb: (e: { device: UsbDevice }) => void): void
}

export type PrinterStatus = "unsupported" | "disconnected" | "connecting" | "ready"

export type PrinterSettings = {
  /** 42 (área de 72 mm) o 48 */
  cols: 42 | 48
  asciiOnly: boolean
  autoPrint: boolean
  footer: string
}

type PrinterState = {
  status: PrinterStatus
  deviceName: string
  error: string
  detail: string
  settings: PrinterSettings
}

export class PrinterError extends Error {
  constructor(public code: "NOT_CONNECTED" | "WRITE_FAILED" | "UNSUPPORTED", message: string) {
    super(message)
  }
}

export const DEFAULT_SETTINGS: PrinterSettings = { cols: 42, asciiOnly: false, autoPrint: true, footer: "" }

const SETTINGS_KEY = "printer:settings"
const LAST_KEY = "printer:last"
const CHUNK = 4096

export const OPEN_PRINTER_EVENT = "open-printer-settings"

const SERVER_STATE: PrinterState = { status: "disconnected", deviceName: "", error: "", detail: "", settings: DEFAULT_SETTINGS }

const detailOf = (err: unknown) => {
  const e = err as { name?: string; message?: string }
  return [e?.name, e?.message].filter(Boolean).join(": ")
}

let state: PrinterState = SERVER_STATE
let active: { device: UsbDevice; iface: number; endpoint: number } | null = null
let initialized = false
const listeners = new Set<() => void>()

const set = (partial: Partial<PrinterState>) => {
  state = { ...state, ...partial }
  listeners.forEach(l => l())
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

const usbApi = (): UsbApi | undefined =>
  typeof navigator === "undefined" ? undefined : (navigator as unknown as { usb?: UsbApi }).usb

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
const writeJson = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* sin almacenamiento: no se recuerda */ }
}

const nameOf = (d: UsbDevice) =>
  [d.manufacturerName, d.productName].filter(Boolean).join(" ") ||
  `USB ${d.vendorId.toString(16).padStart(4, "0")}:${d.productId.toString(16).padStart(4, "0")}`

// interfaz de impresora (clase 7) y su salida; si no hay, cualquier salida bulk
const findTarget = (device: UsbDevice) => {
  const interfaces = device.configuration?.interfaces ?? []
  for (const wantClass of [7, -1]) {
    for (const iface of interfaces) {
      for (const alt of iface.alternates) {
        if (wantClass !== -1 && alt.interfaceClass !== wantClass) continue
        const out = alt.endpoints.find(e => e.direction === "out" && e.type === "bulk")
        if (out) return { iface: iface.interfaceNumber, alt: alt.alternateSetting, endpoint: out.endpointNumber }
      }
    }
  }
  return null
}

const attach = async (device: UsbDevice) => {
  if (!device.opened) await device.open()
  if (device.configuration === null) await device.selectConfiguration(1)
  const target = findTarget(device)
  if (!target) throw new Error("Esta conexión USB no tiene salida de impresión.")
  const iface = device.configuration?.interfaces.find(i => i.interfaceNumber === target.iface)
  if (!iface?.claimed) await device.claimInterface(target.iface)
  if (target.alt !== 0) await device.selectAlternateInterface(target.iface, target.alt)
  active = { device, iface: target.iface, endpoint: target.endpoint }
  writeJson(LAST_KEY, { vendorId: device.vendorId, productId: device.productId })
  set({ status: "ready", deviceName: nameOf(device), error: "", detail: "" })
}

const FRIENDLY_OPEN_ERROR =
  "No se pudo abrir la impresora. Desconecta y vuelve a conectar el cable USB, acepta el permiso del equipo e intenta de nuevo."

// reconecta con una impresora ya autorizada, sin pedir permiso
export const reconnectPrinter = async () => {
  const usb = usbApi()
  if (!usb) return
  try {
    const devices = await usb.getDevices()
    const last = readJson<{ vendorId: number; productId: number }>(LAST_KEY)
    const pick =
      devices.find(d => last && d.vendorId === last.vendorId && d.productId === last.productId) ??
      (devices.length === 1 ? devices[0] : undefined)
    if (!pick) {
      active = null
      set({ status: "disconnected", deviceName: "" })
      return
    }
    await attach(pick)
  } catch (err) {
    active = null
    console.error("[impresora] no se pudo reconectar", err)
    set({ status: "disconnected", deviceName: "", error: FRIENDLY_OPEN_ERROR, detail: detailOf(err) })
  }
}

// abre el selector del navegador; hay que llamarla desde un toque del usuario
export const connectPrinter = async () => {
  const usb = usbApi()
  if (!usb) throw new PrinterError("UNSUPPORTED", "Este navegador no puede conectarse a la impresora por USB. Usa Chrome.")
  set({ status: "connecting", error: "" })
  try {
    const device = await usb.requestDevice({ filters: [] })
    await attach(device)
  } catch (err) {
    active = null
    const cancelled = (err as { name?: string })?.name === "NotFoundError"
    if (!cancelled) console.error("[impresora] no se pudo conectar", err)
    set({
      status: "disconnected", deviceName: "",
      error: cancelled ? "" : FRIENDLY_OPEN_ERROR,
      detail: cancelled ? "" : detailOf(err),
    })
  }
}

export const disconnectPrinter = () => {
  active = null
  try { localStorage.removeItem(LAST_KEY) } catch { /* nada que olvidar */ }
  set({ status: "disconnected", deviceName: "", error: "", detail: "" })
}

export const updatePrinterSettings = (partial: Partial<PrinterSettings>) => {
  const settings = { ...state.settings, ...partial }
  writeJson(SETTINGS_KEY, settings)
  set({ settings })
}

export const printOps = async (ops: Op[]) => {
  if (!usbApi()) throw new PrinterError("UNSUPPORTED", "Este navegador no puede imprimir por USB. Usa Chrome.")
  if (!active) await reconnectPrinter()
  const link = active
  if (!link) throw new PrinterError("NOT_CONNECTED", "La impresora no está conectada. Conéctala en «Impresora».")

  const bytes = renderEscPos(ops, { cols: state.settings.cols, asciiOnly: state.settings.asciiOnly })
  try {
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const result = await link.device.transferOut(link.endpoint, bytes.slice(i, i + CHUNK))
      if (result.status !== "ok") throw new Error(result.status)
    }
  } catch {
    active = null
    set({ status: "disconnected", deviceName: "", error: "Se perdió la conexión con la impresora." })
    throw new PrinterError("WRITE_FAILED", "No se pudo imprimir. Revisa que la impresora esté encendida y con el cable conectado.")
  }
}

// para equipos sin USB directo; papel de 80 mm
export const printInBrowser = (ops: Op[]) => {
  const lines = renderLines(ops, { cols: state.settings.cols })
  const iframe = document.createElement("iframe")
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) { iframe.remove(); return }
  doc.open()
  doc.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>Tiquete</title><style>' +
    "@page{size:80mm auto;margin:0}html,body{margin:0}" +
    'pre{font:12px/1.25 "Courier New",monospace;width:72mm;margin:0 auto;padding:4mm 0;white-space:pre}' +
    "div{min-height:1.25em}.big{font-size:24px;line-height:1.1}.bold{font-weight:bold}" +
    "</style></head><body><pre></pre></body></html>"
  )
  doc.close()
  const pre = doc.querySelector("pre")
  if (pre) {
    for (const l of lines) {
      const div = doc.createElement("div")
      div.className = [l.big ? "big" : "", l.bold ? "bold" : ""].join(" ").trim()
      div.textContent = l.text
      pre.appendChild(div)
    }
  }
  win.focus()
  win.print()
  window.setTimeout(() => iframe.remove(), 3000)
}

const init = () => {
  if (initialized || typeof window === "undefined") return
  initialized = true
  const settings = { ...DEFAULT_SETTINGS, ...(readJson<Partial<PrinterSettings>>(SETTINGS_KEY) ?? {}) }
  const usb = usbApi()
  set({ settings, status: usb ? "disconnected" : "unsupported" })
  if (!usb) return
  usb.addEventListener("connect", () => { void reconnectPrinter() })
  usb.addEventListener("disconnect", () => {
    active = null
    set({ status: "disconnected", deviceName: "" })
  })
  void reconnectPrinter()
}

export const usePrinter = () => {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE)
  useEffect(() => { init() }, [])
  return {
    ...snapshot,
    supported: snapshot.status !== "unsupported",
    connect: connectPrinter,
    disconnect: disconnectPrinter,
    print: printOps,
    printInBrowser,
    updateSettings: updatePrinterSettings,
  }
}
