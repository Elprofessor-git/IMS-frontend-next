'use client'

import { Mail, PlugZap, ShieldAlert, Loader2, RefreshCw, Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PermissionGate } from '@/components/auth/permission-gate'
import { useGmailConnect, useGmailDisconnect, useGmailStatus, useGmailSync } from '@/hooks/use-gmail'

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ConnectionPanel() {
  const { data: status, isLoading } = useGmailStatus()
  const connect = useGmailConnect()
  const disconnect = useGmailDisconnect()
  const sync = useGmailSync()

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!status) return null

  // Sans clé de chiffrement, aucun token ne peut être stocké : la connexion est
  // impossible. Le module reste consultable (lecture seule).
  const canConnect = status.configure && status.tokenStorageReady

  // Aucun compte connecté : seule action possible, la connexion Google.
  if (!status.connected) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10">
              <Mail className="size-5 text-primary" />
            </span>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Aucun compte Gmail connecté</h2>
              <p className="text-sm text-muted-foreground">
                Connectez votre boîte Gmail pour synchroniser les emails dans le système, détecter les
                demandes d&apos;action et rédiger des réponses.
              </p>
            </div>
          </div>

          {!canConnect && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                {!status.configure && (
                  <p>
                    La connexion OAuth n&apos;est pas configurée sur ce serveur. L&apos;administrateur
                    doit renseigner <code className="font-mono text-xs">Google__ClientId</code>,{' '}
                    <code className="font-mono text-xs">Google__ClientSecret</code> et{' '}
                    <code className="font-mono text-xs">Google__RedirectUri</code> dans les
                    variables d&apos;environnement du backend.
                  </p>
                )}
                {!status.tokenStorageReady && (
                  <p>
                    Le stockage chiffré des tokens n&apos;est pas configuré : il manque une clé
                    AES-256 valide dans{' '}
                    <code className="font-mono text-xs">Google__TokenEncryptionKey</code> (32 octets
                    en Base64, par exemple <code className="font-mono text-xs">openssl rand -base64 32</code>).
                  </p>
                )}
              </div>
            </div>
          )}

          {!status.aiAvailable && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                L&apos;assistance IA (analyse d&apos;email, brouillon de réponse) est désactivée :
                la variable <code className="font-mono text-xs">GROQ_API_KEY</code> manque sur le
                serveur.
              </p>
            </div>
          )}

          <PermissionGate module="courriels" mode="write">
            <Button onClick={() => connect.mutate()} disabled={!canConnect || connect.isPending}>
              {connect.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PlugZap className="size-4" />
              )}
              Connecter un compte Gmail
            </Button>
          </PermissionGate>
        </CardContent>
      </Card>
    )
  }

  // Compte connecté : état + synchronisation.
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-100">
        <Mail className="size-4 text-emerald-700" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{status.gmailAddress}</p>
        <p className="text-xs text-muted-foreground">
          Connecté le {formatDateTime(status.connectedAt)} · Dernière synchronisation{' '}
          {formatDateTime(status.lastSyncAt)} · {status.messageCount} message(s) ·{' '}
          {status.unreadCount} non lu(s)
        </p>
      </div>
      <div className="flex gap-2">
        <PermissionGate module="courriels" mode="write">
          <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Synchroniser
          </Button>
        </PermissionGate>
        <PermissionGate module="courriels" mode="write">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
          >
            <Plug className="size-4 rotate-180" />
            Déconnecter
          </Button>
        </PermissionGate>
      </div>
    </div>
  )
}
