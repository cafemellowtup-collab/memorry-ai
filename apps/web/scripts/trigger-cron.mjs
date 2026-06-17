// Local test helper: fire the reminder cron once against your running dev server.
// Run with:  npm run cron:test   (loads .env.local for CRON_SECRET + APP URL)
// Vercel Cron does NOT run locally, so this is how you verify delivery before deploying.

const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const secret = process.env.CRON_SECRET

if (!secret) {
  console.error('CRON_SECRET is missing. Make sure it is set in apps/web/.env.local')
  process.exit(1)
}

const res = await fetch(`${base}/api/cron/reminders`, {
  method: 'POST',
  headers: { authorization: `Bearer ${secret}` },
})

const text = await res.text()
console.log(`POST ${base}/api/cron/reminders -> ${res.status}`)
console.log(text)
