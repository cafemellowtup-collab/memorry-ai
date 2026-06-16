import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/db/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const db = await createSupabaseServer()
    const { error } = await db.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/chat`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
