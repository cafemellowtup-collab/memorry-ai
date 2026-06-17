import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/db/supabase-server'
import { upsertPushSubscription, deletePushSubscriptionByEndpoint } from '@/lib/db/queries/notifications'
import { PushSubscriptionSchema, UnsubscribeSchema } from '@/lib/validation/schemas'
import { unauthorized, handleApiError } from '@/lib/utils/errors'

// Register this device for Web Push.
export async function POST(request: NextRequest) {
  try {
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    const parsed = PushSubscriptionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    await upsertPushSubscription(db, {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

// Remove this device (user turned notifications off here).
export async function DELETE(request: NextRequest) {
  try {
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    const parsed = UnsubscribeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    await deletePushSubscriptionByEndpoint(db, user.id, parsed.data.endpoint)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
