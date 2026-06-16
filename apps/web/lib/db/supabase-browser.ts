import { createBrowserClient } from '@supabase/ssr'

// Using untyped clients until `supabase gen types` runs against the real database.
// Row/Insert/Update types are defined in lib/db/types.ts and used directly in queries.

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
