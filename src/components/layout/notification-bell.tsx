'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getNotificationHref,
  useGetNotificationsData,
  useLivrerNotification,
  useLivrerToutesNotifications,
} from '@/hooks/use-notifications'
import { usePlanningHub } from '@/hooks/use-planning-hub'
import type { NotificationItem } from '@/types/notification'
import { cn } from '@/lib/utils'

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: NotificationItem
  onOpen: (n: NotificationItem) => void
}) {
  const date = notification.dateNotification
    ? new Date(notification.dateNotification).toLocaleDateString('fr-FR')
    : ''
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        'flex w-full items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60',
        notification.estLivree
          ? 'border-border/70'
          : 'border-primary/20 bg-primary/[0.04]',
      )}
    >
      {!notification.estLivree && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
      )}
      <span className="min-w-0">
        <span className="block text-sm font-medium">{notification.message}</span>
        {date && <span className="mt-0.5 block text-xs text-muted-foreground/80">{date}</span>}
      </span>
    </button>
  )
}

export function NotificationBell() {
  // Hub SignalR désactivé par défaut (feature flag) : le polling gère le temps réel.
  usePlanningHub(true)

  const router = useRouter()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { notifications, countNonLivrees, isLoading } = useGetNotificationsData()
  const livrer = useLivrerNotification()
  const livrerToutes = useLivrerToutesNotifications()

  // Fermeture au clic extérieur + touche Échap (comportement dropdown standard).
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleOpenNotification = (n: NotificationItem) => {
    // 1. Marquer comme lue — BEST EFFORT : la navigation ne doit JAMAIS attendre
    // la réponse du serveur. L'invalidation du cache met à jour la pastille/le dot.
    if (!n.estLivree) livrer.mutate(n.id)
    // 2. Fermer le panneau, 3. naviguer vers la cible de la notification.
    setOpen(false)
    router.push(getNotificationHref(n))
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="relative text-white hover:bg-white/15 hover:text-white"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="size-5" />
        {countNonLivrees > 0 && (
          <span className="absolute top-0.5 right-0.5 grid min-w-4 h-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {countNonLivrees}
          </span>
        )}
      </Button>

      {open && (
        // Mobile : panneau en bas, pleine largeur (jamais plus haut que l'écran).
        // ≥ sm : dropdown ancré sous la cloche, largeur fixe 384px, hauteur max 70vh
        // avec défilement interne.
        <div
          data-testid="notification-panel"
          className="fixed inset-x-0 bottom-0 z-50 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
        >
          <div className="overflow-hidden rounded-t-xl border bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 sm:rounded-xl">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Notifications</p>
                <p className="truncate text-xs text-muted-foreground">
                  Modifications du planning de production.
                </p>
              </div>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground"
                  disabled={countNonLivrees === 0 || livrerToutes.isPending}
                  onClick={() => livrerToutes.mutate()}
                >
                  <CheckCheck className="size-4" />
                  Tout marquer lu
                </Button>
              )}
            </div>

            <div
              data-testid="notification-list"
              className="max-h-[calc(70vh-4.25rem)] space-y-2 overflow-y-auto p-3"
            >
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}

              {!isLoading && notifications.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Inbox className="size-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Aucune notification.</p>
                </div>
              )}

              {notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} onOpen={handleOpenNotification} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}