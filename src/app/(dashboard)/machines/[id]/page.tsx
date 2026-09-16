'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/page-header'
import { PermissionGate } from '@/components/auth/permission-gate'
import {
  useGetMachine,
  useGetMachineInterventions,
  useCreateIntervention,
} from '@/hooks/use-machines'
import {
  TYPE_INTERVENTION_VALUES,
  type InterventionMachine,
  type TypeIntervention,
} from '@/types/machine'

const interventionSchema = z.object({
  typeIntervention: z.string().min(1, 'Type requis'),
  dateIntervention: z.string().nullable(),
  description: z.string().min(1, 'Description requise').max(1000),
  pannneConstatee: z.string().max(1000).nullable(),
  piecesRemplacees: z.string().max(500).nullable(),
  coutIntervention: z.string().nullable(),
  dureeImmobilisationHeures: z.string().nullable(),
  effectuePar: z.string().max(100).nullable(),
  prochaineDateMaintenance: z.string().nullable(),
  notes: z.string().max(1000).nullable(),
})
type InterventionSchema = z.infer<typeof interventionSchema>

const DEFAULT_INTERVENTION: InterventionSchema = {
  typeIntervention: 'Preventive',
  dateIntervention: null,
  description: '',
  pannneConstatee: null,
  piecesRemplacees: null,
  coutIntervention: null,
  dureeImmobilisationHeures: null,
  effectuePar: null,
  prochaineDateMaintenance: null,
  notes: null,
}

function toNull(v: unknown) {
  if (typeof v !== 'string' || !v.trim()) return null
  return v
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—'

function fmtMontant(n: number | null) {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' DT'
}

function InterventionBadge({ t }: { t: TypeIntervention }) {
  return t === 'Preventive' ? (
    <Badge variant="outline" className="border-blue-200 bg-blue-100 text-blue-800">
      Préventive
    </Badge>
  ) : (
    <Badge variant="outline" className="border-red-200 bg-red-100 text-red-700">
      Corrective
    </Badge>
  )
}

function FicheRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  )
}

