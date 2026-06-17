// Email channel — sends via Resend's REST API using fetch (no SDK dependency).
// Fully wired but inert until RESEND_API_KEY + RESEND_FROM_EMAIL are set: with either
// missing, sendEmail no-ops and returns false (same "configured? act : skip" pattern as
// the rate-limiter). The dispatcher gates the call on the same env vars.

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    })
    if (!res.ok) {
      console.error('Resend email failed:', res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error('Resend email error:', err)
    return false
  }
}
