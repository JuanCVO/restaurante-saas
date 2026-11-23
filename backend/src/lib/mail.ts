import { Resend } from "resend"
import { env } from "./env"

// Sin RESEND_API_KEY el correo simplemente no se manda; se avisa una sola vez en el arranque, no en cada envío
let client: Resend | null = null
if (env.resendApiKey) {
  client = new Resend(env.resendApiKey)
} else {
  console.warn("RESEND_API_KEY no está configurada: el correo del cierre del día no se enviará.")
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
  if (!client) return { sent: false, error: "RESEND_API_KEY no configurada" }

  const { error } = await client.emails.send({
    from: env.resendFrom,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
  })

  if (error) return { sent: false, error: error.message }
  return { sent: true }
}
