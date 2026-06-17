'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Archive,
  Bell,
  Users,
  BarChart3,
  Settings,
  Brain,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { NotificationBell } from '@/components/notifications/notification-bell'

const navItems = [
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/memories', icon: Archive, label: 'Memories' },
  { href: '/reminders', icon: Bell, label: 'Reminders' },
  { href: '/people', icon: Users, label: 'People' },
  { href: '/insights', icon: BarChart3, label: 'Insights' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

function NavItem({ href, icon: Icon, label, collapsed = false }: {
  href: string
  icon: typeof MessageSquare
  label: string
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
              'text-sm font-medium',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-2',
            )}
          />
        }
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
        {isActive && !collapsed && (
          <motion.div
            layoutId="nav-indicator"
            className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
          />
        )}
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  )
}

function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r border-border bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      <div className={cn('flex items-center gap-2 p-4 border-b border-border', collapsed && 'flex-col gap-3 p-3')}>
        <Brain className="h-6 w-6 text-primary flex-shrink-0" />
        {!collapsed && <span className="font-bold text-base tracking-tight">MemoryAI</span>}
        <div className={cn(!collapsed && 'ml-auto')}>
          <NotificationBell />
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>

      <div className={cn('p-3 border-t border-border', collapsed && 'flex justify-center')}>
        <div className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50',
          collapsed && 'px-1 w-8 h-8 justify-center',
        )}>
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">M</span>
          </div>
          {!collapsed && (
            <div className="text-xs">
              <p className="font-medium text-foreground">You</p>
              <p className="text-muted-foreground">Free plan</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-full relative">
        <Sidebar collapsed={collapsed} />
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-16 w-6 h-6 rounded-full border border-border bg-background shadow-sm z-10"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Menu className="h-3 w-3" /> : <X className="h-3 w-3" />}
        </Button>
      </div>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-bold text-sm">MemoryAI</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-56">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col md:pt-0 pt-14">
        {children}
      </main>
    </div>
  )
}
