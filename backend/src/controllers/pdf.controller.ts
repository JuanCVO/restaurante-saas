import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import PDFDocument from "pdfkit";

const getColombiaDayRange = () => {
  const now = new Date()
  const colombiaOffset = -5 * 60 * 60 * 1000
  const nowColombia = new Date(now.getTime() + colombiaOffset)
  const startOfDayColombia = new Date(
    Date.UTC(nowColombia.getUTCFullYear(), nowColombia.getUTCMonth(), nowColombia.getUTCDate(), 0, 0, 0, 0)
  )
  const today = new Date(startOfDayColombia.getTime() - colombiaOffset)
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  return { today, tomorrow }
}

const col = (v: number) => `$${v.toLocaleString("es-CO")}`

const drawRow = (
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  color = "#333333",
  bold = false
) => {
  const y = doc.y
  doc
    .fontSize(11)
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fillColor(color)
    .text(label, 50, y)
    .text(value, 350, y)
  doc.font("Helvetica").fillColor("#333333")
  doc.moveDown(0.35)
}

const drawDivider = (doc: PDFKit.PDFDocument, color = "#eeeeee") => {
  doc.moveDown(0.5)
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor(color).stroke()
  doc.moveDown(0.7)
}

const drawFooter = (doc: PDFKit.PDFDocument) => {
  doc.moveDown(2)
  drawDivider(doc)
  doc.fontSize(9).font("Helvetica").fillColor("#aaaaaa")
    .text("Sistema desarrollado por @JuanCVO", { align: "center" })
  doc.fontSize(8).text(
    `Generado el ${new Date().toLocaleDateString("es-CO", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    })}`,
    { align: "center" }
  )
}

