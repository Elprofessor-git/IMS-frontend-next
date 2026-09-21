'use client'

import { useState } from 'react'
import { Bell, CheckCircle2, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useGetNotificationsData,
  useLivrerNotification,
  useLivrerToutesNotifications,
} from '@/hooks/use-notifications'
import { usePlanningHub } from '@/hooks/use-planning-hub'
import type { NotificationItem } from '@/types/notification'

function NotificationRow({
  notification,
  onLivrer,
}: {
  notification: NotificationItem
  onLivrer: (id: number) => void
}) {
  const date = notification.dateNotification
    ? new Date(notification.dateNotification).toLocaleDateString('fr-FR')
    : ''
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium">{notification.message}</p>
        {date && <p className="mt-1 text-xs text-muted-foreground/80">{date}</p>}
      </div>
      {notification.estLivree ? (
        <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600">
          <CheckCircle2 className="size-3.5" />
          Livrée
        </span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onLivrer(notification.id)}
          className="shrink-0"
        >
          Marquer livré
        </Button>
      )}
    </div>
  )
}

export function NotificationBell() {
  // Hub SignalR désactivé par défaut (feature flag) : le polling gère le temps réel.
  usePlanningHub(true)

  const [open, setOpen] = useState(false)
  const { notifications, countNonLivrees, isLoading } = useGetNotificationsData()
  const livrer = useLivrerNotification()
  const livrerToutes = useLivrerToutesNotifications()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative text-white hover:bg-white/15 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {countNonLivrees > 0 && (
          <span className="absolute top-0.5 right-0.5 grid min-w-4 h-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {countNonLivrees}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>
              Modifications du planning de production.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
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

            {notifications.length > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={countNonLivrees === 0 || livrerToutes.isPending}
                  onClick={() => livrerToutes.mutate()}
                >
                  Tout marquer lu
                </Button>
              </div>
            )}

            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onLivrer={(id) => livrer.mutate(id)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}