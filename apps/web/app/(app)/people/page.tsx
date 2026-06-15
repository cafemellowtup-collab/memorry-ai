'use client'

import { useQuery } from '@tanstack/react-query'
import { Users, User, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { EntityRow } from '@/lib/db/types'

async function fetchPeople(): Promise<EntityRow[]> {
  const res = await fetch('/api/entities?type=person')
  if (!res.ok) throw new Error('Failed to fetch')
  const data = await res.json()
  return data.entities
}

export default function PeoplePage() {
  const { data: people = [], isLoading } = useQuery({
    queryKey: ['entities', 'person'],
    queryFn: fetchPeople,
  })

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <h1 className="font-semibold text-lg">People</h1>
        <p className="text-xs text-muted-foreground">Everyone you've mentioned</p>
      </div>

      <ScrollArea className="flex-1 px-6 py-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : people.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No people tracked yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try: "My friend Sarah is a product manager at Google"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {people.map((person, i) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{person.name}</p>
                    {person.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{person.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{person.memory_count} memories</span>
                      {person.attributes && Object.keys(person.attributes).length > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                          {Object.keys(person.attributes)[0]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
