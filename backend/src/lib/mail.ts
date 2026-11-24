import { env } from "./env"

// Brevo por HTTP (no SMTP: Render bloquea los puertos SMTP en el plan gratis). Sin las variables
// configuradas, el correo simplemente no se manda; se avisa una sola vez en el arranque, no en cada envío.
const configured = Boolean(env.brevoApiKey && env.brevoSenderEmail)
if (!configured) {
  console.warn("BREVO_API_KEY/BREVO_SENDER_EMAIL no están configuradas: el correo del cierre del día no se enviará.")
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
  if (!configured) return { sent: false, error: "BREVO_API_KEY/BREVO_SENDER_EMAIL no configuradas" }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.brevoApiKey as string,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "RestaurantOS", email: env.brevoSenderEmail },
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
        attachment: input.attachments?.map(a => ({ name: a.filename, content: a.content.toString("base64") })),
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return { sent: false, error: `Brevo ${res.status}: ${body.slice(0, 300)}` }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) }
  }
}