function AddInterventionDialog({
  machineId,
  open,
  onClose,
}: {
  machineId: number
  open: boolean
  onClose: () => void
}) {
  const createMutation = useCreateIntervention(machineId)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InterventionSchema>({
    resolver: zodResolver(interventionSchema),
    defaultValues: DEFAULT_INTERVENTION,
  })

  const onSubmit = async (data: InterventionSchema) => {
    await createMutation.mutateAsync({
      typeIntervention: data.typeIntervention as TypeIntervention,
      dateIntervention: data.dateIntervention || undefined,
      description: data.description,
      pannneConstatee: toNull(data.pannneConstatee),
      piecesRemplacees: toNull(data.piecesRemplacees),
      coutIntervention: data.coutIntervention ? Number(data.coutIntervention) : null,
      dureeImmobilisationHeures: data.dureeImmobilisationHeures
        ? Number(data.dureeImmobilisationHeures)
        : null,
      effectuePar: toNull(data.effectuePar),
      prochaineDateMaintenance: data.prochaineDateMaintenance || null,
      notes: toNull(data.notes),
    })
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une intervention</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="typeIntervention">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch('typeIntervention')}
                onValueChange={(v) => setValue('typeIntervention', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_INTERVENTION_VALUES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === 'Preventive' ? 'Préventive' : 'Corrective'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateIntervention">Date</Label>
              <Input id="dateIntervention" type="date" {...register('dateIntervention')} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea id="description" rows={2} {...register('description')} />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pannneConstatee">Panne constatée</Label>
            <Textarea id="pannneConstatee" rows={2} {...register('pannneConstatee')} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="piecesRemplacees">Pièces remplacées</Label>
              <Input id="piecesRemplacees" {...register('piecesRemplacees')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coutIntervention">Coût (DT)</Label>
              <Input
                id="coutIntervention"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register('coutIntervention')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="dureeImmobilisationHeures">Durée d&apos;immobilisation (h)</Label>
              <Input
                id="dureeImmobilisationHeures"
                type="number"
                inputMode="numeric"
                {...register('dureeImmobilisationHeures')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="effectuePar">Effectué par</Label>
              <Input id="effectuePar" {...register('effectuePar')} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="prochaineDateMaintenance">Prochaine date de maintenance</Label>
            <Input id="prochaineDateMaintenance" type="date" {...register('prochaineDateMaintenance')} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function MachineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const machineId = Number(id)
  const { data: machine, isLoading } = useGetMachine(machineId)
  const { data: interventions, isLoading: loadingInt } = useGetMachineInterventions(
    machineId,
    !isLoading,
  )
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (!machine) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Machine introuvable.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/machines">
            <ArrowLeft className="size-4" />
            Retour au parc
          </Link>
        </Button>
      </div>
    )
  }

  const interventionsOrdered = [...(interventions ?? [])].sort(
    (a, b) => new Date(b.dateIntervention).getTime() - new Date(a.dateIntervention).getTime(),
  )

  return (
    <div>
      <PageHeader
        title={machine.codeMachine}
        description={machine.marque ?? machine.modele ?? undefined}
        action={
          <PermissionGate module="machines" mode="write">
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Wrench className="size-4" />
              Ajouter une intervention
            </Button>
          </PermissionGate>
        }
      />

      <Button variant="ghost" size="sm" className="mb-4" asChild>
        <Link href="/machines">
          <ArrowLeft className="size-4" />
          Retour au parc
        </Link>
      </Button>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fiche machine</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <FicheRow label="Type" value={machine.typeMachine} />
              <FicheRow label="Marque" value={machine.marque ?? '—'} />
              <FicheRow label="Modèle" value={machine.modele ?? '—'} />
              <FicheRow label="N° de série" value={machine.numeroSerie ?? '—'} />
              <FicheRow label="Emplacement" value={machine.emplacement ?? '—'} />
              <FicheRow label="Date d'acquisition" value={fmtDate(machine.dateAcquisition)} />
              <FicheRow label="Interventions" value={String(machine.nombreInterventions)} />
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Statut</dt>
                <Badge
                  variant="outline"
                  className={
                    machine.statut === 'EnService'
                      ? 'border-green-200 bg-green-100 text-green-800'
                      : machine.statut === 'EnMaintenance'
                        ? 'border-amber-200 bg-amber-100 text-amber-800'
                        : machine.statut === 'HorsService'
                          ? 'border-red-200 bg-red-100 text-red-700'
                          : 'border-slate-200 bg-slate-100 text-slate-600'
                  }
                >
                  {machine.statut}
                </Badge>
              </div>
              <div className="py-2">
                <dt className="mb-1 text-sm text-muted-foreground">Notes</dt>
                <dd className="whitespace-pre-wrap text-sm">{machine.notes ?? '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Historique des interventions</CardTitle>
            <span className="text-sm text-muted-foreground">
              {interventionsOrdered.length} intervention(s)
            </span>
          </CardHeader>
          <CardContent>
            {loadingInt ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : interventionsOrdered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Aucune intervention enregistrée pour cette machine.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Coût (DT)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interventionsOrdered.map((i: InterventionMachine) => (
                    <TableRow key={i.id}>
                      <TableCell className="whitespace-nowrap">
                        {fmtDate(i.dateIntervention)}
                      </TableCell>
                      <TableCell>
                        <InterventionBadge t={i.typeIntervention} />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="truncate" title={i.description}>
                            {i.description}
                          </p>
                          {i.pannneConstatee && (
                            <p className="truncate text-xs text-muted-foreground" title={'Panne constatée : ' + i.pannneConstatee}>
                              Panne constatée : {i.pannneConstatee}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtMontant(i.coutIntervention)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {dialogOpen && (
        <AddInterventionDialog
          machineId={machineId}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  )
}