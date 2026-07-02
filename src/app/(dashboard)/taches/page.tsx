'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { Plus, Play, AlertTriangle, RotateCcw, CheckCircle, XCircle, BarChart3, Zap } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import {
  useGetTaches,
  useGetTachesDashboard,
  useCreateTache,
  useCommencerTache,
  useMettreAJourAvancement,
  useBloquerTache,
  useDebloquerTache,
  useTerminerTache,
  useAnnulerTache,
} from '@/hooks/use-taches'
import { PRIORITE_TACHE } from '@/types/tache'
import type { TacheProduction } from '@/types/tache'
import { tacheSchema } from '@/lib/validations/tache'
import type { TacheSchema } from '@/lib/validations/tache'

// ── Constants ──────────────────────────────────────────────────────────────────

const COLUMNS = [
  { statut: 0, label: 'Non commencée', headerClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { statut: 1, label: 'En cours',      headerClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  { statut: 2, label: 'Bloquée',       headerClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { statut: 3, label: 'Terminée',      headerClass: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
  { statut: 4, label: 'Annulée',       headerClass: 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500' },
]

const PRIORITE_CFG: Record<number, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  0: { variant: 'secondary' },
  1: { variant: 'outline' },
  2: { variant: 'outline', className: 'border-orange-300 bg-orange-50 text-orange-700' },
  3: { variant: 'destructive' },
}

const PRIORITE_LABELS = ['Basse', 'Normale', 'Haute', 'Urgente'] as const

const PRIORITE_INT: Record<string, number> = { Basse: 0, Normale: 1, Haute: 2, Urgente: 3 }

function toTachePayload(data: TacheSchema) {
  return {
    titre: data.titre,
    description: data.description || null,
    commandeClientId: data.commandeClientId || null,
    equipeAssignee: data.equipeAssignee || null,
    responsableAssigne: data.responsableAssigne || null,
    priorite: PRIORITE_INT[data.priorite] ?? 1,
    dateDebutPrevue: data.dateDebutPrevue || null,
    dateFinPrevue: data.dateFinPrevue || null,
    dureeEstimeeHeures: data.dureeEstimeeHeures ?? 0,
    creePar: data.creePar || null,
  }
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string
  value: string | number
  sub?: string
  icon: ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold leading-none">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Dialogs ───────────────────────────────────────────────────────────────────

function NouvellesTacheDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createMutation = useCreateTache()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TacheSchema>({
    resolver: zodResolver(tacheSchema),
    defaultValues: {
      titre: '',
      description: null,
      commandeClientId: null,
      equipeAssignee: null,
      responsableAssigne: null,
      priorite: 'Normale',
      dateDebutPrevue: null,
      dateFinPrevue: null,
      dureeEstimeeHeures: 0,
      creePar: null,
    },
  })

  const onSubmit = async (data: TacheSchema) => {
    await createMutation.mutateAsync(toTachePayload(data) as Record<string, unknown>)
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche de production</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-3 py-2">
            <div className="grid gap-1.5">
              <Label>Titre <span className="text-destructive">*</span></Label>
              <Input {...register('titre')} />
              {errors.titre && (
                <p className="text-xs text-destructive">{errors.titre.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Textarea rows={2} {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Équipe</Label>
                <Input {...register('equipeAssignee')} placeholder="Ex : Équipe A" />
              </div>
              <div className="grid gap-1.5">
                <Label>Responsable</Label>
                <Input {...register('responsableAssigne')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Priorité</Label>
                <Controller
                  name="priorite"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITE_LABELS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Durée estimée (h)</Label>
                <Input
                  type="number"
                  min="0"
                  {...register('dureeEstimeeHeures', {
                    setValueAs: (v) => (v === '' || isNaN(Number(v)) ? 0 : Number(v)),
                  })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Début prévu</Label>
                <Input type="date" {...register('dateDebutPrevue')} />
              </div>
              <div className="grid gap-1.5">
                <Label>Fin prévue</Label>
                <Input type="date" {...register('dateFinPrevue')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>ID Commande (optionnel)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex : 5"
                  {...register('commandeClientId', {
                    setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                  })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Créé par</Label>
                <Input {...register('creePar')} />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Dialogs de transition — montés avec key=tache.id pour fresh state à chaque ouverture

function CommencerDialog({ tache, onClose }: { tache: TacheProduction; onClose: () => void }) {
  const [responsable, setResponsable] = useState('')
  const mutation = useCommencerTache()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!responsable.trim()) return
    await mutation.mutateAsync({ id: tache.id, responsable: responsable.trim() })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Commencer la tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-2">
            <p className="mb-3 text-sm text-muted-foreground">{tache.titre}</p>
            <div className="grid gap-1.5">
              <Label>
                Responsable assigné <span className="text-destructive">*</span>
              </Label>
              <Input
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Nom du responsable"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!responsable.trim() || mutation.isPending}>
              {mutation.isPending ? 'Démarrage…' : 'Commencer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AvancementDialog({ tache, onClose }: { tache: TacheProduction; onClose: () => void }) {
  const [pct, setPct] = useState(Number(tache.pourcentageAvancement))
  const mutation = useMettreAJourAvancement()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await mutation.mutateAsync({ id: tache.id, pourcentage: pct })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mettre à jour l&apos;avancement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-2">
            <p className="mb-3 text-sm text-muted-foreground">{tache.titre}</p>
            <div className="grid gap-1.5">
              <Label>Pourcentage d&apos;avancement</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={pct}
                  onChange={(e) =>
                    setPct(Math.min(100, Math.max(0, Number(e.target.value))))
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              {pct >= 100 && (
                <p className="text-xs text-green-600">
                  ≥ 100 % → la tâche sera automatiquement terminée par le backend
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Mise à jour…' : 'Valider'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BloquerDialog({ tache, onClose }: { tache: TacheProduction; onClose: () => void }) {
  const [motif, setMotif] = useState('')
  const mutation = useBloquerTache()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motif.trim()) return
    await mutation.mutateAsync({ id: tache.id, motif: motif.trim() })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Bloquer la tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-2">
            <p className="mb-3 text-sm text-muted-foreground">{tache.titre}</p>
            <div className="grid gap-1.5">
              <Label>
                Motif du blocage <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Décrire le problème…"
                rows={3}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={!motif.trim() || mutation.isPending}
            >
              {mutation.isPending ? 'Blocage…' : 'Bloquer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TerminerDialog({ tache, onClose }: { tache: TacheProduction; onClose: () => void }) {
  const [notes, setNotes] = useState('')
  const mutation = useTerminerTache()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await mutation.mutateAsync({ id: tache.id, notes: notes || null })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Terminer la tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-2">
            <p className="mb-3 text-sm text-muted-foreground">{tache.titre}</p>
            <div className="grid gap-1.5">
              <Label>Notes de progression (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Résumé des travaux, observations…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Finalisation…' : 'Terminer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Tache Card ─────────────────────────────────────────────────────────────────

type DialogType = 'commencer' | 'avancement' | 'bloquer' | 'terminer'

function TacheCard({
  tache,
  onOpenDialog,
}: {
  tache: TacheProduction
  onOpenDialog: (type: DialogType, tache: TacheProduction) => void
}) {
  const debloquerMutation = useDebloquerTache()
  const annulerMutation = useAnnulerTache()

  const isTerminal = tache.statut === 3 || tache.statut === 4
  const isEnRetard =
    tache.dateFinPrevue != null &&
    new Date(tache.dateFinPrevue) < new Date() &&
    tache.statut !== 3
  const cfg = PRIORITE_CFG[tache.priorite] ?? { variant: 'secondary' as const }

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3 shadow-sm">
      {/* Titre + priorité */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{tache.titre}</p>
        <Badge variant={cfg.variant} className={`shrink-0 text-xs ${cfg.className ?? ''}`}>
          {PRIORITE_TACHE[tache.priorite]}
        </Badge>
      </div>

      {/* Commande liée */}
      {tache.commandeClient && (
        <p className="text-xs text-muted-foreground">
          {tache.commandeClient.numeroCommande}
          {tache.commandeClient.client?.nom ? ` · ${tache.commandeClient.client.nom}` : ''}
        </p>
      )}

      {/* Responsable */}
      {tache.responsableAssigne && (
        <p className="text-xs text-muted-foreground">👤 {tache.responsableAssigne}</p>
      )}

      {/* Barre avancement (sauf NonCommence et Annule) */}
      {tache.statut !== 0 && tache.statut !== 4 && (
        <div className="space-y-0.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                tache.pourcentageAvancement >= 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${tache.pourcentageAvancement}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{tache.pourcentageAvancement}%</p>
        </div>
      )}

      {/* Motif blocage */}
      {tache.statut === 2 && tache.problemesBloques && (
        <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
          ⚠ {tache.problemesBloques}
        </p>
      )}

      {/* Échéance */}
      {tache.dateFinPrevue && (
        <p
          className={`text-xs ${
            isEnRetard ? 'font-medium text-destructive' : 'text-muted-foreground'
          }`}
        >
          {isEnRetard ? '⚠ En retard · ' : ''}
          Échéance : {new Date(tache.dateFinPrevue).toLocaleDateString('fr-FR')}
        </p>
      )}

      {/* Boutons d'action */}
      {!isTerminal && (
        <PermissionGate module="taches" mode="write">
          <div className="flex flex-wrap gap-1 pt-1">
            {tache.statut === 0 && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => onOpenDialog('commencer', tache)}
              >
                <Play className="size-3" /> Commencer
              </Button>
            )}

            {tache.statut === 1 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onOpenDialog('avancement', tache)}
                >
                  % Avancement
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onOpenDialog('bloquer', tache)}
                >
                  Bloquer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onOpenDialog('terminer', tache)}
                >
                  <CheckCircle className="size-3" /> Terminer
                </Button>
              </>
            )}

            {tache.statut === 2 && (
              <ConfirmDialog
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={debloquerMutation.isPending}
                  >
                    <RotateCcw className="size-3" /> Débloquer
                  </Button>
                }
                title="Débloquer cette tâche ?"
                description="La tâche repassera à l'état En cours."
                confirmLabel="Débloquer"
                onConfirm={() => debloquerMutation.mutate(tache.id)}
              />
            )}

            {/* Annuler — disponible pour NonCommence (0), EnCours (1), Bloque (2) */}
            <ConfirmDialog
              trigger={
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  disabled={annulerMutation.isPending}
                >
                  <XCircle className="size-3" /> Annuler
                </Button>
              }
              title="Annuler cette tâche ?"
              description="Cette action est irréversible. La tâche passera à l'état Annulée."
              confirmLabel="Annuler la tâche"
              onConfirm={() => annulerMutation.mutate(tache.id)}
            />
          </div>
        </PermissionGate>
      )}
    </div>
  )
}

// ── Kanban Column ──────────────────────────────────────────────────────────────

function KanbanColumn({
  label,
  headerClass,
  taches,
  onOpenDialog,
}: {
  statut: number
  label: string
  headerClass: string
  taches: TacheProduction[]
  onOpenDialog: (type: DialogType, tache: TacheProduction) => void
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30">
      <div className={`flex items-center justify-between rounded-t-lg px-3 py-2 ${headerClass}`}>
        <span className="text-sm font-semibold">{label}</span>
        <span className="rounded-full bg-white/50 px-1.5 text-xs font-bold">{taches.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: '62vh' }}>
        {taches.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Aucune tâche</p>
        )}
        {taches.map((t) => (
          <TacheCard key={t.id} tache={t} onOpenDialog={onOpenDialog} />
        ))}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TachesPage() {
  const { data: taches, isLoading } = useGetTaches()
  const { data: dashboard } = useGetTachesDashboard()

  const [filterEquipe, setFilterEquipe] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [activeDialog, setActiveDialog] = useState<{
    type: DialogType
    tache: TacheProduction
  } | null>(null)

  const filtered = useMemo(() => {
    if (!taches) return []
    return taches.filter((t) => {
      if (
        filterEquipe &&
        !t.equipeAssignee?.toLowerCase().includes(filterEquipe.toLowerCase())
      )
        return false
      if (filterSearch && !t.titre.toLowerCase().includes(filterSearch.toLowerCase()))
        return false
      return true
    })
  }, [taches, filterEquipe, filterSearch])

  const byColumn = useMemo(() => {
    const result: Record<number, TacheProduction[]> = {}
    for (const col of COLUMNS) {
      result[col.statut] = filtered.filter((t) => t.statut === col.statut)
    }
    return result
  }, [filtered])

  const handleOpenDialog = (type: DialogType, tache: TacheProduction) =>
    setActiveDialog({ type, tache })

  const handleCloseDialog = () => setActiveDialog(null)

  return (
    <div>
      <PageHeader
        title="Tâches de production"
        action={
          <PermissionGate module="taches" mode="write">
            <Button size="sm" onClick={() => setNewDialogOpen(true)}>
              <Plus className="size-4" /> Nouvelle tâche
            </Button>
          </PermissionGate>
        }
      />

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          title="Total tâches"
          value={dashboard?.totalTaches ?? '—'}
          icon={<BarChart3 className="size-5" />}
        />
        <KpiCard
          title="En cours"
          value={dashboard?.enCours ?? '—'}
          sub={
            dashboard
              ? `Avancement moyen : ${dashboard.avancementMoyen.toFixed(0)}%`
              : undefined
          }
          icon={<Play className="size-5" />}
        />
        <KpiCard
          title="Bloquées"
          value={dashboard?.bloquees ?? '—'}
          sub={
            dashboard && dashboard.tachesEnRetard > 0
              ? `${dashboard.tachesEnRetard} en retard`
              : undefined
          }
          icon={<AlertTriangle className="size-5" />}
        />
        <KpiCard
          title="Urgentes"
          value={dashboard?.tachesUrgentes ?? '—'}
          icon={<Zap className="size-5" />}
        />
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher par titre…"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <Input
          placeholder="Filtrer par équipe…"
          value={filterEquipe}
          onChange={(e) => setFilterEquipe(e.target.value)}
          className="w-full sm:max-w-xs"
        />
      </div>

      {/* Kanban — mobile : onglets, desktop : colonnes horizontales */}
      {isLoading ? (
        <>
          <div className="sm:hidden space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <div className="hidden sm:flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-72 shrink-0 rounded-lg" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Mobile : une colonne à la fois via Tabs */}
          <div className="sm:hidden">
            <Tabs defaultValue={String(COLUMNS[0].statut)}>
              <div className="mb-3 overflow-x-auto">
                <TabsList>
                  {COLUMNS.map((col) => (
                    <TabsTrigger key={col.statut} value={String(col.statut)}>
                      {col.label}
                      <span className="ml-1 text-xs opacity-70">
                        ({byColumn[col.statut]?.length ?? 0})
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {COLUMNS.map((col) => (
                <TabsContent key={col.statut} value={String(col.statut)}>
                  <div className="rounded-lg border bg-muted/30">
                    <div className={`flex items-center justify-between rounded-t-lg px-3 py-2 ${col.headerClass}`}>
                      <span className="text-sm font-semibold">{col.label}</span>
                      <span className="rounded-full bg-white/50 px-1.5 text-xs font-bold">
                        {byColumn[col.statut]?.length ?? 0}
                      </span>
                    </div>
                    <div className="space-y-2 p-2">
                      {(byColumn[col.statut] ?? []).length === 0 && (
                        <p className="py-8 text-center text-xs text-muted-foreground">Aucune tâche</p>
                      )}
                      {(byColumn[col.statut] ?? []).map((t) => (
                        <TacheCard key={t.id} tache={t} onOpenDialog={handleOpenDialog} />
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Desktop : toutes les colonnes côte à côte */}
          <div className="hidden sm:flex gap-3 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.statut}
                statut={col.statut}
                label={col.label}
                headerClass={col.headerClass}
                taches={byColumn[col.statut] ?? []}
                onOpenDialog={handleOpenDialog}
              />
            ))}
          </div>
        </>
      )}

      {/* Dialog création */}
      <NouvellesTacheDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} />

      {/* Dialogs de transition — key=tache.id pour fresh state */}
      {activeDialog?.type === 'commencer' && (
        <CommencerDialog
          key={activeDialog.tache.id}
          tache={activeDialog.tache}
          onClose={handleCloseDialog}
        />
      )}
      {activeDialog?.type === 'avancement' && (
        <AvancementDialog
          key={activeDialog.tache.id}
          tache={activeDialog.tache}
          onClose={handleCloseDialog}
        />
      )}
      {activeDialog?.type === 'bloquer' && (
        <BloquerDialog
          key={activeDialog.tache.id}
          tache={activeDialog.tache}
          onClose={handleCloseDialog}
        />
      )}
      {activeDialog?.type === 'terminer' && (
        <TerminerDialog
          key={activeDialog.tache.id}
          tache={activeDialog.tache}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  )
}
