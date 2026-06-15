'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Archive, Bell, Users, Lightbulb, BookOpen, RefreshCw, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { MemoryRow } from '@/lib/db/types'

type Memory = MemoryRow

const TYPE_CONFIG = {
  all: { label: 'All', icon: Archive, color: 'text-foreground' },
  note: { label: 'Notes', icon: BookOpen, color: 'text-blue-400' },
  reminder: { label: 'Reminders', icon: Bell, color: 'text-amber-400' },
  person: { label: 'People', icon: Users, color: 'text-green-400' },
  habit: { label: 'Habits', icon: RefreshCw, color: 'text-purple-400' },
  decision: { label: 'Decisions', icon: Tag, color: 'text-pink-400' },
  insight: { label: 'Insights', icon: Lightbulb, color: 'text-yellow-400' },
} as const

const IMPORTANCE_LABELS = ['', 'Low', 'Low', 'Medium', 'High', 'Critical']
const IMPORTANCE_COLORS = ['', 'text-muted-foreground', 'text-muted-foreground', 'text-blue-400', 'text-amber-400', 'text-red-400']

async function fetchMemories(type?: string): Promise<Memory[]> {
  const params = new URLSearchParams({ limit: '50' })
  if (type && type !== 'all') params.set('type', type)
  const res = await fetch(`/api/memories?${params}`)
  if (!res.ok) throw new Error('Failed to fetch memories')
  const data = await res.json()
  return data.memories
}

function MemoryCard({ memory }: { memory: Memory }) {
  const typeConfig = TYPE_CONFIG[memory.type] ?? TYPE_CONFIG.note
  const Icon = typeConfig.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group p-4 rounded-xl border border-border bg-card hover:bg-card/80 hover:border-primary/20 transition-all cursor-default"
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex-shrink-0', typeConfig.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-relaxed">
            {memory.ai_summary ?? memory.raw_input}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {memory.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {tag}
              </Badge>
            ))}
            {memory.remind_at && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-amber-400 border-amber-500/20">
                <Bell className="h-2.5 w-2.5 mr-1" />
                {new Date(memory.remind_at).toLocaleDateString()}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {new Date(memory.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {memory.importance >= 4 && (
              <span className={cn('text-[10px] font-medium', IMPORTANCE_COLORS[memory.importance])}>
                {IMPORTANCE_LABELS[memory.importance]}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function MemoriesPage() {
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['memories', activeTab],
    queryFn: () => fetchMemories(activeTab),
  })

  const filtered = memories.filter((m) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      m.ai_summary?.toLowerCase().includes(q) ||
      m.raw_input.toLowerCase().includes(q) ||
      m.tags.some((t) => t.includes(q))
    )
  })

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <h1 className="font-semibold text-lg">Memories</h1>
        <p className="text-xs text-muted-foreground">Everything I remember about your life</p>
      </div>

      <div className="px-6 py-3 border-b border-border flex-shrink-0 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            className="pl-9 h-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8 bg-muted/50">
            {Object.entries(TYPE_CONFIG).map(([key, { label }]) => (
              <TabsTrigger key={key} value={key} className="text-xs px-2 h-6">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Archive className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No memories match your search' : 'No memories yet. Start chatting!'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {filtered.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </ScrollArea>
    </div>
  )
}
