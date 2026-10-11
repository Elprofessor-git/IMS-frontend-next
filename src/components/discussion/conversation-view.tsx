'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Loader2, MessagesSquare, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { Composer } from '@/components/discussion/composer'
import { CarteReference } from '@/components/discussion/carte-reference'
import {
  fusionnerMessages,
  useDiscussionFlux,
  useDiscussionHistory,
  useMarquerLu,
  useMessagesAnterieurs,
  useModifierMessage,
  useSupprimerMessage,
} from '@/hooks/use-discussion'
import {
  descriptionConversation,
  heureMessage,
  initiales,
  nomConversation,
} from '@/lib/discussion'
import type { ConversationDiscussion, MessageDiscussion } from '@/types/discussion'

const TAILLE_PAGE = 30
const REGEX_LIEN = /^https?:\/\//i

/**
 * Rend le texte BRUT d'un message, en transformant seulement les URL http(s) en
 * liens cliquables. Aucun HTML n'est interprété : `dangerouslySetInnerHTML` n'est
 * jamais utilisé, une balise tapée par un utilisateur reste du texte visible.
 */
function TexteAvecLiens({ texte }: { texte: string }) {
  const parties = texte.split(/(https?:\/\/[^\s<>()]+)/gi)
  return (
    <span className="whitespace-pre-wrap break-words">
      {parties.map((partie, index) =>
        REGEX_LIEN.test(partie) ? (
          <a
            key={index}
            href={partie}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {partie}
          </a>
        ) : (
          <span key={index}>{partie}</span>
        ),
      )}
    </span>
  )
}

