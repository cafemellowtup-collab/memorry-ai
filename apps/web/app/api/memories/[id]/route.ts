import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/db/supabase-server'
import { getMemoryById, updateMemory, deleteMemory } from '@/lib/db/queries/memories'
import { UpdateMemorySchema } from '@/lib/validation/schemas'
import { unauthorized, handleApiError } from '@/lib/utils/errors'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    const memory = await getMemoryById(db, id)
    if (!memory) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ memory })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    const body = await req.json()
    const parsed = UpdateMemorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const memory = await updateMemory(db, id, parsed.data)
    return NextResponse.json({ memory })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    await deleteMemory(db, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
