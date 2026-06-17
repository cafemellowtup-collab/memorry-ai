import type { RemindRepeat } from '@/lib/db/types'

function advance(d: Date, repeat: RemindRepeat): Date {
  const n = new Date(d.getTime())
  switch (repeat) {
    case 'daily':
      n.setUTCDate(n.getUTCDate() + 1)
      break
    case 'weekly':
      n.setUTCDate(n.getUTCDate() + 7)
      break
    case 'monthly':
      // Note: month-end overflow follows JS date math (e.g. Jan 31 -> Mar 3). Fine for v1.
      n.setUTCMonth(n.getUTCMonth() + 1)
      break
    case 'yearly':
      n.setUTCFullYear(n.getUTCFullYear() + 1)
      break
  }
  return n
}

/**
 * Compute the next future occurrence of a recurring reminder.
 *
 * Advances by at least one cadence, then keeps advancing until strictly in the
 * future. This collapses missed cycles (e.g. server downtime) into a single next
 * occurrence instead of replaying a burst of past notifications — the "not annoying"
 * guarantee. Returns an ISO-8601 UTC string.
 */
export function nextOccurrence(
  fromIso: string,
  repeat: RemindRepeat,
  now: Date = new Date(),
): string {
  let next = new Date(fromIso)
  do {
    next = advance(next, repeat)
  } while (next.getTime() <= now.getTime())
  return next.toISOString()
}
