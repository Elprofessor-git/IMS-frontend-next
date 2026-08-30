'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { ResponsiveTable, type ColDef } from '@/components/ui/responsive-table'
import { PageHeader } from '@/components/shared/page-header'
import { PermissionGate } from '@/components/auth/permission-gate'
import { useGetTauxChanges, useCreateTauxChange } from '@/hooks/use-taux-change'
import { useGetDevises } from '@/hooks/use-devises'
import type { TauxChange } from '@/types/Devise'

const tauxSchema = z.object({
  deviseCode: z.string().min(1, 'Devise requise'),
  dateEffective: z.string().min(1, 'Date requise'),
  taux: z.number().positive('Le taux doit être supérieur à 0'),
})
type TauxSchema = z.infer<typeof tauxSchema>

const DEFAULT_VALUES: TauxSchema = {
  deviseCode: '',
  dateEffective: new Date().toISOString().slice(0, 10),
  taux: 0,
}

function formaterDate(s: string): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('fr-FR')
}

function TauxDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const createMutation = useCreateTauxChange()
  const { data: devises } = useGetDevises()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TauxSchema>({
    resolver: zodResolver(tauxSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const onSubmit = async (data: TauxSchema) => {
    await createMutation.mutateAsync({
      deviseCode: data.deviseCode,
      dateEffective: data.dateEffective,
      taux: data.taux,
    })
    reset(DEFAULT_VALUES)
    onClose()
  }

  const isPending = createMutation.isPending

  // Devise de référence TND : taux implicite = 1, pas de saisie nécessaire.
  const devisesSaisissables = (devises ?? []).filter((d) => d.code !== 'TND')

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un taux de change</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="deviseCode">
              Devise <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="deviseCode"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    aria-invalid={!!errors.deviseCode}
                    className="w-full"
                  >
                    <SelectValue placeholder="Sélectionner une devise…" />
                  </SelectTrigger>
                  <SelectContent>
                    {devisesSaisissables.map((d) => (
                      <SelectItem key={d.code} value={d.code}>
                        {d.symbole ? `${d.code} (${d.symbole})` : d.code} — {d.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.deviseCode && (
              <p className="text-sm text-destructive">{errors.deviseCode.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dateEffective">
              Date effective <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dateEffective"
              type="date"
              {...register('dateEffective')}
              aria-invalid={!!errors.dateEffective}
            />
            {errors.dateEffective && (
              <p className="text-sm text-destructive">{errors.dateEffective.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="taux">
              Taux (TND pour 1 unité) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="taux"
              type="number"
              min="0.000001"
              step="0.000001"
              placeholder="ex. 3.3"
              {...register('taux', { valueAsNumber: true })}
              aria-invalid={!!errors.taux}
            />
            {errors.taux && (
              <p className="text-sm text-destructive">{errors.taux.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function TauxChangePage() {
  const { data: taux, isLoading } = useGetTauxChanges()
  const [dialogOpen, setDialogOpen] = useState(false)

  const trie = [...(taux ?? [])].sort(
    (a, b) => new Date(b.dateEffective).getTime() - new Date(a.dateEffective).getTime(),
  )

  const columns: ColDef<TauxChange>[] = [
    {
      key: 'devise',
      header: 'Devise',
      cardPrimary: true,
      cell: (t) => (
        <span className="font-medium">
          {t.deviseCode}
          {t.deviseSymbole ? ` (${t.deviseSymbole})` : ''}
          {t.deviseNom ? <span className="text-muted-foreground"> — {t.deviseNom}</span> : null}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date effective',
      cardPrimary: true,
      cell: (t) => <span className="text-muted-foreground">{formaterDate(t.dateEffective)}</span>,
    },
    {
      key: 'taux',
      header: 'Taux (TND / 1 unité)',
      cell: (t) => (
        <span className="font-mono font-medium tabular-nums">
          {Number(t.taux).toLocaleString('fr-FR', { maximumFractionDigits: 6 })}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Taux de change"
        description="Taux de conversion vers la devise de référence TND, figés à l'écriture des documents."
        action={
          <PermissionGate module="parametres" mode="write">
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Ajouter un taux
            </Button>
          </PermissionGate>
        }
      />

      <PermissionGate module="parametres" mode="read">
        <ResponsiveTable
          columns={columns}
          data={trie}
          keyExtractor={(t) => t.id}
          isLoading={isLoading}
          emptyText="Aucun taux de change enregistré. Ajoutez-en un pour activer la conversion multi-devises."
        />
      </PermissionGate>

      {dialogOpen && (
        <TauxDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  )
}
