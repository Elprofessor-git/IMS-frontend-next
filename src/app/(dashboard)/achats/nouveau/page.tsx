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
import { achatSchema, toAchatPayload, type AchatSchema } from '@/lib/validations/achat'
import { useCreateAchat } from '@/hooks/use-achats'
import { useGetFournisseurs } from '@/hooks/use-fournisseurs'

export default function NouvelAchatPage() {
  const router = useRouter()
  const createMutation = useCreateAchat()
  const { data: fournisseurs } = useGetFournisseurs()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AchatSchema>({
    resolver: zodResolver(achatSchema),
    defaultValues: {
      fournisseurId: 0,
      commandeClientId: 0,
      dateLivraisonPrevue: null,
      devise: 'EUR',
      conditionsPaiement: null,
      notesAchat: null,
      creePar: null,
    },
  })

  const onSubmit = async (data: AchatSchema) => {
    const achat = await createMutation.mutateAsync(toAchatPayload(data) as Record<string, unknown>)
    router.push(`/achats/${achat.id}`)
  }

  return (
    <div>
      <PageHeader title="Nouvel achat" backHref="/achats" />

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

              <div className="grid gap-2">
                <Label htmlFor="commandeClientId">
                  ID Commande client <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="commandeClientId"
                  type="number"
                  min="1"
                  {...register('commandeClientId', { valueAsNumber: true })}
                  aria-invalid={!!errors.commandeClientId}
                />
                {errors.commandeClientId && (
                  <p className="text-sm text-destructive">{errors.commandeClientId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="dateLivraisonPrevue">Livraison prévue</Label>
                  <Input
                    id="dateLivraisonPrevue"
                    type="date"
                    {...register('dateLivraisonPrevue')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="devise">Devise</Label>
                  <Input
                    id="devise"
                    {...register('devise')}
                    placeholder="EUR"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="creePar">Créé par</Label>
                <Input id="creePar" {...register('creePar')} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes & conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="conditionsPaiement">Conditions de paiement</Label>
                <Textarea
                  id="conditionsPaiement"
                  rows={2}
                  {...register('conditionsPaiement')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notesAchat">Notes</Label>
                <Textarea id="notesAchat" rows={3} {...register('notesAchat')} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer l\'achat'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/achats')}>
              Annuler
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
