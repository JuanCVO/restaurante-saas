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
  isProd: process.env.NODE_ENV === "production",
}
