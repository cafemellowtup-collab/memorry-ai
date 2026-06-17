'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type NotificationItem = {
  id: string
  title: string
  body: string | null
  url: string | null
  read_at: string | null
  created_at: string
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationBell() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Register the SW so a device that previously subscribed keeps receiving pushes.
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=15')
      if (!res.ok) throw new Error('Failed to load notifications')
      return res.json() as Promise<{ notifications: NotificationItem[]; unread: number }>
    },
    refetchInterval: 30000,
  })

  const markRead = useMutation({
    mutationFn: async (id?: string) => {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : {}),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unread = data?.unread ?? 0
  const items = data?.notifications ?? []

  function openItem(n: NotificationItem) {
    if (!n.read_at) markRead.mutate(n.id)
    if (n.url) router.push(n.url)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notifications" />}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => markRead.mutate(undefined)}
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications yet</p>
        ) : (
          <div className="max-h-80 overflow-auto">
            {items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => openItem(n)}
                className={cn('flex flex-col items-start gap-0.5 py-2', !n.read_at && 'bg-primary/5')}
              >
                <div className="flex items-center gap-2 w-full">
                  {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                  <span className="text-sm font-medium flex-1 truncate">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <span className="text-xs text-muted-foreground line-clamp-2 pl-3.5">{n.body}</span>}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
