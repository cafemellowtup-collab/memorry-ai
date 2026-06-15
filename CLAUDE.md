# MemoryAI — Claude Code Context

Read this at the start of every session. It eliminates re-discovery and keeps vibe coding efficient.

## What This Is
A world-class personal AI memory platform. Users talk to it → it remembers facts, sets reminders, learns their life, helps with decisions. Better than Memorae.ai in every dimension.

## Stack (Quick Reference)
| Need | Use |
|------|-----|
| Database + Auth | Supabase — `lib/db/supabase.ts` |
| AI calls | Gemini 2.5 Flash via Vercel AI SDK — `lib/ai/client.ts` (ONLY entry point) |
| AI prompts | `lib/ai/prompts/` — NEVER inline prompt strings |
| Input validation | Zod — schemas in `lib/validation/schemas.ts` |
| UI Components | shadcn/ui — add with `npx shadcn@latest add [name]` |
| Styling | Tailwind CSS v4 |
| State | Zustand (add when needed) |
| Data fetching | TanStack Query v5 |
| Rate limiting | Upstash Redis — `lib/utils/rate-limit.ts` |
| Errors | `lib/utils/errors.ts` |

## Next.js 16 Rules (CRITICAL — Breaking Changes)
- `cookies()`, `headers()`, `params`, `searchParams` **must be awaited** — always async
- Auth guard file is `proxy.ts` (NOT `middleware.ts`) — export `proxy` function
- `next lint` is removed — use `eslint .` directly
- Turbopack is default for both `dev` and `build`

## Non-Negotiable Code Rules
1. **TypeScript strict** — no `any`, no type assertions without explanatory comment
2. **Zod on every API route** — validate `request.json()` before touching it
3. **RLS handles DB auth** — Supabase RLS policies ensure users see only their data. Never add manual `WHERE user_id = X` filters in queries — the DB layer handles it
4. **AI via client.ts only** — never import `@ai-sdk/google` directly in API routes
5. **Prompts via prompts/ only** — never build prompt strings inline
6. **Secrets in env vars** — never hardcode keys, never commit `.env.local`
7. **DB changes = new SQL migration** — `supabase/migrations/NNN_name.sql`. Never edit the DB manually

## Project Structure
```
apps/web/
├── app/
│   ├── (auth)/login        ← Login page
│   ├── (auth)/signup       ← Signup page
│   ├── (app)/chat          ← Main chat UI (MVP)
│   ├── (app)/memories      ← Memory dashboard
│   ├── (app)/reminders     ← Upcoming reminders
│   ├── (app)/people        ← Entity/people graph
│   ├── (app)/insights      ← Patterns & analytics
│   ├── (app)/settings      ← User preferences
│   └── api/
│       ├── chat/           ← Streaming chat + memory extraction
│       ├── memories/       ← CRUD + list
│       ├── search/         ← pgvector semantic search
│       └── cron/reminders/ ← Reminder delivery (called by Supabase cron)
├── lib/
│   ├── ai/client.ts        ← Provider-agnostic AI — models.fast / models.smart / models.embed
│   ├── ai/memory-extraction.ts ← Extract structured memory from user input
│   ├── ai/embeddings.ts    ← Generate vector embeddings
│   ├── ai/prompts/         ← All prompt templates as exported functions
│   ├── db/supabase.ts      ← createSupabaseBrowser / createSupabaseServer / createSupabaseAdmin
│   ├── db/types.ts         ← Database type definitions
│   ├── db/queries/         ← Typed query functions
│   ├── validation/schemas.ts ← All Zod schemas
│   └── utils/
│       ├── rate-limit.ts   ← checkRateLimit(identifier)
│       └── errors.ts       ← AppError, handleApiError, unauthorized, rateLimited
└── components/
    ├── ui/                 ← shadcn/ui (auto-generated, don't edit manually)
    ├── chat/               ← Chat-specific components
    ├── memories/           ← Memory card, timeline, etc.
    └── layout/             ← Sidebar, nav, header
```

## Current Phase
**Phase 1 — MVP**: Foundation complete (auth, DB schema, AI client, chat UI, memories UI)

## Next Tasks (pick one per session)
1. Auth pages (login/signup with Supabase Auth)
2. Semantic search API route + search bar
3. Reminder delivery (cron API route + email via Resend)
4. TanStack Query provider wrapper
5. Reminders page
6. Settings page with Google Auth

## Services Setup (Do This Before First Run)
1. supabase.com → create project → run `supabase/migrations/001_initial_schema.sql` in SQL editor
2. aistudio.google.com → get Gemini API key
3. Copy `.env.example` to `apps/web/.env.local` → fill in values
4. Run `npm run dev` from `apps/web/`

## Feature Build Protocol (Follow Every Time)
1. Define/extend Zod schema in `lib/validation/schemas.ts`
2. Write DB query function in `lib/db/queries/`
3. Write API route in `app/api/` (validate with Zod, call query)
4. Write UI component in `components/`
5. Connect component to page in `app/(app)/`
6. Test in browser
7. `git commit`
