import { z } from "zod"

// Configuración propia de cada restaurante. Lo que no se haya cambiado toma el valor por defecto, así un
// restaurante nuevo (o uno de antes de existir esta configuración) funciona igual que siempre.
export const PAYMENT_METHODS = ["Efectivo", "Datafono", "Nequi", "Bancolombia", "Mixto"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

const tipPercent = z.number().int().min(0).max(30)
const paymentMethods = z.array(z.enum(PAYMENT_METHODS)).min(1).refine(list => new Set(list).size === list.length, {
  message: "Hay medios de pago repetidos.",
})

// Correo al que se manda el PDF del cierre; vacío o sin definir significa que no se manda a nadie
const bossEmail = z.preprocess(
  v => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().toLowerCase().email().max(160).nullable()
)

// El pago mixto es efectivo + otro medio: sin esas dos partes no tiene sentido ofrecerlo
const mixedNeedsBoth = (list: readonly PaymentMethod[]) =>
  !list.includes("Mixto") ||
  (list.includes("Efectivo") && (list.includes("Datafono") || list.includes("Nequi") || list.includes("Bancolombia")))
const MIXED_MESSAGE = "El pago mixto necesita Efectivo y al menos otro medio (Datafono, Nequi o Bancolombia)."

export const SettingsSchema = z.object({
  tipPercent: tipPercent.default(10),
  paymentMethods: paymentMethods.default([...PAYMENT_METHODS]),
  bossEmail: bossEmail.default(null),
}).refine(s => mixedNeedsBoth(s.paymentMethods), { message: MIXED_MESSAGE, path: ["paymentMethods"] })

export type Settings = z.infer<typeof SettingsSchema>

// Lo que acepta el administrador al cambiar su configuración: solo estos campos, todos opcionales
export const SettingsPatchSchema = z.object({
  tipPercent: tipPercent.optional(),
  paymentMethods: paymentMethods.optional(),
  bossEmail: bossEmail.optional(),
}).strict()

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({})

// Un dato guardado que ya no cumple las reglas no tumba el sistema: se usan los valores por defecto
export const parseSettings = (raw: unknown): Settings => {
  const result = SettingsSchema.safeParse(raw ?? {})
  return result.success ? result.data : DEFAULT_SETTINGS
}

// Aplica un cambio parcial sobre lo vigente y valida el resultado completo
export const mergeSettings = (current: Settings, patch: z.infer<typeof SettingsPatchSchema>) =>
  SettingsSchema.safeParse({ ...current, ...patch })
