import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'

async function getConfig() {
  return prisma.tbl_notification_config.findUnique({ where: { config_id: 1 } })
}

/**
 * Sends an email if enabled and configured. Never throws — a
 * notification failure should never break the order-status update it's
 * attached to. Logs the real error to the console so it's still
 * diagnosable, same as everywhere else in this app.
 */
export async function sendStatusEmail(to: string, subject: string, body: string): Promise<{ sent: boolean; error?: string }> {
  try {
    const config = await getConfig()
    if (!config?.notify_email_enabled) return { sent: false, error: 'Email notifications are turned off' }
    if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
      return { sent: false, error: 'SMTP is not fully configured — set it up in Settings → Notification Settings' }
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port || 587,
      secure: config.smtp_secure,
      auth: { user: config.smtp_user, pass: config.smtp_password },
    })

    await transporter.sendMail({
      from: `"${config.smtp_from_name || 'Invexa'}" <${config.smtp_from_email || config.smtp_user}>`,
      to,
      subject,
      text: body,
    })

    return { sent: true }
  } catch (error: any) {
    console.error('Failed to send status email:', error)
    return { sent: false, error: error?.message || String(error) }
  }
}

/**
 * Sends a WhatsApp message via a generic webhook-style POST — works with
 * any provider (Twilio, Meta Cloud API, etc.) that accepts a bearer token
 * and a JSON body of { to, message }. If a specific provider needs a
 * different request shape, this is the one place to adjust it.
 */
export async function sendStatusWhatsApp(to: string, message: string): Promise<{ sent: boolean; error?: string }> {
  try {
    const config = await getConfig()
    if (!config?.notify_whatsapp_enabled) return { sent: false, error: 'WhatsApp notifications are turned off' }
    if (!config.whatsapp_api_url || !config.whatsapp_api_token) {
      return { sent: false, error: 'WhatsApp API is not configured — set it up in Settings → Notification Settings' }
    }

    const res = await fetch(config.whatsapp_api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.whatsapp_api_token}`,
      },
      body: JSON.stringify({ to, message }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { sent: false, error: `WhatsApp API returned ${res.status}: ${text}` }
    }

    return { sent: true }
  } catch (error: any) {
    console.error('Failed to send WhatsApp message:', error)
    return { sent: false, error: error?.message || String(error) }
  }
}

/** Fires both email and WhatsApp (whichever are enabled) for a tailor order status change. Never throws. */
export async function notifyTailorStatusChange(params: {
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  orderNumber: string
  statusLabel: string
}) {
  const subject = `Your order ${params.orderNumber} is now ${params.statusLabel}`
  const message = `Hi ${params.customerName}, your tailor order ${params.orderNumber} status has been updated to: ${params.statusLabel}.`

  const results: { channel: string; sent: boolean; error?: string }[] = []

  if (params.customerEmail) {
    const r = await sendStatusEmail(params.customerEmail, subject, message)
    results.push({ channel: 'email', ...r })
  }
  if (params.customerPhone) {
    const r = await sendStatusWhatsApp(params.customerPhone, message)
    results.push({ channel: 'whatsapp', ...r })
  }

  return results
}
