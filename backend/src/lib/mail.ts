import nodemailer from "nodemailer"
import { env } from "./env"

// Sin GMAIL_USER/GMAIL_APP_PASSWORD el correo simplemente no se manda; se avisa una sola vez en el arranque,
// no en cada envío. La contraseña es una "contraseña de aplicación" de Google, no la contraseña normal de la cuenta.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null
if (env.gmailUser && env.gmailAppPassword) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.gmailUser, pass: env.gmailAppPassword },
  })
} else {
  console.warn("GMAIL_USER/GMAIL_APP_PASSWORD no están configuradas: el correo del cierre del día no se enviará.")
}

export type MailAttachment = { filename: string; content: Buffer }

export type SendMailInput = {
  to: string
  subject: string
  html: string
  attachments?: MailAttachment[]
}

// No lanza: quien llama decide qué hacer si no hay correo (normalmente, nada: el cierre ya quedó hecho)
export const sendMail = async (input: SendMailInput): Promise<{ sent: boolean; error?: string }> => {
  if (!transporter) return { sent: false, error: "GMAIL_USER/GMAIL_APP_PASSWORD no configuradas" }

  try {
    await transporter.sendMail({
      from: `RestaurantOS <${env.gmailUser}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
    })
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) }
  }
}