export const downloadTodayPDF = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string
    const { today, tomorrow } = getColombiaDayRange()

    const summary = await prisma.dailySummary.findFirst({
      where: { restaurantId, date: { gte: today, lt: tomorrow } },
    })

    if (!summary) {
      return res.status(404).json({ message: "No hay resumen del día para exportar." })
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    const doc = new PDFDocument({ margin: 50 })

    const dateStr = summary.date.toLocaleDateString("es-CO", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename=cierre-${Date.now()}.pdf`)
    doc.pipe(res)

    // Encabezado
    doc.fontSize(22).font("Helvetica-Bold").text(restaurant?.name ?? "Restaurante", { align: "center" })
    doc.fontSize(12).font("Helvetica").fillColor("#666666").text("Cierre del día", { align: "center" })
    doc.fontSize(11).fillColor("#e67e22").text(dateStr, { align: "center" })
    doc.moveDown(1.5)

    // Ventas
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#000000").text("Ventas del día")
    doc.moveDown(0.4)
    drawRow(doc, "Mesas cerradas",  `${summary.totalOrdenes}`)
    drawRow(doc, "Platos vendidos", `${summary.totalPlatos}`)
    drawRow(doc, "Efectivo",        col(summary.efectivo))
    drawRow(doc, "Datáfono",        col(summary.datafono))
    drawRow(doc, "Nequi",           col(summary.nequi))
    drawRow(doc, "Propinas",        col(summary.totalPropinas ?? 0), "#27ae60")

    drawDivider(doc, "#dddddd")

    // Gastos operativos (se restan del ingreso)
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#000000").text("Gastos operativos del día")
    doc.moveDown(0.4)
    const totalGastos = summary.totalGastos ?? 0
    if (totalGastos > 0) {
      drawRow(doc, "Total gastos (descontados)", col(totalGastos), "#e74c3c")
    } else {
      doc.fontSize(11).font("Helvetica").fillColor("#aaaaaa").text("  Sin gastos operativos registrados")
      doc.moveDown(0.35)
    }

    drawDivider(doc, "#dddddd")

    // Resumen neto
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#000000").text("Resumen neto")
    doc.moveDown(0.4)
    const ventasBrutas = summary.efectivo + summary.datafono + summary.nequi
    drawRow(doc, "Ventas brutas",        col(ventasBrutas))
    drawRow(doc, "Gastos",               `- ${col(totalGastos)}`, "#e74c3c")
    drawRow(doc, "Total ingresos netos", col(summary.totalIngresos), "#27ae60", true)

    drawFooter(doc)
    doc.end()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al generar el PDF del día." })
  }
}

export const downloadSummaryPDF = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const summaries = await prisma.dailySummary.findMany({
      where: { restaurantId, date: { gte: sevenDaysAgo } },
      orderBy: { date: "asc" },
    })

    if (summaries.length === 0) {
      return res.status(400).json({ message: "No hay resúmenes de los últimos 7 días para exportar." })
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    const doc = new PDFDocument({ margin: 50 })

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename=reporte-semanal-${Date.now()}.pdf`)
    doc.pipe(res)

    // Encabezado
    doc.fontSize(22).font("Helvetica-Bold").text(restaurant?.name ?? "Restaurante", { align: "center" })
    doc.fontSize(12).font("Helvetica").fillColor("#666666").text("Reporte semanal de ventas", { align: "center" })
    doc.moveDown(1.5)

    // Totales generales
    const totalIngresos = summaries.reduce((s, d) => s + d.totalIngresos, 0)
    const totalOrdenes  = summaries.reduce((s, d) => s + d.totalOrdenes, 0)
    const totalEfectivo = summaries.reduce((s, d) => s + d.efectivo, 0)
    const totalDatafono = summaries.reduce((s, d) => s + d.datafono, 0)
    const totalNequi    = summaries.reduce((s, d) => s + d.nequi, 0)
    const totalPropinas = summaries.reduce((s, d) => s + (d.totalPropinas ?? 0), 0)
    const totalGastos   = summaries.reduce((s, d) => s + (d.totalGastos ?? 0), 0)
    const ventasBrutas  = totalEfectivo + totalDatafono + totalNequi

    doc.fontSize(13).font("Helvetica-Bold").fillColor("#000000").text("Resumen general")
    doc.moveDown(0.4)
    drawRow(doc, "Total órdenes",        `${totalOrdenes}`)
    drawRow(doc, "Efectivo",             col(totalEfectivo))
    drawRow(doc, "Datáfono",             col(totalDatafono))
    drawRow(doc, "Nequi",                col(totalNequi))
    drawRow(doc, "Propinas",             col(totalPropinas), "#27ae60")
    drawRow(doc, "Ventas brutas",        col(ventasBrutas))
    drawRow(doc, "Gastos operativos",    `- ${col(totalGastos)}`, "#e74c3c")
    drawRow(doc, "Total ingresos netos", col(totalIngresos), "#27ae60", true)

    drawDivider(doc, "#cccccc")

    // Detalle por día
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#000000").text("Detalle por día")
    doc.moveDown(0.6)

    for (const summary of summaries) {
      const fecha = new Date(summary.date).toLocaleDateString("es-CO", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
      const gastosDia = summary.totalGastos ?? 0
      const ventasDia = summary.efectivo + summary.datafono + summary.nequi

      doc.fontSize(11).font("Helvetica-Bold").fillColor("#e67e22").text(fecha)
      doc.fontSize(10).font("Helvetica").fillColor("#333333")
        .text(`  Ventas: ${col(ventasDia)}   |   Órdenes: ${summary.totalOrdenes}   |   Platos: ${summary.totalPlatos}`)
      doc.text(`  Efectivo: ${col(summary.efectivo)}   |   Datáfono: ${col(summary.datafono)}   |   Nequi: ${col(summary.nequi)}`)
      doc.fillColor("#27ae60").text(`  Propinas: ${col(summary.totalPropinas ?? 0)}`)
      if (gastosDia > 0) {
        doc.fillColor("#e74c3c").text(`  Gastos operativos: ${col(gastosDia)}`)
      }
      doc.fillColor("#27ae60").font("Helvetica-Bold")
        .text(`  Ingreso neto del día: ${col(summary.totalIngresos)}`)
      doc.font("Helvetica").fillColor("#333333")
      doc.moveDown(0.9)
    }

    drawFooter(doc)
    doc.end()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al generar el PDF." })
  }
}
