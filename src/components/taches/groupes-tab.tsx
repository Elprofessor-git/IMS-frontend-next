'use client'

import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Save, X, Play, CheckCircle, AlertTriangle, Loader2, Layers, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import {
  useGetGroupesTaches,
  useCreateGroupeTache,
  useUpdateGroupeTache,
  useDeleteGroupeTache,
  useAddLigneGroupe,
  useUpdateLigneGroupe,
  useDeleteLigneGroupe,
  useAppliquerGroupe,
} from '@/hooks/use-groupes-taches'
import { useGetTaches } from '@/hooks/use-taches'
import { useGetCommandes } from '@/hooks/use-commandes'
import type { GroupeTache, GroupeTacheLigne, TacheProduction } from '@/types/tache'

const PRIORITE_LABELS = ['Basse', 'Normale', 'Haute', 'Urgente'] as const

const PRIORITE_VARIANT: Record<number, string> = {
  0: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  1: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  2: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  3: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
}

function commandeLabel(c: { id: number; numeroCommande: string; titreCommande?: string | null; client?: { nom: string } | null }) {
  const titre = c.titreCommande ? ` · ${c.titreCommande}` : ''
  const client = c.client?.nom ? ` — ${c.client.nom}` : ''
  return `${c.numeroCommande}${titre}${client}`
}

// ── Nouveau groupe ─────────────────────────────────────────────────────────────

function NouveauGroupeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createMutation = useCreateGroupeTache()
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [erreur, setErreur] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) {
      setErreur('Le nom du groupe est requis.')
      return
    }
    await createMutation.mutateAsync({ nom: nom.trim(), description: description || null })
    setNom('')
    setDescription('')
    setErreur('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau groupe de tâches</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-3 py-2">
            <div className="grid gap-1.5">
              <Label>Nom <span className="text-destructive">*</span></Label>
              <Input value={nom} onChange={(e) => { setNom(e.target.value); setErreur('') }} autoFocus />
              {erreur && <p className="text-xs text-destructive">{erreur}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Le groupe sera vide : ajoutez ensuite une ligne par tâche à générer
              (une TacheProduction est créée par ligne lors de l&apos;application à une commande).
            </p>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer le groupe'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Ligne d'un groupe ──────────────────────────────────────────────────────────

function LigneRow({
  ligne,
  editMode,
  onStartEdit,
  onCancelEdit,
}: {
  ligne: GroupeTacheLigne
  editMode: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
}) {
  const updateMutation = useUpdateLigneGroupe()
  const deleteMutation = useDeleteLigneGroupe()
  const [titre, setTitre] = useState(ligne.titre)
  const [description, setDescription] = useState(ligne.description ?? '')
  const [equipe, setEquipe] = useState(ligne.equipeAssignee ?? '')
  const [responsable, setResponsable] = useState(ligne.responsableAssigne ?? '')
  const [priorite, setPriorite] = useState(String(ligne.priorite))
  const [duree, setDuree] = useState(String(ligne.dureeEstimeeHeures))
  const [erreur, setErreur] = useState('')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titre.trim()) {
      setErreur('Le titre est requis.')
      return
    }
    await updateMutation.mutateAsync({
      id: ligne.id,
      data: {
        titre: titre.trim(),
        description: description || null,
        equipeAssignee: equipe || null,
        responsableAssigne: responsable || null,
        priorite: Math.min(3, Math.max(0, Number(priorite))),
        dureeEstimeeHeures: Math.max(0, Number(duree) || 0),
      },
    })
    onCancelEdit()
  }

  if (editMode) {
    return (
      <form onSubmit={save} className="space-y-2 rounded-lg border border-dashed p-2">
        <div className="grid gap-1.5">
          <Label>Titre <span className="text-destructive">*</span></Label>
          <Input value={titre} onChange={(e) => { setTitre(e.target.value); setErreur('') }} autoFocus />
          {erreur && <p className="text-xs text-destructive">{erreur}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label>Description</Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="grid gap-1">
            <Label>Équipe</Label>
            <Input value={equipe} onChange={(e) => setEquipe(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>Responsable</Label>
            <Input value={responsable} onChange={(e) => setResponsable(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>Priorité</Label>
            <Select value={priorite} onValueChange={setPriorite}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITE_LABELS.map((p, i) => (
                  <SelectItem key={p} value={String(i)}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Durée (h)</Label>
            <Input type="number" min="0" value={duree} onChange={(e) => setDuree(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onCancelEdit}>
            <X className="size-3" /> Annuler
          </Button>
          <Button type="submit" size="sm" disabled={updateMutation.isPending}>
            <Save className="size-3" /> Enregistrer
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border bg-muted/20 px-2 py-1.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-muted px-1.5 text-xs font-bold text-muted-foreground">#{ligne.ordre}</span>
          <span className="text-sm font-medium">{ligne.titre}</span>
          <Badge className={cn('text-xs', PRIORITE_VARIANT[ligne.priorite] ?? '')}>
            {PRIORITE_LABELS[ligne.priorite] ?? 'Normale'}
          </Badge>
        </div>
        {(ligne.equipeAssignee || ligne.responsableAssigne) && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ligne.equipeAssignee && `Équipe : ${ligne.equipeAssignee}`}
            {ligne.equipeAssignee && ligne.responsableAssigne && ' · '}
            {ligne.responsableAssigne && `Resp : ${ligne.responsableAssigne}`}
          </p>
        )}
        {ligne.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{ligne.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={onStartEdit} aria-label="Modifier">
          <Pencil className="size-3.5" />
        </Button>
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive hover:text-destructive" aria-label="Supprimer">
              <Trash2 className="size-3.5" />
            </Button>
          }
          title="Supprimer cette ligne ?"
          description="La ligne sera retirée du gabarit. Les tâches déjà générées ne sont pas affectées."
          confirmLabel="Supprimer"
          onConfirm={() => deleteMutation.mutate(ligne.id)}
        />
      </div>
    </div>
  )
}

// ── Ajout d'une ligne ──────────────────────────────────────────────────────────

function AddLigneForm({ groupeId }: { groupeId: number }) {
  const addMutation = useAddLigneGroupe()
  const [titre, setTitre] = useState('')
  const [equipe, setEquipe] = useState('')
  const [responsable, setResponsable] = useState('')
  const [priorite, setPriorite] = useState('1')
  const [duree, setDuree] = useState('0')
  const [erreur, setErreur] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titre.trim()) {
      setErreur('Le titre est requis.')
      return
    }
    await addMutation.mutateAsync({
      groupeId,
      data: {
        titre: titre.trim(),
        equipeAssignee: equipe || null,
        responsableAssigne: responsable || null,
        priorite: Math.min(3, Math.max(0, Number(priorite))),
        dureeEstimeeHeures: Math.max(0, Number(duree) || 0),
      },
    })
    setTitre('')
    setEquipe('')
    setResponsable('')
    setPriorite('1')
    setDuree('0')
    setErreur('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-dashed p-2">
      <div className="grid gap-1.5">
        <Label>Nouvelle ligne <span className="text-destructive">*</span></Label>
        <Input
          value={titre}
          onChange={(e) => { setTitre(e.target.value); setErreur('') }}
          placeholder="Titre de la tâche à générer"
        />
        {erreur && <p className="text-xs text-destructive">{erreur}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input value={equipe} onChange={(e) => setEquipe(e.target.value)} placeholder="Équipe" />
        <Input value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Responsable" />
        <Select value={priorite} onValueChange={setPriorite}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRIORITE_LABELS.map((p, i) => (
              <SelectItem key={p} value={String(i)}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="number" min="0" value={duree} onChange={(e) => setDuree(e.target.value)} placeholder="Durée (h)" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="outline" disabled={addMutation.isPending}>
          <Plus className="size-3" /> {addMutation.isPending ? 'Ajout…' : 'Ajouter la ligne'}
        </Button>
      </div>
    </form>
  )
}

// ── Application à une commande ─────────────────────────────────────────────────

function GroupeCard({ groupe }: { groupe: GroupeTache }) {
  const updateMutation = useUpdateGroupeTache()
  const deleteMutation = useDeleteGroupeTache()
  const appliquerMutation = useAppliquerGroupe()
  const { data: commandes, isLoading: commandesLoading } = useGetCommandes()

  const [editMode, setEditMode] = useState(false)
  const [nom, setNom] = useState(groupe.nom)
  const [description, setDescription] = useState(groupe.description ?? '')
  const [commandeId, setCommandeId] = useState<string>('')
  const [editLigneId, setEditLigneId] = useState<number | null>(null)
  const [addLigne, setAddLigne] = useState(false)
  const [erreur, setErreur] = useState('')

  const saveEdits = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) {
      setErreur('Le nom est requis.')
      return
    }
    await updateMutation.mutateAsync({
      id: groupe.id,
      data: { nom: nom.trim(), description: description || null },
    })
    setEditMode(false)
    setErreur('')
  }

  const appliquer = async () => {
    if (!commandeId) return
    const res = await appliquerMutation.mutateAsync({
      groupeId: groupe.id,
      commandeId: Number(commandeId),
    })
    toast.success(res.message ?? 'Groupe appliqué à la commande')
    setCommandeId('')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <Layers className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base">{groupe.nom}</CardTitle>
              {groupe.description && (
                <p className="text-xs text-muted-foreground">{groupe.description}</p>
              )}
            </div>
          </div>
          <Badge variant={groupe.estActif ? 'default' : 'secondary'}>
            {groupe.estActif ? 'Actif' : 'Inactif'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="size-3" /> {groupe.lignes.length} ligne(s)
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3" /> {groupe.nombreCommandesAppliquees} commande(s)
          </span>
          <span className="flex items-center gap-1">
            <Play className="size-3" /> {groupe.nombreTachesGenerees} tâche(s) générée(s)
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> créé le {new Date(groupe.dateCreation).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {editMode ? (
          <form onSubmit={saveEdits} className="space-y-2 rounded-lg border border-dashed p-2">
            <div className="grid gap-1.5">
              <Label>Nom <span className="text-destructive">*</span></Label>
              <Input value={nom} onChange={(e) => { setNom(e.target.value); setErreur('') }} autoFocus />
              {erreur && <p className="text-xs text-destructive">{erreur}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => { setEditMode(false); setErreur('') }}>
                <X className="size-3" /> Annuler
              </Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                <Save className="size-3" /> Enregistrer
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            <PermissionGate module="taches" mode="write">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditMode(true)}>
                <Pencil className="size-3" /> Éditer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() =>
                  updateMutation.mutateAsync({ id: groupe.id, data: { estActif: !groupe.estActif } })
                }
              >
                {groupe.estActif ? 'Désactiver' : 'Activer'}
              </Button>
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive">
                    <Trash2 className="size-3" /> Supprimer
                  </Button>
                }
                title="Supprimer ce groupe ?"
                description={`${groupe.nombreTachesGenerees} tâche(s) générée(s) seront conservées (rattachement levé, historique intact). Les lignes du gabarit seront supprimées.`}
                confirmLabel="Supprimer le groupe"
                onConfirm={() => deleteMutation.mutate(groupe.id)}
              />
            </PermissionGate>
          </div>
        )}

        {/* Lignes (gabarit) */}
        <div className="space-y-1.5">
          {groupe.lignes.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucune ligne — le groupe ne générera rien.</p>
          )}
          {groupe.lignes.map((l) => (
            <LigneRow
              key={l.id}
              ligne={l}
              editMode={editLigneId === l.id}
              onStartEdit={() => setEditLigneId(l.id)}
              onCancelEdit={() => setEditLigneId(null)}
            />
          ))}
          <PermissionGate module="taches" mode="write">
            {addLigne ? (
              <>
                <AddLigneForm groupeId={groupe.id} />
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setAddLigne(false)}>
                    <X className="size-3" /> Fermer
                  </Button>
                </div>
              </>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddLigne(true)}>
                <Plus className="size-3" /> Ajouter une ligne
              </Button>
            )}
          </PermissionGate>
        </div>

        {/* Application à une commande */}
        <PermissionGate module="taches" mode="write">
          <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-2">
            <div className="grid min-w-[12rem] flex-1 gap-1">
              <Label className="text-xs">Appliquer à une commande</Label>
              {commandesLoading ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : (
                <Select value={commandeId} onValueChange={setCommandeId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir une commande…" /></SelectTrigger>
                  <SelectContent>
                    {(commandes ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {commandeLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button
              size="sm"
              className="h-9"
              onClick={appliquer}
              disabled={!commandeId || appliquerMutation.isPending || !groupe.estActif}
              title={!groupe.estActif ? 'Le groupe doit être actif' : undefined}
            >
              {appliquerMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              {groupe.estActif ? 'Appliquer' : 'Inactif'}
            </Button>
          </div>
        </PermissionGate>
      </CardContent>
    </Card>
  )
}

// ── Suivi par commande (lecture seule, calcul client sur la liste des tâches) ──

function SuiviParCommande() {
  const { data: taches, isLoading } = useGetTaches()

  const rows = useMemo(() => {
    if (!taches) return []
    const byCommande = new Map<
      number,
      { commande: NonNullable<TacheProduction['commandeClient']>; total: number; terminees: number; bloquees: number; enAttente: number }
    >()
    for (const t of taches) {
      if (!t.commandeClient) continue
      const entry = byCommande.get(t.commandeClient.id) ?? {
        commande: t.commandeClient,
        total: 0,
        terminees: 0,
        bloquees: 0,
        enAttente: 0,
      }
      entry.total += 1
      if (t.statut === 3) entry.terminees += 1
      if (t.statut === 2) entry.bloquees += 1
      if (t.statut === 0 || t.statut === 1) entry.enAttente += 1
      byCommande.set(t.commandeClient.id, entry)
    }
    return [...byCommande.values()].sort((a, b) => b.total - a.total)
  }, [taches])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Aucune commande avec tâches.</p>
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const pctTerminees = r.total > 0 ? Math.round((r.terminees / r.total) * 100) : 0
        const enRetard = r.enAttente > 0
        return (
          <div key={r.commande.id} className="rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {commandeLabel(r.commande)}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{r.total} tâches</Badge>
                <Badge variant="outline" className="text-green-700 dark:text-green-400">
                  <CheckCircle className="size-3" /> {r.terminees} terminées
                </Badge>
                {r.bloquees > 0 && (
                  <Badge variant="outline" className="text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-3" /> {r.bloquees} bloquées
                  </Badge>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      pctTerminees >= 100 ? 'bg-green-500' : enRetard ? 'bg-amber-500' : 'bg-blue-500',
                    )}
                    style={{ width: `${pctTerminees}%` }}
                  />
                </div>
              </div>
              <span className="w-12 text-right text-sm font-semibold">{pctTerminees}%</span>
              {enRetard && (
                <Badge variant="destructive" className="text-xs">En cours</Badge>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Onglet complet ─────────────────────────────────────────────────────────────

export function GroupesTab() {
  const { data: groupes, isLoading } = useGetGroupesTaches()
  const [newDialogOpen, setNewDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Groupes de tâches</h2>
          <p className="text-sm text-muted-foreground">
            Gabarits répétitifs : appliquez un groupe à une commande pour générer une tâche par ligne.
          </p>
        </div>
        <PermissionGate module="taches" mode="write">
          <Button size="sm" onClick={() => setNewDialogOpen(true)}>
            <Plus className="size-4" /> Nouveau groupe
          </Button>
        </PermissionGate>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : (groupes ?? []).length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun groupe. Créez un premier gabarit de tâches répétitives.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(groupes ?? []).map((g) => (
            <GroupeCard key={g.id} groupe={g} />
          ))}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold">Suivi par commande</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Progression calculée sur les tâches liées à chaque commande (terminées ÷ total).
        </p>
        <SuiviParCommande />
      </div>

      <NouveauGroupeDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} />
    </div>
  )
}