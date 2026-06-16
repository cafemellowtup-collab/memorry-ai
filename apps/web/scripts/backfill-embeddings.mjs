// One-time maintenance script: backfill NULL embeddings on existing memories.
// Run with: node scripts/backfill-embeddings.mjs
// Safe to re-run — only touches rows where embedding IS NULL.

import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const envPath = resolve(import.meta.dirname, '..', '.env.local')
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const GOOGLE_KEY = env.GOOGLE_AI_API_KEY

async function embed(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GOOGLE_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    },
  )
  if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.embedding.values
}

async function main() {
  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/memories?select=id,ai_summary,raw_input&embedding=is.null`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  )
  const rows = await listRes.json()
  console.log(`Found ${rows.length} memories with NULL embedding.`)

  let fixed = 0
  let failed = 0
  for (const row of rows) {
    const text = row.ai_summary || row.raw_input
    if (!text) {
      console.log(`Skipping ${row.id} — no summary or raw_input`)
      continue
    }
    try {
      const vector = await embed(text)
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/memories?id=eq.${row.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ embedding: JSON.stringify(vector) }),
      })
      if (!patchRes.ok) throw new Error(`Patch failed: ${patchRes.status} ${await patchRes.text()}`)
      console.log(`Fixed: ${row.id} — "${text.slice(0, 60)}"`)
      fixed++
    } catch (err) {
      console.error(`Failed: ${row.id} —`, err.message)
      failed++
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Failed: ${failed}`)
}

main()
