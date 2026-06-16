'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, Brain, Zap, Archive, Clock, Scale } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MemoryRow } from '@/lib/db/types'

async function fetchRecentMemories(): Promise<MemoryRow[]> {
  const res = await fetch('/api/memories?limit=50')
  if (!res.ok) throw new Error('Failed to fetch')
  const data = await res.json()
  return data.memories
}

function countByType(memories: MemoryRow[]) {
  const counts: Record<string, number> = {}
  for (const m of memories) {
    counts[m.type] = (counts[m.type] ?? 0) + 1
  }
  return counts
}

function getTopTags(memories: MemoryRow[], n = 8): [string, number][] {
  const counts: Record<string, number> = {}
  for (const m of memories) {
    for (const tag of m.tags ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n)
}

const TYPE_COLORS: Record<string, string> = {
  note: 'bg-blue-500/10 text-blue-400',
  reminder: 'bg-amber-500/10 text-amber-400',
  person: 'bg-green-500/10 text-green-400',
  habit: 'bg-purple-500/10 text-purple-400',
  decision: 'bg-red-500/10 text-red-400',
  insight: 'bg-cyan-500/10 text-cyan-400',
}

const IMPORTANCE_LABELS = ['', 'Low', 'Low', 'Medium', 'High', 'Critical']
const IMPORTANCE_COLORS = ['', 'text-muted-foreground', 'text-muted-foreground', 'text-blue-400', 'text-amber-400', 'text-red-400']

export default function InsightsPage() {
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['memories', 'insights'],
    queryFn: fetchRecentMemories,
  })

  const typeCounts = countByType(memories)
  const topTags = getTopTags(memories)
  const avgImportance = memories.length
    ? (memories.reduce((s, m) => s + (m.importance ?? 3), 0) / memories.length).toFixed(1)
    : '—'
  const withReminders = memories.filter(m => m.remind_at).length
  const thisWeek = memories.filter(m => {
    const d = new Date(m.created_at)
    return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000
  }).length

  const decisions = memories
    .filter(m => m.type === 'decision')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const avgDecisionImportance = decisions.length
    ? decisions.reduce((s, m) => s + (m.importance ?? 3), 0) / decisions.length
    : 0
  const highStakesDecisions = decisions.filter(m => m.importance >= 4).length

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="font-semibold text-lg">Insights</h1>
        </div>
        <div className="flex-1 px-6 py-4 grid grid-cols-2 gap-3 content-start">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse col-span-1" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <h1 className="font-semibold text-lg">Insights</h1>
        <p className="text-xs text-muted-foreground">Patterns and stats from your memory</p>
      </div>

      <ScrollArea className="flex-1 px-6 py-4">
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No insights yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start adding memories in chat — insights appear after a few entries.
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total memories', value: memories.length, icon: Brain, color: 'text-primary' },
                { label: 'This week', value: thisWeek, icon: TrendingUp, color: 'text-green-400' },
                { label: 'With reminders', value: withReminders, icon: Clock, color: 'text-amber-400' },
                { label: 'Avg importance', value: avgImportance, icon: Zap, color: 'text-purple-400' },
              ].map(({ label, value, icon: Icon, color }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <Icon className={`h-4 w-4 ${color} mb-2`} />
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Memory types breakdown */}
            {Object.keys(typeCounts).length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    Memory types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {Object.entries(typeCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => {
                        const pct = Math.round((count / memories.length) * 100)
                        return (
                          <div key={type} className="flex items-center gap-3">
                            <Badge
                              variant="secondary"
                              className={`text-xs w-20 justify-center ${TYPE_COLORS[type] ?? ''}`}
                            >
                              {type}
                            </Badge>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-primary/60 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Decision patterns */}
            {decisions.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    Decision patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                    <span>{decisions.length} decision{decisions.length !== 1 ? 's' : ''} made</span>
                    <span>·</span>
                    <span>Avg importance {avgDecisionImportance.toFixed(1)}/5</span>
                    {highStakesDecisions > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-amber-400">{highStakesDecisions} high-stakes</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    {decisions.slice(0, 5).map((d) => (
                      <div key={d.id} className="flex items-start gap-2.5 text-sm">
                        <span className="text-muted-foreground text-xs w-16 flex-shrink-0 mt-0.5">
                          {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <p className="flex-1 leading-relaxed">{d.ai_summary ?? d.raw_input}</p>
                        {d.importance >= 4 && (
                          <span className={cn('text-[10px] font-medium flex-shrink-0', IMPORTANCE_COLORS[d.importance])}>
                            {IMPORTANCE_LABELS[d.importance]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {decisions.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-3">
                      +{decisions.length - 5} more — see the Decisions tab on Memories
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Top tags */}
            {topTags.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium">Most common topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {topTags.map(([tag, count]) => (
                      <Badge key={tag} variant="secondary" className="gap-1.5">
                        {tag}
                        <span className="text-muted-foreground font-normal">{count}</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
