import { DailySummary } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { sendMail } from "../lib/mail"
import { getTenantConfig } from "../lib/tenantConfig"
import { renderDailyClosePdf } from "../controllers/pdf.controller"

const col = (v: number) => `$${v.toLocaleString("es-CO")}`

const dateStr = (d: Date) =>
  d.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/Bogota" })

const buildHtml = (restaurantName: string, summary: DailySummary) => `
  <div style="font-family: Arial, sans-serif; color: #222; max-width: 480px;">
    <h2 style="margin-bottom: 4px;">${restaurantName}</h2>
    <p style="color: #666; margin-top: 0;">Cierre del día · ${dateStr(summary.date)}</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
      <tr><td style="padding: 4px 0;">Órdenes</td><td style="text-align: right;">${summary.totalOrdenes}</td></tr>
      <tr><td style="padding: 4px 0;">Platos vendidos</td><td style="text-align: right;">${summary.totalPlatos}</td></tr>
      <tr><td style="padding: 4px 0; font-weight: bold; border-top: 1px solid #ddd;">Neto del día</td>
          <td style="text-align: right; font-weight: bold; border-top: 1px solid #ddd;">${col(summary.totalIngresos)}</td></tr>
    </table>
    <p style="color: #999; font-size: 13px; margin-top: 16px;">El detalle completo va en el PDF adjunto.</p>
  </div>
`

// Si el restaurante no tiene plan con reportes en PDF, o no configuró un correo, no hace nada.
// Nunca lanza: quien llama (el cierre del día) ya terminó su trabajo aunque el correo falle.
export const sendDailyCloseEmail = async (restaurantId: string, summary: DailySummary): Promise<void> => {
  const { features, settings } = await getTenantConfig(restaurantId)
  if (!features.includes("pdf_reports") || !settings.bossEmail) return

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
  const pdf = await renderDailyClosePdf(summary, restaurant)

  const result = await sendMail({
    to: settings.bossEmail,
    subject: `Cierre del día · ${restaurant?.name ?? "Restaurante"} · ${col(summary.totalIngresos)}`,
    html: buildHtml(restaurant?.name ?? "Restaurante", summary),
    attachments: [{ filename: `cierre-${summary.date.toISOString().slice(0, 10)}.pdf`, content: pdf }],
  })
  if (!result.sent) console.error("No se pudo enviar el correo del cierre del día", result.error)
}
