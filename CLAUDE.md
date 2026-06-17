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
**Phase 2 — Notifications shipped**: MVP complete (auth, search, reminders, settings, insights, people) plus a full notification system — cron delivery engine, recurring-reminder rollover, in-app notification feed (bell), and Web Push to installed PWA on phone/PC. Email + Telegram are wired as channels, off until their keys are set.

## Setup needed to activate notifications
1. Run `supabase/migrations/003_notifications_and_push.sql` in the Supabase SQL editor (adds `notifications` + `push_subscriptions` tables). **Until this runs, reminder delivery fails on the missing table.**
2. After deploying, run `supabase/migrations/004_schedule_reminder_cron.sql` (fill in the URL + CRON_SECRET placeholders) so reminders fire on any hosting plan. Locally, use `npm run cron:test`.
3. VAPID push keys are already generated in `.env.local`. Optional later: set `RESEND_*` for email, `TELEGRAM_BOT_TOKEN` for Telegram.

## Next Tasks (pick one per session)
1. Make reminders interactive (snooze / complete / delete on the Reminders page)
2. Daily/weekly digest notification (type 'digest' already supported)
3. Telegram capture + link flow (finish the scaffolded channel)
4. Markdown rendering + in-chat memory citations

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
