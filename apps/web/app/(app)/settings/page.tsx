'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Moon, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createSupabaseBrowser } from '@/lib/db/supabase-browser'
import { PushToggle } from '@/components/notifications/push-toggle'

export default function SettingsPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <h1 className="font-semibold text-lg">Settings</h1>
        <p className="text-xs text-muted-foreground">Manage your preferences and account</p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-lg space-y-4">
          <PushToggle />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Moon className="h-4 w-4" /> Appearance
              </CardTitle>
              <CardDescription className="text-xs">Dark mode is enabled by default for the best experience</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" /> Integrations
              </CardTitle>
              <CardDescription className="text-xs">Coming soon: Google Calendar, Telegram bot, WhatsApp</CardDescription>
            </CardHeader>
          </Card>

          <Separator />

          <Card className="border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-destructive">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
