'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { MobileSidebar } from '@/components/layout/sidebar'

export function Topbar() {
  const router = useRouter()
  const { data: user } = useAuth()

  const handleLogout = async () => {
    await fetch('/api/session', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  const displayName = user ? `${user.nom}${user.prenom ? ' ' + user.prenom : ''}` : '...'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      {/* Bouton hamburger — masqué sur desktop (géré en interne par MobileSidebar) */}
      <MobileSidebar />

      <div className="flex items-center gap-3">
        <span className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="size-4" />
          {displayName}
        </span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </Button>
      </div>
    </header>
  )
}