function LigneMessage({
  message,
  moiUserId,
  conversationId,
}: {
  message: MessageDiscussion
  moiUserId: string
  conversationId: number
}) {
  const supprimer = useSupprimerMessage(conversationId)
  const modifier = useModifierMessage(conversationId)
  const estMoi = message.auteurUserId === moiUserId
  const enCours = message.id < 0
  const [edition, setEdition] = useState(false)
  const [brouillon, setBrouillon] = useState(message.contenu)

  if (message.estSupprime) {
    return (
      <div className="px-1 py-1 text-xs italic text-muted-foreground" data-testid={`message-${message.id}`}>
        Message supprimé
      </div>
    )
  }

  const enregistrerEdition = () => {
    const contenu = brouillon.trim()
    if (contenu.length === 0 || contenu === message.contenu) {
      setEdition(false)
      return
    }
    modifier.mutate(
      { messageId: message.id, contenu },
      { onSuccess: () => setEdition(false) },
    )
  }

  return (
    <article
      className={cn('flex gap-3', estMoi && 'flex-row-reverse')}
      data-testid={`message-${message.id}`}
    >
      <span
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
        aria-hidden="true"
      >
        {initiales(message.auteurNom)}
      </span>

      <div className={cn('min-w-0 max-w-[80%]', estMoi && 'items-end text-right')}>
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs text-muted-foreground',
            estMoi && 'justify-end',
          )}
        >
          <span className="font-medium">{estMoi ? 'Vous' : message.auteurNom}</span>
          <span>{heureMessage(message.envoyeLe)}</span>
          {enCours && <Loader2 className="size-3 animate-spin" />}
          {message.modifieLe && <span>(modifié)</span>}
        </div>

        {edition ? (
          <div className="mt-1 space-y-1.5">
            <textarea
              value={brouillon}
              onChange={(e) => setBrouillon(e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
            <div className={cn('flex gap-1.5', estMoi && 'justify-end')}>
              <Button size="sm" variant="ghost" onClick={() => setEdition(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={enregistrerEdition} disabled={modifier.isPending}>
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'mt-1 inline-block rounded-lg px-3 py-2 text-left text-sm leading-relaxed',
              estMoi ? 'bg-primary text-primary-foreground' : 'bg-muted',
              enCours && 'opacity-70',
            )}
          >
            <TexteAvecLiens texte={message.contenu} />
          </div>
        )}

        {!edition && (message.references?.length ?? 0) > 0 && (
          <div className={cn('mt-1.5 flex flex-col gap-1.5', estMoi && 'items-end')}>
            {message.references!.map((reference) => (
              <CarteReference key={reference.reference} reference={reference} />
            ))}
          </div>
        )}

        {estMoi && !edition && !enCours && (
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-foreground"
              onClick={() => {
                setBrouillon(message.contenu)
                setEdition(true)
              }}
            >
              <Pencil className="size-3" />
              Modifier
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-destructive"
              onClick={() => supprimer.mutate(message.id)}
            >
              <Trash2 className="size-3" />
              Supprimer
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

/**
 * Panneau de conversation : en-tête, historique, séparateur « nouveaux messages »,
 * chargement des anciens et zone de rédaction.
 */
export function ConversationView({
  conversation,
  moiUserId,
  moiNom,
  onRetour,
}: {
  conversation: ConversationDiscussion
  moiUserId: string
  moiNom: string
  onRetour?: () => void
}) {
  // Conversation contextuelle : /sync l'exclut (l'accès suit le module de l'objet),
  // l'historique est donc repollé tant que la fiche est ouverte. Les conversations
  // libres restent poussées par le polling global.
  const historyQuery = useDiscussionHistory(
    conversation.id,
    conversation.type === 'Contexte' ? 5_000 : false,
  )
  const flux = useDiscussionFlux(conversation.id)
  const anterieurs = useMessagesAnterieurs()
  const { mutate: marquerLu } = useMarquerLu(conversation.id)

  const [plusAnciens, setPlusAnciens] = useState<MessageDiscussion[]>([])
  const [separateurId, setSeparaeurId] = useState<number | null>(null)
  const separateurRef = useRef<number | null>(null)

  const historique = useMemo(
    () => [...plusAnciens, ...(historyQuery.data ?? [])],
    [plusAnciens, historyQuery.data],
  )
  const messages = useMemo(
    () => fusionnerMessages(historique, flux),
    [historique, flux],
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const enBas = useRef(true)
  const dernierId = messages.length > 0 ? messages[messages.length - 1].id : 0

  // Nouvelle conversation : on repart d'un état propre (anciens, séparateur, bas).
  useEffect(() => {
    setPlusAnciens([])
    setSeparaeurId(null)
    separateurRef.current = null
    enBas.current = true
  }, [conversation.id])

  // Capture UNE fois par conversation l'identifiant du premier message non lu,
  // pour poser le séparateur « Nouveaux messages ». Déclaré AVANT l'effet de
  // marquage comme lu, sinon nonLus vaudrait déjà 0.
  useEffect(() => {
    if (!historyQuery.isSuccess) return
    if (separateurRef.current === conversation.id) return
    separateurRef.current = conversation.id
    const n = conversation.nonLus
    if (n > 0 && historique.length > 0) {
      const index = Math.max(0, historique.length - n)
      setSeparaeurId(historique[index]?.id ?? null)
    }
  }, [historyQuery.isSuccess, conversation.id, conversation.nonLus, historique])

  // Marquage lu : à l'ouverture et à chaque nouveau message reçu tant qu'on regarde.
  useEffect(() => {
    if (dernierId > 0) marquerLu(dernierId)
  }, [dernierId, marquerLu])

  // Défilement automatique SEULEMENT si l'utilisateur est déjà en bas : on ne
  // l'arrache jamais à la lecture d'un ancien message.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !enBas.current) return
    el.scrollTop = el.scrollHeight
  }, [dernierId, historyQuery.isLoading])

  const surDefilement = () => {
    const el = scrollRef.current
    if (!el) return
    enBas.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const chargerAnterieurs = () => {
    const base = plusAnciens.length > 0 ? plusAnciens : (historyQuery.data ?? [])
    const avantId = base[0]?.id
    if (avantId == null) return
    anterieurs.mutate(
      { conversationId: conversation.id, avantId },
      { onSuccess: ({ messages: page }) => setPlusAnciens((prev) => [...page, ...prev]) },
    )
  }

  const nom = nomConversation(conversation, moiUserId)
  const peutChargerPlus = (historyQuery.data?.length ?? 0) >= TAILLE_PAGE

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b p-3 sm:p-4">
        {onRetour && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onRetour}
            aria-label="Retour à la liste"
          >
            <ChevronLeft className="size-4" />
          </Button>
        )}
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-white"
          aria-hidden="true"
        >
          {initiales(nom)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{nom}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {descriptionConversation(conversation, moiUserId)}
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={surDefilement}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4"
        data-testid="discussion-messages"
      >
        {historyQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
            <Skeleton className="h-12 w-3/4" />
          </div>
        ) : (
          <>
            {peutChargerPlus && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={anterieurs.isPending}
                  onClick={chargerAnterieurs}
                  data-testid="discussion-charger-anciens"
                >
                  {anterieurs.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  Charger les messages précédents
                </Button>
              </div>
            )}

            {messages.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title="Aucun message"
                description="Écrivez le premier message de cette conversation."
              />
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id}>
                    {separateurId != null && message.id === separateurId && (
                      <div
                        data-testid="discussion-separateur-nouveaux"
                        className="my-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-primary"
                      >
                        <span className="h-px flex-1 bg-primary/30" />
                        Nouveaux messages
                        <span className="h-px flex-1 bg-primary/30" />
                      </div>
                    )}
                    <LigneMessage
                      message={message}
                      moiUserId={moiUserId}
                      conversationId={conversation.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Composer conversationId={conversation.id} auteur={{ userId: moiUserId, nom: moiNom }} />
    </div>
  )
}
