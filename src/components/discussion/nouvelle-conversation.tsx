'use client'

import { useEffect, useState } from 'react'
import { Hash, Loader2, MessagesSquare, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreerConversation, useDiscussionUtilisateurs } from '@/hooks/use-discussion'
import { cn } from '@/lib/utils'
import type { ConversationDiscussion, TypeConversation } from '@/types/discussion'

const TYPES: { valeur: TypeConversation; label: string; icone: typeof Hash; aide: string }[] = [
  { valeur: 'Direct', label: 'Message direct', icone: MessagesSquare, aide: 'Un seul destinataire, conversation privée.' },
  { valeur: 'Groupe', label: 'Groupe', icone: Users, aide: 'Plusieurs personnes, toujours privé.' },
  { valeur: 'Canal', label: 'Canal', icone: Hash, aide: 'Fil thématique, public ou privé.' },
]

/**
 * Création d'une conversation : DM, groupe ou canal.
 *
 * Un canal PUBLIC n'est proposé que si l'utilisateur a PeutGererDiscussion —
 * la création en est la modération. Un groupe est toujours privé, un DM toujours
 * privé : le formulaire ne laisse pas choisir ce qui n'a pas de sens.
 */
export function NouvelleConversation({
  open,
  onOpenChange,
  peutGerer,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  peutGerer: boolean
  onCreated: (conversation: ConversationDiscussion) => void
}) {
  const utilisateurs = useDiscussionUtilisateurs(open)
  const creer = useCreerConversation()

  const [type, setType] = useState<TypeConversation>('Direct')
  const [nom, setNom] = useState('')
  const [public_, setPublic] = useState(false)
  const [selection, setSelection] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setType('Direct')
    setNom('')
    setPublic(false)
    setSelection([])
  }, [open])

  // Un canal public requiert le droit de gestion ; sans lui on retombe en privé.
  useEffect(() => {
    if (!peutGerer && public_) setPublic(false)
  }, [peutGerer, public_])

  const basculer = (userId: string) => {
    if (type === 'Direct') {
      setSelection([userId])
      return
    }
    setSelection((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const nomRequis = type !== 'Direct'
  const valide =
    selection.length > 0 &&
    (!nomRequis || nom.trim().length > 0) &&
    (type !== 'Direct' || selection.length === 1) &&
    !creer.isPending

  const valider = () => {
    if (!valide) return
    creer.mutate(
      {
        type,
        nom: nomRequis ? nom.trim() : null,
        estPrive: type === 'Canal' ? !public_ : true,
        membreIds: selection,
      },
      {
        onSuccess: (conversation) => {
          onCreated(conversation)
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="nouvelle-conversation">
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
          <DialogDescription>
            Choisissez le type, les participants, puis un nom pour un groupe ou un canal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((option) => {
              const Icone = option.icone
              const actif = type === option.valeur
              return (
                <button
                  key={option.valeur}
                  type="button"
                  onClick={() => {
                    setType(option.valeur)
                    if (option.valeur === 'Direct' && selection.length > 1) {
                      setSelection(selection.slice(0, 1))
                    }
                  }}
                  data-testid={`type-${option.valeur}`}
                  aria-pressed={actif}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors',
                    actif ? 'border-primary bg-primary/5 font-semibold' : 'hover:bg-muted/60',
                  )}
                >
                  <Icone className="size-4" />
                  {option.label}
                </button>
              )
            })}
          </div>

          {type === 'Canal' && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={public_}
                disabled={!peutGerer}
                onCheckedChange={(v) => setPublic(v === true)}
                data-testid="canal-public"
              />
              Canal public
              <span className="text-xs text-muted-foreground">
                {peutGerer
                  ? '(visible et modérable par le module)'
                  : '(réservé au droit de gérer la discussion)'}
              </span>
            </label>
          )}

          {nomRequis && (
            <div className="space-y-1.5">
              <Label htmlFor="discussion-nom">Nom</Label>
              <Input
                id="discussion-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder={type === 'Canal' ? 'ex. annonces-atelier' : 'ex. Équipe coupe'}
                data-testid="discussion-nom"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Participants</Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
              {utilisateurs.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (utilisateurs.data ?? []).length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  Aucun utilisateur actif disponible.
                </p>
              ) : (
                (utilisateurs.data ?? []).map((u) => {
                  const coche = selection.includes(u.userId)
                  return (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => basculer(u.userId)}
                      data-testid={`participant-${u.userId}`}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                        coche ? 'bg-primary/5' : 'hover:bg-muted/60',
                      )}
                    >
                      <Checkbox checked={coche} tabIndex={-1} className="pointer-events-none" />
                      <span className="min-w-0 flex-1 truncate">{u.nomAffichage}</span>
                      {u.poste && (
                        <span className="shrink-0 text-xs text-muted-foreground">{u.poste}</span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
            {type === 'Direct' && (
              <p className="text-[11px] text-muted-foreground">
                Un message direct se crée avec exactement un destinataire.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={valider} disabled={!valide} data-testid="discussion-creer">
            {creer.isPending && <Loader2 className="size-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
