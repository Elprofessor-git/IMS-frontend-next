'use client'

import { useRouter } from 'next/navigation'
import { LogOut, ChevronDown, Shirt } from 'lucide-react'
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
  const initials = user
    ? `${user.nom?.[0] ?? ''}${user.prenom?.[0] ?? ''}`.toUpperCase() || '?'
    : '…'

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 bg-header px-3 text-header-foreground shadow-md sm:px-4">
      {/* Zone gauche : hamburger + marque / titre */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileSidebar />
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/15">
            <Shirt className="size-4.5 text-white" />
          </span>
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-[15px] font-semibold text-white sm:text-base">
              Système de Gestion Textile
            </h1>
            <p className="hidden text-xs text-white/70 sm:block">IMS · Production &amp; Stock</p>
          </div>
        </div>
      </div>

      {/* Zone droite : compte utilisateur + déconnexion */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div
          className="flex items-center gap-2 rounded-full bg-white/15 py-1 pl-1 pr-2.5 transition-colors hover:bg-white/20"
          title="Compte utilisateur"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-sm font-semibold text-header">
            {initials}
          </span>
          <span className="max-w-[140px] truncate text-sm font-medium text-white sm:max-w-[180px]">
            {displayName}
          </span>
          <ChevronDown className="size-4 shrink-0 text-white/80" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-white hover:bg-white/15 hover:text-white"
        >
          <LogOut className="size-4" />
          <span className="hidden lg:inline">Déconnexion</span>
        </Button>
      </div>
    </header>
  )
}