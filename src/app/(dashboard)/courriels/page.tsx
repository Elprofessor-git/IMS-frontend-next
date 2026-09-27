'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { PaginationBar } from '@/components/shared/pagination'
import { PermissionGate } from '@/components/auth/permission-gate'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConnectionPanel } from '@/components/courriels/connection-panel'
import { MessageList } from '@/components/courriels/message-list'
import { MessageDetail } from '@/components/courriels/message-detail'
import { useGmailMessages, useGmailStatus } from '@/hooks/use-gmail'

const PAGE_SIZE = 20

function CourrielsContent() {
  // useSearchParams() force un rendu client : la page reste entièrement dynamique,
  // ce qui est acceptable ici (aucun SEO requis sur un écran privé).
  const searchParams = useSearchParams()
  const oauthResult = searchParams.get('connexion')
  const oauthError = searchParams.get('message')
  // Lien profond « /courriels?messageId=42 » (cloche LOT 17).
  const messageIdUrl = searchParams.get('messageId')

  const { data: status } = useGmailStatus()
  const connected = status?.connected ?? false
  const aiAvailable = status?.aiAvailable ?? false

  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  // Message ouvert par lien profond : il est épinglé, car il n'est pas forcément
  // dans la page affichée (pagination, filtres). Sans cette épingle, la liste le
  // fermerait dès son chargement et le lien ne mènerait nulle part.
  const [pinnedId, setPinnedId] = useState<number | null>(null)

  // Anti-rebond : on ne part pas au backend à chaque frappe.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
      setSelectedId(pinnedId)
    }, 350)
    return () => clearTimeout(timer)
  }, [query, pinnedId])

  // Lien profond : on valide l'identifiant avant tout usage (un paramètre corrompu
  // ne doit pas casser la page) puis on nettoie l'URL, comme pour le callback OAuth.
  useEffect(() => {
    const id = messageIdUrl ? Number.parseInt(messageIdUrl, 10) : Number.NaN
    if (!Number.isInteger(id) || id <= 0) return
    setPage(1)
    setSelectedId(id)
    setPinnedId(id)
    window.history.replaceState(null, '', '/courriels')
  }, [messageIdUrl])

  const { data, isLoading, isFetching } = useGmailMessages({
    page,
    pageSize: PAGE_SIZE,
    unreadOnly,
    search: debouncedQuery,
  })

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

  // Le message sélectionné peut disparaître (filtre changé, suppression) : on
  // désélectionne pour ne pas laisser un panneau orphelin. Le message épinglé par un
  // lien profond échappe à cette règle : il est récupéré par son ID, pas par la page.
  useEffect(() => {
    if (!data) return
    if (selectedId == null || selectedId === pinnedId) return
    if (!data.items.some((m) => m.id === selectedId)) setSelectedId(null)
  }, [data, selectedId, pinnedId])

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const selected = data?.items.find((m) => m.id === selectedId)
  // Le message affiché vient d'un lien profond mais n'est pas dans la page courante :
  // on le dit, sinon l'utilisateur cherche une ligne absente de la liste.
  const horsPageCourante =
    selectedId != null && !isLoading && !(data?.items ?? []).some((m) => m.id === selectedId)

  // Un clic dans la liste annule l'épingle : l'utilisateur reprend la main.
  const handleSelect = (id: number) => {
    setPinnedId(null)
    setSelectedId(id)
  }

  const applyUnreadOnly = (value: boolean) => {
    setUnreadOnly(value)
    setPage(1)
    setPinnedId(null)
    setSelectedId(null)
  }

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
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
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
                  <p className="text-xs text-muted-foreground">
                    {isFetching && !isLoading
                      ? 'Actualisation…'
                      : `${total} email(s) synchronisé(s)`}
                    {unreadOnly ? ' · filtre non lus' : ''}
                    {debouncedQuery ? ` · recherche « ${debouncedQuery} »` : ''}
                    {horsPageCourante ? ' · email ouvert hors de la page courante' : ''}
                  </p>
                </div>

                <div className="max-h-[32rem] overflow-y-auto">
                  <MessageList
                    messages={data?.items ?? []}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    isLoading={isLoading}
                    hasMessages={total > 0}
                  />
                </div>

                <div className="border-t px-4 py-3">
                  <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    label="emails"
                    onPageChange={(p) => {
                      setPage(p)
                      setPinnedId(null)
                      setSelectedId(null)
                    }}
                  />
                </div>
              </section>

              <section className="min-h-[32rem] overflow-hidden rounded-xl border bg-card">
                <MessageDetail messageId={selectedId} summary={selected} aiAvailable={aiAvailable} />
              </section>
            </div>
          )}
        </div>
      </PermissionGate>
    </>
  )
}

// ── Export avec Suspense (requis par useSearchParams) ───────────────────────
export default function CourrielsPage() {
  return (
    <Suspense>
      <CourrielsContent />
    </Suspense>
  )
}
