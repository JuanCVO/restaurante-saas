import dotenv from "dotenv"

dotenv.config()

const required = ["JWT_SECRET", "DATABASE_URL"] as const

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Variable de entorno faltante: ${key}`)
  }
}

if ((process.env.JWT_SECRET as string).length < 32) {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres")
}

export const env = {
  jwtSecret: process.env.JWT_SECRET as string,
  databaseUrl: process.env.DATABASE_URL as string,
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  frontendUrl: process.env.FRONTEND_URL,
  // orígenes extra, por ejemplo la IP local para probar desde el celular
  corsOrigins: (process.env.CORS_ORIGINS ?? "").split(",").map(o => o.trim()).filter(Boolean),
  // si no se define, no se borra nada
  archiveRetentionDays: process.env.ARCHIVE_RETENTION_DAYS ? Number(process.env.ARCHIVE_RETENTION_DAYS) : null,
  // Brevo (HTTP, no SMTP: Render bloquea SMTP en el plan gratis). Sin estas dos, el correo del
  // cierre simplemente no se manda (se avisa una vez en el log). brevoSenderEmail debe ser el
  // correo que verificaste como remitente en Brevo.
  brevoApiKey: process.env.BREVO_API_KEY || null,
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || null,
  isProd: process.env.NODE_ENV === "production",
}
