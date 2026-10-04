'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { PaginationBar } from '@/components/shared/pagination'
import { PermissionGate } from '@/components/auth/permission-gate'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConnectionPanel } from '@/components/courriels/connection-panel'
import { ThreadList } from '@/components/courriels/thread-list'
import { ThreadDetail } from '@/components/courriels/thread-detail'
import { MessageComposer } from '@/components/courriels/message-composer'
import { useCanWrite } from '@/hooks/use-permissions'
import { useGmailMessage, useGmailStatus, useGmailThreads, useUpdateThreadFlags } from '@/hooks/use-gmail'
import type { ComposeMode, GmailThreadListItem } from '@/types/gmail'

const PAGE_SIZE = 25

function CourrielsContent() {
  // useSearchParams() force un rendu client : la page reste entièrement dynamique,
  // ce qui est acceptable ici (aucun SEO requis sur un écran privé).
  const searchParams = useSearchParams()
  const oauthResult = searchParams.get('connexion')
  const oauthError = searchParams.get('message')
  // Lien profond « /courriels?threadId=… » (nouvelle unité : le fil) ou
  // « ?messageId=42 » (ancienne cloche LOT 17, résolu en fil ci-dessous).
  const threadIdUrl = searchParams.get('threadId')
  const messageIdUrl = searchParams.get('messageId')

  const { data: status } = useGmailStatus()
  const connected = status?.connected ?? false
  const aiAvailable = status?.aiAvailable ?? false
  const canWrite = useCanWrite('courriels')

  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  // Vue mobile : liste seule, ou détail seul. Sur grand écran les deux sont visibles
  // (voir les classes de grille plus bas), cet état n'agit donc qu'en petit écran.
  const [detailMobile, setDetailMobile] = useState(false)
  const [nouveauMode] = useState<ComposeMode>('New')
  // Fil ouvert par lien profond : il est épinglé, car il n'est pas forcément dans la page
  // affichée (pagination, filtres). Sans cette épingle, la liste le fermerait dès son
  // chargement et le lien ne mènerait nulle part.
  const [pinnedThreadId, setPinnedThreadId] = useState<string | null>(null)

  // Anti-rebond : on ne part pas au backend à chaque frappe.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
      setSelectedThreadId(pinnedThreadId)
    }, 350)
    return () => clearTimeout(timer)
  }, [query, pinnedThreadId])

  // Retour du callback OAuth → feedback immédiat, puis on nettoie l'URL.
  useEffect(() => {
    if (oauthResult === 'success') {
      toast.success('Compte Gmail connecté')
    } else if (oauthResult === 'error') {
      toast.error(oauthError ?? 'La connexion Gmail a échoué')
    }
    if (oauthResult) {
      window.history.replaceState(null, '', '/courriels')
    }
  }, [oauthResult, oauthError])

  // Lien profond par fil : validation stricte de l'identifiant (une URL corrompue ne
  // doit pas casser la page) puis nettoyage de l'URL, comme pour le callback OAuth.
  useEffect(() => {
    if (!threadIdUrl || threadIdUrl.length === 0 || threadIdUrl.length > 255) return
    setPage(1)
    setSelectedThreadId(threadIdUrl)
    setPinnedThreadId(threadIdUrl)
    window.history.replaceState(null, '', '/courriels')
  }, [threadIdUrl])

  const { data, isLoading, isFetching } = useGmailThreads({
    page,
    pageSize: PAGE_SIZE,
    unreadOnly,
    search: debouncedQuery,
  })

  // Le fil sélectionné peut disparaître (filtre changé, archivé, corbeille) : on
  // désélectionne pour ne pas laisser un panneau orphelin. Le fil épinglé par un lien
  // profond échappe à cette règle : il est récupéré par identifiant, pas par la page.
  useEffect(() => {
    if (!data) return
    if (selectedThreadId == null || selectedThreadId === pinnedThreadId) return
    if (!data.items.some((t) => t.gmailThreadId === selectedThreadId)) setSelectedThreadId(null)
  }, [data, selectedThreadId, pinnedThreadId])

  // Lien profond « ?messageId=42 » : on remonte au fil qui le contient, pour que
  // l'utilisateur atterrisse sur la conversation et non sur une ligne de liste.
  const { data: messageForLink } = useGmailThreadForDeepLink(messageIdUrl)
  useEffect(() => {
    if (!messageForLink?.gmailThreadId) return
    if (pinnedThreadId === messageForLink.gmailThreadId) return
    setPage(1)
    setSelectedThreadId(messageForLink.gmailThreadId)
    setPinnedThreadId(messageForLink.gmailThreadId)
    window.history.replaceState(null, '', '/courriels')
  }, [messageForLink?.gmailThreadId, pinnedThreadId])

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const selected = data?.items.find((t) => t.gmailThreadId === selectedThreadId) ?? null
  // Le fil affiché vient d'un lien profond mais n'est pas dans la page courante : on le
  // dit, sinon l'utilisateur cherche une ligne absente de la liste.
  const horsPageCourante =
    selectedThreadId != null &&
    !isLoading &&
    !(data?.items ?? []).some((t) => t.gmailThreadId === selectedThreadId)

  // Un clic dans la liste annule l'épingle : l'utilisateur reprend la main.
  const handleSelect = (threadId: string) => {
    setPinnedThreadId(null)
    setSelectedThreadId(threadId)
    setComposing(false)
    // En petit écran, sélectionner un fil ouvre son détail : les deux colonnes ne
    // cohabitent pas sur un téléphone.
    setDetailMobile(true)
  }

  const applyUnreadOnly = (value: boolean) => {
    setUnreadOnly(value)
    setPage(1)
    setPinnedThreadId(null)
    setSelectedThreadId(null)
  }

  // En-tête du panneau de droite : une action par conversation, pour éviter d'ouvrir
  // chaque message d'un fil de 12 messages.
  const threadActions = useMemo(() => buildThreadActions(selected), [selected])

  return (
    <>
      <PageHeader
        title="Courriels"
        description="Synchronisez votre boîte Gmail, détectez les demandes d'action et préparez vos réponses."
      />

      <PermissionGate module="courriels" mode="read" fallback={<ForbiddenState moduleLabel="Courriels" />}>
        <div className="space-y-5">
          <ConnectionPanel />

          {connected && (
            <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
              <section className="overflow-hidden rounded-xl border bg-card">
                <div className="space-y-3 border-b p-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label htmlFor="courriels-recherche" className="sr-only">
                        Rechercher un email
                      </Label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="courriels-recherche"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Filtrer sur l'expéditeur, l'objet ou le contenu…"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={unreadOnly}
                        onChange={(e) => applyUnreadOnly(e.target.checked)}
                        className="size-4 rounded border-input accent-primary"
                      />
                      Non lus uniquement
                    </label>
                  </div>

                  {canWrite && (
                    <Button
                      variant={composing ? 'secondary' : 'default'}
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setComposing((v) => !v)
                        setSelectedThreadId(null)
                        setDetailMobile(false)
                      }}
                    >
                      <Plus className="size-4" />
                      {composing ? 'Annuler la rédaction' : 'Nouveau message'}
                    </Button>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {isFetching && !isLoading
                      ? 'Actualisation…'
                      : `${total} conversation(s) synchronisée(s)`}
                    {unreadOnly ? ' · filtre non lus' : ''}
                    {debouncedQuery ? ` · recherche « ${debouncedQuery} »` : ''}
                    {horsPageCourante ? ' · conversation ouverte hors de la page courante' : ''}
                  </p>
                </div>

                <div className={cn('max-h-[32rem] overflow-y-auto', detailMobile && 'hidden lg:block')}>
                  <ThreadList
                    threads={data?.items ?? []}
                    selectedThreadId={selectedThreadId}
                    onSelect={handleSelect}
                    isLoading={isLoading}
                    hasFilter={unreadOnly || debouncedQuery.length > 0}
                  />
                </div>

                <div className="border-t px-4 py-3">
                  <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    label="conversations"
                    onPageChange={(p) => {
                      setPage(p)
                      setPinnedThreadId(null)
                      setSelectedThreadId(null)
                    }}
                  />
                </div>
              </section>

              <section
                className={cn(
                  'min-h-[32rem] overflow-hidden rounded-xl border bg-card',
                  // En petit écran : une seule vue à la fois. Le composeur du nouveau
                  // message prime sur le fil, sinon il faudrait faire défiler pour y accéder.
                  !composing && !detailMobile && 'hidden lg:block',
                )}
              >
                {composing ? (
                  <div className="p-4" data-testid="composeur-nouveau">
                    <MessageComposer
                      mode={nouveauMode}
                      aiAvailable={aiAvailable}
                      availableModes={[]}
                      onSent={() => setComposing(false)}
                      onCancel={() => setComposing(false)}
                    />
                  </div>
                ) : (
                  <>
                    <ThreadDetail gmailThreadId={selectedThreadId} aiAvailable={aiAvailable} />

                    {selected && threadActions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2">
                        {threadActions.map((action) => (
                          <ThreadActionButton
                            key={action.key}
                            action={action}
                            gmailThreadId={selected.gmailThreadId}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </PermissionGate>
    </>
  )
}

/**
 * Actions proposées pour une conversation. Elles visent le fil entier : l'utilisateur
 * n'a pas à ouvrir 12 messages pour marquer une discussion comme lue.
 */
type ThreadAction = {
  key: string
  label: string
  payload: { isRead?: boolean; isStarred?: boolean; archive?: boolean; trash?: boolean }
  destructive?: boolean
}

function buildThreadActions(thread: GmailThreadListItem | null): ThreadAction[] {
  if (!thread) return []
  return [
    ...(thread.unreadCount > 0
      ? [{ key: 'read', label: 'Marquer comme lu', payload: { isRead: true } as const }]
      : [{ key: 'unread', label: 'Marquer comme non lu', payload: { isRead: false } as const }]),
    {
      key: 'star',
      label: thread.isStarred ? 'Retirer le suivi' : 'Suivre',
      payload: { isStarred: !thread.isStarred },
    },
    { key: 'archive', label: 'Archiver', payload: { archive: true } },
    { key: 'trash', label: 'Mettre à la corbeille', payload: { trash: true }, destructive: true },
  ]
}

function ThreadActionButton({
  action,
  gmailThreadId,
}: {
  action: ThreadAction
  gmailThreadId: string
}) {
  const update = useUpdateThreadFlags()
  return (
    <Button
      size="sm"
      variant={action.destructive ? 'ghost' : 'outline'}
      disabled={update.isPending}
      onClick={() => update.mutate({ gmailThreadId, ...action.payload })}
      className={action.destructive ? 'text-destructive hover:bg-destructive/10' : undefined}
    >
      {action.label}
    </Button>
  )
}


/**
 * Résolution du lien profond `?messageId=42` : le détail du message renvoie déjà son
 * `gmailThreadId`, ce qui évite un endpoint de plus et un aller-retour supplémentaire.
 */
function useGmailThreadForDeepLink(messageIdUrl: string | null) {
  const messageId = useMemo(() => {
    const parsed = Number.parseInt(messageIdUrl ?? '', 10)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }, [messageIdUrl])

  return useGmailMessage(messageId)
}

// ── Export avec Suspense (requis par useSearchParams) ───────────────────────
export default function CourrielsPage() {
  return (
    <Suspense>
      <CourrielsContent />
    </Suspense>
  )
}
