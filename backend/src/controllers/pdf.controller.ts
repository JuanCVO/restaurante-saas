import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import PDFDocument from "pdfkit";

export const downloadSummaryPDF = async (req: Request, res: Response) => {
  try {
    const  restaurantId = req.params.restaurantId as string
    const summaries = await prisma.dailySummary.findMany({
      where: { restaurantId },
      orderBy: { date: "asc" },
    });

    if (summaries.length === 0) {
      return res.status(400).json({ message: "No hay resúmenes para exportar." });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=reporte-${Date.now()}.pdf`
    );
    doc.pipe(res);

    // ─── Encabezado ───────────────────────────────────────
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .text(restaurant?.name ?? "Restaurante", { align: "center" });
    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor("#666666")
      .text("Reporte de ventas", { align: "center" });
    doc.moveDown(1.5);

    // ─── Totales generales ────────────────────────────────
    const totalGeneral = summaries.reduce((s, d) => s + d.totalIngresos, 0);
    const totalOrdenes = summaries.reduce((s, d) => s + d.totalOrdenes, 0);
    const totalEfectivo = summaries.reduce((s, d) => s + d.efectivo, 0);
    const totalDatafono = summaries.reduce((s, d) => s + d.datafono, 0);
    const totalNequi = summaries.reduce((s, d) => s + d.nequi, 0);

    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Resumen general");
    doc.moveDown(0.3);

    const lineY = doc.y;
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#333333")
      .text(`Total ingresos:`, 50, lineY)
      .text(`$${totalGeneral.toLocaleString("es-CO")}`, 300, lineY);
    doc.moveDown(0.3);
    doc.text(`Total órdenes:`, 50).text(`${totalOrdenes}`, 300, doc.y - doc.currentLineHeight());
    doc.moveDown(0.3);
    doc.text(`Efectivo:`, 50).text(`$${totalEfectivo.toLocaleString("es-CO")}`, 300, doc.y - doc.currentLineHeight());
    doc.moveDown(0.3);
    doc.text(`Datáfono:`, 50).text(`$${totalDatafono.toLocaleString("es-CO")}`, 300, doc.y - doc.currentLineHeight());
    doc.moveDown(0.3);
    doc.text(`Nequi:`, 50).text(`$${totalNequi.toLocaleString("es-CO")}`, 300, doc.y - doc.currentLineHeight());

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(1);

    // ─── Detalle por día ──────────────────────────────────
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#000000").text("Detalle por día");
    doc.moveDown(0.5);

    for (const summary of summaries) {
      const fecha = new Date(summary.date).toLocaleDateString("es-CO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#e67e22")
        .text(fecha);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#333333")
        .text(`  Ingresos: $${summary.totalIngresos.toLocaleString("es-CO")}   |   Órdenes: ${summary.totalOrdenes}   |   Platos: ${summary.totalPlatos}`);
      doc
        .text(`  Efectivo: $${summary.efectivo.toLocaleString("es-CO")}   |   Datáfono: $${summary.datafono.toLocaleString("es-CO")}   |   Nequi: $${summary.nequi.toLocaleString("es-CO")}`);

      doc.moveDown(0.8);
    }

    doc.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al generar el PDF." });
  }
};