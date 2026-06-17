-- MemoryAI Reminder Cron (Supabase pg_cron path)
-- Migration 004: schedule the reminder-delivery route to run every minute.
--
-- WHY THIS EXISTS (read before running):
--   Vercel's Hobby plan silently ignores cron schedules faster than once per day, so
--   apps/web/vercel.json's "*/5" only runs on Vercel Pro. This pg_cron job calls the
--   same route directly from your database and works on ANY hosting plan.
--
-- BEFORE RUNNING, replace the two placeholders below:
--   1. <YOUR_DEPLOYED_URL>  -> your live app origin, e.g. https://memoryai.vercel.app
--   2. <YOUR_CRON_SECRET>   -> the exact CRON_SECRET value from your env (must match)
-- pg_cron + pg_net are already enabled in migration 001. Run this only AFTER deploying;
-- it cannot reach http://localhost. For local testing use `npm run cron:test` instead.

select cron.schedule(
  'deliver-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url     := '<YOUR_DEPLOYED_URL>/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <YOUR_CRON_SECRET>',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- To change the schedule later: select cron.unschedule('deliver-reminders'); then re-run.
