'use client'

import { useEffect, useState } from 'react'
import { BellRing, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

// VAPID keys are base64url; the Push API needs the raw bytes as a Uint8Array.
function urlBase64ToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  // Back the array with an explicit ArrayBuffer so it satisfies BufferSource (the Push API's
  // applicationServerKey type) under TS's generic typed-array lib.
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

type PushState = 'loading' | 'unsupported' | 'denied' | 'enabled' | 'disabled'

export function PushToggle() {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)

  // One-shot capability + subscription detection on mount. A single deferred setState keeps
  // this off the synchronous render path (react-hooks/set-state-in-effect) and avoids updates
  // after unmount.
  useEffect(() => {
    let active = true
    const detect = async (): Promise<PushState> => {
      const supported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        Boolean(VAPID_PUBLIC_KEY)
      if (!supported) return 'unsupported'
      if (Notification.permission === 'denied') return 'denied'
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      return sub ? 'enabled' : 'disabled'
    }
    detect().then((next) => {
      if (active) setState(next)
    })
    return () => {
      active = false
    }
  }, [])

  async function enable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'disabled')
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      })
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) throw new Error('Failed to register device')
      setState('enabled')
    } catch (err) {
      console.error('Enable notifications failed:', err)
      setState('disabled')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState('disabled')
    } catch (err) {
      console.error('Disable notifications failed:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BellRing className="h-4 w-4" /> Notifications
        </CardTitle>
        <CardDescription className="text-xs">
          Get reminders as push notifications on this device. Install the app to your home
          screen for the best experience (required on iPhone).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state === 'loading' && (
          <p className="text-xs text-muted-foreground">Checking this device…</p>
        )}
        {state === 'unsupported' && (
          <p className="text-xs text-muted-foreground">
            This browser doesn&apos;t support push notifications.
          </p>
        )}
        {state === 'denied' && (
          <p className="text-xs text-muted-foreground">
            Notifications are blocked. Enable them for this site in your browser settings, then
            reload.
          </p>
        )}
        {state === 'disabled' && (
          <Button size="sm" className="gap-2" onClick={enable} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
            Enable notifications
          </Button>
        )}
        {state === 'enabled' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-primary font-medium">Enabled on this device</span>
            <Button size="sm" variant="outline" onClick={disable} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Turn off'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
