import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/db/supabase-server'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/db/queries/notifications'
import { MarkReadSchema } from '@/lib/validation/schemas'
import { unauthorized, handleApiError } from '@/lib/utils/errors'

// List the user's notification feed + unread badge count.
export async function GET(request: NextRequest) {
  try {
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    const params = request.nextUrl.searchParams
    const unreadOnly = params.get('unread') === '1'
    const limitRaw = Number(params.get('limit') ?? 20)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20

    const [notifications, unread] = await Promise.all([
      getNotifications(db, user.id, { unreadOnly, limit }),
      getUnreadNotificationCount(db, user.id),
    ])

    return NextResponse.json({ notifications, unread })
  } catch (error) {
    return handleApiError(error)
  }
}

// Mark one notification read (body { id }) or all of them (empty body).
export async function PATCH(request: NextRequest) {
  try {
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    const parsed = MarkReadSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    if (parsed.data.id) {
      await markNotificationRead(db, parsed.data.id)
    } else {
      await markAllNotificationsRead(db, user.id)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
