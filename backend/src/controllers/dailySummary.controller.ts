import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Helper: fecha local Colombia (UTC-5) sin desfase
const getColombiaToday = () => {
  const now = new Date()
  const colombiaOffset = -5 * 60
  const localTime = new Date(now.getTime() + colombiaOffset * 60000)
  const year = localTime.getUTCFullYear()
  const month = localTime.getUTCMonth()
  const day = localTime.getUTCDate()
  return new Date(year, month, day)
}

// POST /api/daily-summary/close
export const closeDay = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.body.restaurantId as string

    const today = getColombiaToday()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: "CERRADA",
        createdAt: { gte: today, lt: tomorrow },
      },
      include: { items: true },
    });

    if (orders.length === 0) {
      return res.status(400).json({ message: "No hay órdenes del día para cerrar." });
    }

    const totalIngresos = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrdenes = orders.length;
    const totalPlatos = orders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0
    );
    const efectivo = orders
      .filter((o) => o.paymentMethod === "Efectivo")
      .reduce((sum, o) => sum + o.total, 0);
    const datafono = orders
      .filter((o) => o.paymentMethod === "Datafono")
      .reduce((sum, o) => sum + o.total, 0);
    const nequi = orders
      .filter((o) => o.paymentMethod === "Nequi")
      .reduce((sum, o) => sum + o.total, 0);

    const summary = await prisma.dailySummary.create({
      data: {
        date: today,
        totalIngresos,
        totalOrdenes,
        totalPlatos,
        efectivo,
        datafono,
        nequi,
        restaurantId,
      },
    });

    await prisma.order.updateMany({
      where: {
        restaurantId,
        status: "CERRADA",
        createdAt: { gte: today, lt: tomorrow },
      },
      data: { status: "ARCHIVADA" },
    })

    return res.status(201).json({ message: "Día cerrado correctamente.", summary });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al cerrar el día." });
  }
};

// GET /api/daily-summary/:restaurantId
export const getDailySummaries = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string

    const summaries = await prisma.dailySummary.findMany({
      where: { restaurantId },
      orderBy: { date: "desc" },
    });

    return res.status(200).json(summaries);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener los resúmenes." });
  }
};

// DELETE /api/daily-summary/:restaurantId
export const clearSummaries = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string

    await prisma.dailySummary.deleteMany({ where: { restaurantId } });

    return res.status(200).json({ message: "Resúmenes eliminados correctamente." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al limpiar los resúmenes." });
  }
};

// GET /api/daily-summary/chart/:restaurantId
export const getSummaryChart = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string
    const period = (req.query.period as string) || "week"

    const startDate = getColombiaToday()

    if (period === "month") {
      startDate.setDate(startDate.getDate() - 29)
    } else {
      startDate.setDate(startDate.getDate() - 6)
    }

    const summaries = await prisma.dailySummary.findMany({
      where: {
        restaurantId,
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    })

    const data = summaries.map((item) => {
      // Extraemos DD/MM directo del ISO string sin pasar por Date ni toLocaleDateString
      const iso = item.date.toISOString() // "2026-03-31T00:00:00.000Z"
      const [year, month, day] = iso.slice(0, 10).split("-")
      const formattedDay = `${day}/${month}` // "31/03"

      return {
        date: iso.slice(0, 10),
        day: formattedDay,
        pedidos: item.totalOrdenes,
        ingresos: item.totalIngresos,
        platos: item.totalPlatos,
        efectivo: item.efectivo,
        datafono: item.datafono,
        nequi: item.nequi,
      }
    })

    return res.status(200).json(data)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al obtener la gráfica del resumen" })
  }
}