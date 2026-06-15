import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | null = null

function getRatelimit() {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: false,
    })
  }
  return ratelimit
}

export async function checkRateLimit(identifier: string): Promise<{ success: boolean; remaining: number }> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return { success: true, remaining: 30 }
  }
  const { success, remaining } = await getRatelimit().limit(identifier)
  return { success, remaining }
}
