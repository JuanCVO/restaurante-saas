-- Datafono vuelve como método de pago aparte, distinto de Bancolombia (tarjeta física vs. transferencia/QR)
ALTER TABLE "DailySummary" ADD COLUMN     "datafono" DOUBLE PRECISION NOT NULL DEFAULT 0;
