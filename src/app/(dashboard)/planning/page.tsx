'use client'

import { useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  CalendarRange,
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
import { useGetChainesProduction } from '@/hooks/use-fournitures'
import {
  useGetPlanningEntries,
  useCreerPlanningEntry,
  useModifierPlanningEntry,
  useSupprimerPlanningEntry,
} from '@/hooks/use-planning'
import type { ChaineProduction } from '@/types/fourniture'
import type { PlanningEntry } from '@/types/planning'

// Chaînes affichées si l'API /api/ChaineProduction n'est pas encore branchée.
const FALLBACK_CHAINES: ChaineProduction[] = [
  { id: 1, nom: 'Chaine 1 - Découpe', typeChaine: 'Decoupe', estActif: true, nombreEnvois: 0, nombreExports: 0 },
  { id: 2, nom: 'Chaine 2 - Confection', typeChaine: 'Confection', estActif: true, nombreEnvois: 0, nombreExports: 0 },
  { id: 3, nom: 'Chaine 3 - Conditionnement', typeChaine: 'Conditionnement', estActif: true, nombreEnvois: 0, nombreExports: 0 },
]

// Clé de cellule (format YYYY-MM-DD) pour comparer les samedis entres grille et entries.
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
  return `Samedi ${dd}/${mm}`
}

// Les 8 samedis : samedi de la semaine en cours + les 7 suivants.
function getSamedis(): Date[] {
  const now = new Date()
  const diff = (6 - now.getDay() + 7) % 7
  const first = new Date(now)
  first.setDate(now.getDate() + diff)
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(first)
    d.setDate(first.getDate() + i * 7)
    return d
  })
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
  chaine: ChaineProduction
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
    if (!numeroCommande.trim()) return
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
    if (!existing) return
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
            {chaine.nom} — {formatSamedi(samedi)}
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
                description={`La commande sera retirée du planning du ${formatSamedi(samedi)} sur ${chaine.nom}.`}
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

export default function PlanningPage() {
  const { data: chainesApi, isLoading: isLoadingChaines } = useGetChainesProduction()
  const { data: entries, isLoading: isLoadingEntries } = useGetPlanningEntries()
  const supprimer = useSupprimerPlanningEntry()

  const [cell, setCell] = useState<
    { chaine: ChaineProduction; samedi: Date; entry?: PlanningEntry } | null
  >(null)

  const samedis = getSamedis()

  const chainesUselles =
    chainesApi && chainesApi.length > 0
      ? chainesApi.filter((c) => c.estActif)
      : FALLBACK_CHAINES

  const isLoading = isLoadingChaines || isLoadingEntries

  const entryFor = (chaineId: number, samedi: Date): PlanningEntry | undefined =>
    entries?.find(
      (e) =>
        e.chaineProductionId === chaineId &&
        dateKeyOf(e.dateSamedi) === toIsoDate(samedi),
    )

  const totalPlanifiees = entries?.length ?? 0
  const totalLivrees = entries?.filter((e) => e.estLivree).length ?? 0

  const openCell = (chaine: ChaineProduction, samedi: Date, entry?: PlanningEntry) =>
    setCell({ chaine, samedi, entry })
  const closeCell = () => setCell(null)

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

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 w-32 border-r bg-muted/40 px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Samedi
              </th>
              {chainesUselles.map((c) => (
                <th
                  key={c.id}
                  className="min-w-44 px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  {c.nom}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              samedis.map((s) => (
                <tr key={toIsoDate(s)} className="border-b last:border-0">
                  <th className="sticky left-0 z-10 border-r bg-card px-3 py-3 text-left align-top whitespace-nowrap font-medium">
                    {formatSamedi(s)}
                  </th>
                  {chainesUselles.map((c) => (
                    <td key={c.id} className="px-2 py-1.5 align-middle">
                      <Skeleton className="h-12 w-full" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading &&
              samedis.map((s) => (
                <tr key={toIsoDate(s)} className="border-b last:border-0">
                  <th className="sticky left-0 z-10 border-r bg-card px-3 py-2.5 text-left align-top text-sm font-medium whitespace-nowrap">
                    {formatSamedi(s)}
                  </th>
                  {chainesUselles.map((c) => {
                    const entry = entryFor(c.id, s)
                    return (
                      <td key={c.id} className="w-44 px-2 py-1.5 align-top">
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
    </div>
  )
}