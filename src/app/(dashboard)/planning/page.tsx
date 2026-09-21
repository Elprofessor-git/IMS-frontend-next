'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  useGetChainesProduction,
  useCreateChaineProduction,
  useDesactiverChaineProduction,
} from '@/hooks/use-fournitures'
import {
  useGetPlanningGrille,
  useCreerPlanningEntry,
  useModifierPlanningEntry,
  useSupprimerPlanningEntry,
  PLANNING_KEY,
} from '@/hooks/use-planning'
import type { ChainePlanning, PlanningEntry } from '@/types/planning'

const TYPES_CHAINE = ['Decoupe', 'Confection', 'Conditionnement'] as const

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateKeyOf(iso: string): string {
  return iso.slice(0, 10)
}

function formatSamedi(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

function formatSamediLong(d: Date): string {
  return `Samedi ${formatSamedi(d)}/${d.getFullYear()}`
}

function ajouterSemaines(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(d.getDate() + n * 7)
  return r
}

// Samedi le plus proche (aujourd'hui si samedi, sinon le samedi suivant).
function prochainSamedi(): Date {
  const now = new Date()
  const diff = (6 - now.getDay() + 7) % 7
  const s = new Date(now)
  s.setDate(now.getDate() + diff)
  return s
}

function samedisPour(start: Date, nSemaines: number): Date[] {
  return Array.from({ length: nSemaines }, (_, i) => ajouterSemaines(start, i))
}

// ── Éditeur d'une cellule (création / modification / suppression) ─────────────

function CellEditorDialog({
  open,
  onClose,
  chaine,
  samedi,
  existing,
}: {
  open: boolean
  onClose: () => void
  chaine: ChainePlanning
  samedi: Date
  existing?: PlanningEntry
}) {
  const creer = useCreerPlanningEntry()
  const modifier = useModifierPlanningEntry()
  const supprimer = useSupprimerPlanningEntry()

  const [numeroCommande, setNumeroCommande] = useState(existing?.numeroCommande ?? '')
  const [quantite, setQuantite] = useState(existing?.quantite?.toString() ?? '')
  const [estLivree, setEstLivree] = useState(existing?.estLivree ?? false)
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const isPending = creer.isPending || modifier.isPending || supprimer.isPending

  const handleSubmit = async () => {
    if (!numeroCommande.trim() || isPending) return
    const payload = {
      numeroCommande: numeroCommande.trim(),
      quantite: quantite.trim() ? Number(quantite) : null,
      estLivree,
      notes: notes.trim() || null,
    }
    if (existing) {
      await modifier.mutateAsync({ id: existing.id, ...payload })
    } else {
      await creer.mutateAsync({
        chaineProductionId: chaine.id,
        dateSamedi: toIsoDate(samedi),
        ...payload,
      })
    }
    onClose()
  }

  const handleDelete = async () => {
    if (!existing || isPending) return
    await supprimer.mutateAsync(existing.id)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existing ? 'Modifier la cellule' : 'Planifier une commande'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {chaine.nom} — {formatSamediLong(samedi)}
          </p>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="numeroCommande">
              Numéro de commande <span className="text-destructive">*</span>
            </Label>
            <Input
              id="numeroCommande"
              placeholder="Ex : 79-PO33341"
              value={numeroCommande}
              onChange={(e) => setNumeroCommande(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quantite">Quantité (matelas)</Label>
            <Input
              id="quantite"
              type="number"
              min={0}
              placeholder="Optionnel"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optionnel"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="estLivree"
              checked={estLivree}
              onCheckedChange={(v) => setEstLivree(!!v)}
              disabled={isPending}
            />
            <Label htmlFor="estLivree" className="font-normal cursor-pointer">
              Production livrée
            </Label>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <div>
            {existing && (
              <ConfirmDialog
                title={`Supprimer « ${existing.numeroCommande} » ?`}
                description={`La commande sera retirée du planning du ${formatSamediLong(samedi)} sur ${chaine.nom}.`}
                onConfirm={handleDelete}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={isPending}
                  >
                    <Trash2 className="size-3.5" />
                    Supprimer
                  </Button>
                }
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending || !numeroCommande.trim()}>
              {isPending ? 'Enregistrement…' : existing ? 'Mettre à jour' : 'Planifier'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Gestion des chaînes de production ────────────────────────────────────────

type ChaineListItem = {
  id: number
  nom: string
  type: string
  estActif: boolean
}

function GestionChainesDialog({
  open,
  onClose,
  chaines,
}: {
  open: boolean
  onClose: () => void
  chaines: ChainePlanning[]
}) {
  const qc = useQueryClient()
  const { data: chainesToutes } = useGetChainesProduction()
  const createChaine = useCreateChaineProduction()
  const desactiverChaine = useDesactiverChaineProduction()

  const [nom, setNom] = useState('')
  const [typeChaine, setTypeChaine] = useState<string>(TYPES_CHAINE[0])

  const liste: ChaineListItem[] =
    chainesToutes && chainesToutes.length > 0
      ? chainesToutes.map((c) => ({ id: c.id, nom: c.nom, type: c.typeChaine, estActif: c.estActif }))
      : chaines.map((c) => ({ id: c.id, nom: c.nom, type: c.type, estActif: true }))

  const rafraichir = () => {
    // Une nouvelle chaîne doit apparaître immédiatement dans la grille.
    qc.invalidateQueries({ queryKey: PLANNING_KEY })
    qc.invalidateQueries({ queryKey: ['chaines-production'] })
  }

  const handleCreate = async () => {
    if (!nom.trim()) return
    await createChaine.mutateAsync({ nom: nom.trim(), typeChaine })
    rafraichir()
    setNom('')
  }

  const handleDesactiver = async (c: ChaineListItem) => {
    await desactiverChaine.mutateAsync(c.id)
    rafraichir()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gérer les chaînes</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Les chaînes actives apparaissent dans la grille du planning.
          </p>
        </DialogHeader>

        <div className="space-y-2">
          {liste.length === 0 && (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Aucune chaîne de production. Ajoutez-en une ci-dessous.
            </p>
          )}
          {liste.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.nom}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {c.type.toLowerCase()}
                  {!c.estActif && ' · inactive'}
                </p>
              </div>
              {c.estActif ? (
                <PermissionGate module="commandes" mode="write">
                  <ConfirmDialog
                    title={`Désactiver « ${c.nom} » ?`}
                    description="La chaîne restera dans l'historique mais ne sera plus proposée dans le planning."
                    onConfirm={() => handleDesactiver(c)}
                    trigger={
                      <Button variant="outline" size="sm">
                        Désactiver
                      </Button>
                    }
                  />
                </PermissionGate>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
            </div>
          ))}
        </div>

        <PermissionGate module="commandes" mode="write">
          <div className="grid gap-3 border-t pt-4">
            <p className="text-sm font-medium">Ajouter une chaîne</p>
            <div className="grid gap-2">
              <Label htmlFor="nouvelleChaine">Nom</Label>
              <Input
                id="nouvelleChaine"
                placeholder="Ex : Chaine 4 - Emballage"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                disabled={createChaine.isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="typeChaine">Type</Label>
              <select
                id="typeChaine"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={typeChaine}
                onChange={(e) => setTypeChaine(e.target.value)}
                disabled={createChaine.isPending}
              >
                {TYPES_CHAINE.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" onClick={handleCreate} disabled={createChaine.isPending || !nom.trim()}>
              {createChaine.isPending ? 'Ajout…' : 'Ajouter la chaîne'}
            </Button>
          </div>
        </PermissionGate>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Contenu d'une cellule ─────────────────────────────────────────────────────

function CellContent({
  entry,
  onEdit,
  onDelete,
}: {
  entry?: PlanningEntry
  onEdit: () => void
  onDelete: (entry: PlanningEntry) => void
}) {
  if (!entry) {
    return (
      <PermissionGate module="planning" mode="write">
        <button
          type="button"
          onClick={onEdit}
          title="Planifier une commande"
          className="flex h-full min-h-12 w-full items-center justify-center rounded-md border border-dashed border-border text-muted-foreground/60 transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus className="size-4" />
        </button>
      </PermissionGate>
    )
  }

  return (
    <PermissionGate module="planning" mode="write">
      <div className="group flex min-h-12 w-full items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2 py-1">
        <div className="min-w-0 flex-1 text-left">
          <button
            type="button"
            onClick={onEdit}
            title={`Modifier ${entry.numeroCommande}`}
            className="block w-full cursor-pointer text-left"
          >
            <span className="block truncate text-sm font-medium">{entry.numeroCommande}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {entry.estLivree ? (
                <CheckCircle2 className="size-3 text-emerald-500" />
              ) : (
                <Circle className="size-3" />
              )}
              {entry.estLivree ? 'Livrée' : 'En cours'}
              {entry.quantite != null && <> · {entry.quantite}</>}
            </span>
          </button>
        </div>
        <div className="flex shrink-0 flex-col gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon-xs" title="Modifier" onClick={onEdit}>
            <Pencil className="size-3" />
          </Button>
          <ConfirmDialog
            title={`Supprimer « ${entry.numeroCommande} » ?`}
            description="La commande sera retirée du planning."
            onConfirm={() => onDelete(entry)}
            trigger={
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:text-destructive"
                title="Supprimer"
              >
                <Trash2 className="size-3" />
              </Button>
            }
          />
        </div>
      </div>
    </PermissionGate>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const { data: grille, isLoading } = useGetPlanningGrille()
  const supprimer = useSupprimerPlanningEntry()

  const [startSamedi, setStartSamedi] = useState(prochainSamedi)
  const [nbSemaines, setNbSemaines] = useState(8)
  const [gestionOuverte, setGestionOuverte] = useState(false)

  const samedis = useMemo(() => samedisPour(startSamedi, nbSemaines), [startSamedi, nbSemaines])
  const chaines = grille?.chaines ?? []
  const cellules = grille?.cellules ?? []

  const [cell, setCell] = useState<
    { chaine: ChainePlanning; samedi: Date; entry?: PlanningEntry } | null
  >(null)

  const entryFor = (chaineId: number, samedi: Date): PlanningEntry | undefined =>
    cellules.find(
      (e) =>
        e.chaineProductionId === chaineId &&
        dateKeyOf(e.dateSamedi) === toIsoDate(samedi),
    )

  const totalPlanifiees = cellules.length
  const totalLivrees = cellules.filter((e) => e.estLivree).length

  const openCell = (chaine: ChainePlanning, samedi: Date, entry?: PlanningEntry) =>
    setCell({ chaine, samedi, entry })
  const closeCell = () => setCell(null)

  const revenirAujourdHui = () => {
    setStartSamedi(prochainSamedi())
    setNbSemaines(8)
  }

  const changerDateDepart = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(d.getTime())) return
    const diff = (6 - d.getDay() + 7) % 7
    d.setDate(d.getDate() + diff)
    setStartSamedi(d)
  }

  return (
    <div>
      <PageHeader
        title="Planning de production"
        description="Grille hebdomadaire : commandes de matelas placées par chaîne de production et par samedi d'export."
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              {totalLivrees} livrées
            </Badge>
            <Badge variant="outline" className="gap-1">
              <CalendarRange className="size-3.5" />
              {totalPlanifiees} commandes planifiées
            </Badge>
          </div>
        }
      />

      {/* Navigation par semaines */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setStartSamedi(ajouterSemaines(startSamedi, -1))}>
          <ChevronLeft className="size-4" />
          Semaine préc.
        </Button>
        <Button variant="outline" size="sm" onClick={() => setStartSamedi(ajouterSemaines(startSamedi, 1))}>
          Semaine suiv.
          <ChevronRight className="size-4" />
        </Button>
        <input
          type="date"
          aria-label="Date de départ des semaines"
          className="h-8 rounded-md border border-input bg-card px-2 text-sm"
          value={toIsoDate(startSamedi)}
          onChange={(e) => changerDateDepart(e.target.value)}
        />
        <Button variant="ghost" size="sm" onClick={revenirAujourdHui}>
          Aujourd&apos;hui
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setNbSemaines((n) => Math.min(n + 1, 12))}
          disabled={nbSemaines >= 12}
        >
          + Semaine
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setGestionOuverte(true)}>
          <Settings2 className="size-4" />
          Gérer les chaînes
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        {chaines.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-medium">Aucune chaîne de production active</p>
            <p className="text-sm text-muted-foreground">
              Créez une chaîne via « Gérer les chaînes » pour commencer.
            </p>
            <Button variant="outline" size="sm" onClick={() => setGestionOuverte(true)}>
              <Settings2 className="size-4" />
              Ouvrir la gestion
            </Button>
          </div>
        )}

        {chaines.length > 0 && (
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="sticky left-0 z-10 w-48 border-r bg-muted/40 px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Chaîne
                </th>
                {samedis.map((s) => (
                  <th
                    key={toIsoDate(s)}
                    className="min-w-36 px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    {formatSamedi(s)} / {s.getFullYear()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chaines.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <th className="sticky left-0 z-10 border-r bg-card px-3 py-2.5 text-left align-top text-sm font-medium whitespace-nowrap">
                    {c.nom}
                    <span className="block text-xs font-normal capitalize text-muted-foreground">
                      {c.type.toLowerCase()}
                    </span>
                  </th>
                  {samedis.map((s) => {
                    const entry = entryFor(c.id, s)
                    return (
                      <td key={toIsoDate(s)} className="w-36 px-2 py-1.5 align-top">
                        <CellContent
                          entry={entry}
                          onEdit={() => openCell(c, s, entry)}
                          onDelete={(e) => supprimer.mutate(e.id)}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {isLoading && (
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="sticky left-0 z-10 w-48 border-r bg-muted/40 px-3 py-2.5 text-left">
                  Chaîne
                </th>
                {samedis.map((s) => (
                  <th key={toIsoDate(s)} className="px-3 py-2.5 text-left">
                    {formatSamedi(s)} / {s.getFullYear()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((r) => (
                <tr key={r} className="border-b last:border-0">
                  <th className="sticky left-0 z-10 border-r bg-card px-3 py-3 text-left">
                    <Skeleton className="h-4 w-28" />
                  </th>
                  {samedis.map((s) => (
                    <td key={toIsoDate(s)} className="px-2 py-1.5">
                      <Skeleton className="h-12 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {cell && (
        <CellEditorDialog
          key={`${cell.chaine.id}-${toIsoDate(cell.samedi)}-${cell.entry?.id ?? 'new'}`}
          open={!!cell}
          onClose={closeCell}
          chaine={cell.chaine}
          samedi={cell.samedi}
          existing={cell.entry}
        />
      )}

      {gestionOuverte && (
        <GestionChainesDialog
          open={gestionOuverte}
          onClose={() => setGestionOuverte(false)}
          chaines={chaines}
        />
      )}
    </div>
  )
}