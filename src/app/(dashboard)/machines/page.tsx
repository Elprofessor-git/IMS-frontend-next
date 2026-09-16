'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, CableCar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { PaginatedResponsiveTable } from '@/components/shared/paginated-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useGetMachines,
  useCreateMachine,
  useUpdateMachine,
  useDeleteMachine,
} from '@/hooks/use-machines'
import {
  TYPE_MACHINE_VALUES,
  STATUT_MACHINE_VALUES,
  type Machine,
  type TypeMachine,
  type StatutMachine,
  type CreateMachinePayload,
} from '@/types/machine'

const machineSchema = z.object({
  codeMachine: z.string().min(1, 'Code requis').max(50),
  marque: z.string().max(100).nullable(),
  modele: z.string().max(100).nullable(),
  numeroSerie: z.string().max(100).nullable(),
  typeMachine: z.string().min(1, 'Type requis'),
  dateAcquisition: z.string().nullable(),
  emplacement: z.string().max(100).nullable(),
  statut: z.string().min(1, 'Statut requis'),
  notes: z.string().max(1000).nullable(),
})
type MachineSchema = z.infer<typeof machineSchema>

const DEFAULT_VALUES: MachineSchema = {
  codeMachine: '',
  marque: null,
  modele: null,
  numeroSerie: null,
  typeMachine: '' as TypeMachine,
  dateAcquisition: null,
  emplacement: null,
  statut: 'EnService' as StatutMachine,
  notes: null,
}

function unknownToNull(v: unknown) {
  return typeof v === 'string' && v.trim() ? v : null
}

function machineToSchema(m: Machine): MachineSchema {
  return {
    codeMachine: m.codeMachine,
    marque: m.marque,
    modele: m.modele,
    numeroSerie: m.numeroSerie,
    typeMachine: m.typeMachine,
    dateAcquisition: m.dateAcquisition,
    emplacement: m.emplacement,
    statut: m.statut,
    notes: m.notes,
  }
}

const STATUT_BADGE: Record<StatutMachine, string> = {
  EnService: 'border-green-200 bg-green-100 text-green-800',
  EnMaintenance: 'border-amber-200 bg-amber-100 text-amber-800',
  HorsService: 'border-red-200 bg-red-100 text-red-700',
  Reforme: 'border-slate-200 bg-slate-100 text-slate-600',
}

function MachineDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: Machine | null
}) {
  const createMutation = useCreateMachine()
  const updateMutation = useUpdateMachine()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MachineSchema>({
    resolver: zodResolver(machineSchema),
    defaultValues: editing ? machineToSchema(editing) : DEFAULT_VALUES,
  })

  const onSubmit = async (data: MachineSchema) => {
    const payload: CreateMachinePayload = {
      codeMachine: data.codeMachine,
      marque: unknownToNull(data.marque),
      modele: unknownToNull(data.modele),
      numeroSerie: unknownToNull(data.numeroSerie),
      typeMachine: data.typeMachine as TypeMachine,
      dateAcquisition: data.dateAcquisition || null,
      emplacement: unknownToNull(data.emplacement),
      statut: data.statut as StatutMachine,
      notes: unknownToNull(data.notes),
    }
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    reset()
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Modifier la machine' : 'Nouvelle machine'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="codeMachine">
              Code machine <span className="text-destructive">*</span>
            </Label>
            <Input id="codeMachine" {...register('codeMachine')} aria-invalid={!!errors.codeMachine} />
            {errors.codeMachine && (
              <p className="text-sm text-destructive">{errors.codeMachine.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="typeMachine">
              Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch('typeMachine')}
              onValueChange={(v) => setValue('typeMachine', v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_MACHINE_VALUES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.typeMachine && (
              <p className="text-sm text-destructive">{errors.typeMachine.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="marque">Marque</Label>
              <Input id="marque" {...register('marque')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="modele">Modèle</Label>
              <Input id="modele" {...register('modele')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="numeroSerie">N° de série</Label>
              <Input id="numeroSerie" {...register('numeroSerie')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emplacement">Emplacement</Label>
              <Input id="emplacement" {...register('emplacement')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="dateAcquisition">Date d&apos;acquisition</Label>
              <Input id="dateAcquisition" type="date" {...register('dateAcquisition')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="statut">Statut</Label>
              <Select value={watch('statut')} onValueChange={(v) => setValue('statut', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUT_MACHINE_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function MachinesPage() {
  const { data: machines, isLoading } = useGetMachines()
  const deleteMutation = useDeleteMachine()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Machine | null>(null)

  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [statutFilter, setStatutFilter] = useState<string>('ALL')

  const filtered = useMemo(() => {
    if (!machines) return []
    return machines.filter(
      (m) =>
        (typeFilter === 'ALL' || m.typeMachine === typeFilter) &&
        (statutFilter === 'ALL' || m.statut === statutFilter),
    )
  }, [machines, typeFilter, statutFilter])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = useCallback(
    (m: Machine) => {
      setEditing(m)
      setDialogOpen(true)
    },
    [],
  )
  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  const columns = useMemo(
    () => [
      {
        key: 'codeMachine',
        header: 'Code',
        cardPrimary: true,
        cell: (m: Machine) => (
          <Link
            href={`/machines/${m.id}`}
            className="font-medium underline-offset-2 hover:underline"
          >
            {m.codeMachine}
          </Link>
        ),
      },
      {
        key: 'marque',
        header: "Marque / Modèle",
        cell: (m: Machine) => (
          <span className="text-muted-foreground">
            {[m.marque, m.modele].filter(Boolean).join(' ') || '—'}
          </span>
        ),
      },
      {
        key: 'typeMachine',
        header: 'Type',
        cell: (m: Machine) => <span className="text-muted-foreground">{m.typeMachine}</span>,
      },
      {
        key: 'emplacement',
        header: 'Emplacement',
        cell: (m: Machine) => (
          <span className="text-muted-foreground">{m.emplacement ?? '—'}</span>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        cardPrimary: true,
        cell: (m: Machine) => (
          <Badge variant="outline" className={STATUT_BADGE[m.statut]}>
            {m.statut}
          </Badge>
        ),
      },
      {
        key: 'nombreInterventions',
        header: 'Interventions',
        cell: (m: Machine) => (
          <span className="text-muted-foreground">{m.nombreInterventions}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cardPrimary: true,
        headerClassName: 'w-[140px]',
        cell: (m: Machine) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" asChild title="Voir la fiche">
              <Link href={`/machines/${m.id}`}>
                <CableCar className="size-3.5" />
              </Link>
            </Button>
            <PermissionGate module="machines" mode="write">
              <Button variant="ghost" size="icon-sm" title="Modifier" onClick={() => openEdit(m)}>
                <Pencil className="size-3.5" />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    title="Supprimer"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                }
                title={`Supprimer « ${m.codeMachine} » ?`}
                description="Les interventions liées seront supprimées (suppression en cascade)."
                onConfirm={() => deleteMutation.mutate(m.id)}
              />
            </PermissionGate>
          </div>
        ),
      },
    ],
    [openEdit, deleteMutation],
  )

  return (
    <div>
      <PageHeader
        title="Parc machines"
        action={
          <PermissionGate module="machines" mode="write">
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              Nouvelle machine
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44" aria-label="Filtrer par type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les types</SelectItem>
              {TYPE_MACHINE_VALUES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={statutFilter} onValueChange={setStatutFilter}>
            <SelectTrigger className="w-44" aria-label="Filtrer par statut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {STATUT_MACHINE_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} machine(s)
        </span>
      </div>

      <PaginatedResponsiveTable
        columns={columns}
        data={filtered}
        keyExtractor={(m) => m.id}
        isLoading={isLoading}
        emptyText="Aucune machine dans le parc."
        label="machines"
      />

      {dialogOpen && (
        <MachineDialog
          key={editing?.id ?? 'new'}
          open={dialogOpen}
          onClose={closeDialog}
          editing={editing}
        />
      )}
    </div>
  )
}