'use client'

import { useQuery } from '@tanstack/react-query'
import { Bell, BellOff, Clock, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { MemoryRow } from '@/lib/db/types'

type Memory = MemoryRow

async function fetchReminders(): Promise<Memory[]> {
  const res = await fetch('/api/memories?type=reminder&limit=50')
  if (!res.ok) throw new Error('Failed to fetch')
  const data = await res.json()
  return data.memories
}

const REPEAT_LABELS: Record<string, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
}

export default function RemindersPage() {
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: fetchReminders,
  })

  const upcoming = reminders.filter(r => r.remind_at && new Date(r.remind_at) >= new Date())
  const past = reminders.filter(r => r.remind_at && new Date(r.remind_at) < new Date())

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <h1 className="font-semibold text-lg">Reminders</h1>
        <p className="text-xs text-muted-foreground">Upcoming and past reminders</p>
      </div>

      <ScrollArea className="flex-1 px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BellOff className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No reminders yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try: "Remind me to take medicine every day at 8am"
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h2>
                <div className="space-y-2">
                  {upcoming.map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5"
                    >
                      <Bell className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{r.ai_summary ?? r.raw_input}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.remind_at!).toLocaleString()}
                          </span>
                          {r.remind_repeat && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                              <RefreshCw className="h-2.5 w-2.5" />
                              {REPEAT_LABELS[r.remind_repeat]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past</h2>
                <div className="space-y-2 opacity-60">
                  {past.slice(0, 10).map((r) => (
                    <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                      <Bell className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm line-through text-muted-foreground">{r.ai_summary ?? r.raw_input}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(r.remind_at!).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
