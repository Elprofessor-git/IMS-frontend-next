'use client'

import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { importationSchema, toImportationPayload, type ImportationSchema } from '@/lib/validations/importation'
import { useCreateImportation } from '@/hooks/use-importations'
import { useGetFournisseurs } from '@/hooks/use-fournisseurs'
import { MODE_EXPEDITION } from '@/types/fournisseur'

export default function NouvelleImportationPage() {
  const router = useRouter()
  const createMutation = useCreateImportation()
  const { data: fournisseurs } = useGetFournisseurs()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ImportationSchema>({
    resolver: zodResolver(importationSchema),
    defaultValues: {
      fournisseurId: 0,
      dateReceptionPrevue: null,
      modeExpedition: 0,
      devise: 'EUR',
      notesImportation: null,
      creePar: null,
    },
  })

  const onSubmit = async (data: ImportationSchema) => {
    const imp = await createMutation.mutateAsync(
      toImportationPayload(data) as Record<string, unknown>,
    )
    router.push(`/importations/${imp.id}`)
  }

  return (
    <div>
      <PageHeader title="Nouvelle importation" backHref="/importations" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid max-w-2xl gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>
                  Fournisseur <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="fournisseurId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur…" />
                      </SelectTrigger>
                      <SelectContent>
                        {fournisseurs?.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.nomEntreprise}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.fournisseurId && (
                  <p className="text-sm text-destructive">{errors.fournisseurId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Mode d&apos;expédition</Label>
                  <Controller
                    name="modeExpedition"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(MODE_EXPEDITION) as [string, string][]).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="devise">Devise</Label>
                  <Input id="devise" {...register('devise')} placeholder="EUR" maxLength={10} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="dateReceptionPrevue">Réception prévue</Label>
                  <Input
                    id="dateReceptionPrevue"
                    type="date"
                    {...register('dateReceptionPrevue')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="creePar">Créé par</Label>
                  <Input id="creePar" {...register('creePar')} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notesImportation">Notes</Label>
                <Textarea id="notesImportation" rows={3} {...register('notesImportation')} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer l\'importation'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/importations')}>
              Annuler
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
