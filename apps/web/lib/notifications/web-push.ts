import webpush from 'web-push'

let configured = false

function ensureConfigured(): boolean {
  if (configured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@memoryai.app',
    publicKey,
    privateKey,
  )
  configured = true
  return true
}

export type PushResult = { ok: boolean; gone: boolean }

export type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * Send one Web Push message to a single device subscription.
 * `gone: true` signals the push service returned 404/410 (expired/unsubscribed) —
 * the caller MUST prune that subscription row so it isn't retried forever.
 */
export async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<PushResult> {
  if (!ensureConfigured()) return { ok: false, gone: false }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    )
    return { ok: true, gone: false }
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return { ok: false, gone: true }
    console.error('web-push send failed:', status, err)
    return { ok: false, gone: false }
  }
}
