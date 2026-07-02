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
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { clientSchema, toClientPayload, type ClientSchema } from '@/lib/validations/client'
import { useCreateClient } from '@/hooks/use-clients'
import { useGetPlateformes } from '@/hooks/use-plateformes'

export default function NouveauClient() {
  const router = useRouter()
  const createMutation = useCreateClient()
  const { data: plateformes, isLoading: loadingPlateformes } = useGetPlateformes()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientSchema>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nom: '',
      prenom: '',
      nomEntreprise: '',
      email: '',
      telephone: '',
      adresse: '',
      ville: '',
      codePostal: '',
      pays: '',
      preferencesTissus: '',
      notesHistorique: '',
      plateformeId: 0,
    },
  })

  const onSubmit = async (data: ClientSchema) => {
    await createMutation.mutateAsync(toClientPayload(data))
    router.push('/partenaires/clients')
  }

  return (
    <div>
      <PageHeader title="Nouveau client" backHref="/partenaires/clients" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid max-w-4xl gap-6">
          {/* Identité */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plateforme — sélection obligatoire */}
              <div className="grid gap-2">
                <Label>
                  Plateforme <span className="text-destructive">*</span>
                </Label>
                {loadingPlateformes ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <Controller
                    name="plateformeId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value > 0 ? String(field.value) : ''}
                        onValueChange={(val) => field.onChange(Number(val))}
                      >
                        <SelectTrigger aria-invalid={!!errors.plateformeId}>
                          <SelectValue placeholder="Sélectionner une plateforme" />
                        </SelectTrigger>
                        <SelectContent>
                          {plateformes?.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                {errors.plateformeId && (
                  <p className="text-sm text-destructive">{errors.plateformeId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="nom">
                    Nom <span className="text-destructive">*</span>
                  </Label>
                  <Input id="nom" {...register('nom')} aria-invalid={!!errors.nom} />
                  {errors.nom && (
                    <p className="text-sm text-destructive">{errors.nom.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input id="prenom" {...register('prenom')} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="nomEntreprise">Nom d&apos;entreprise</Label>
                <Input id="nomEntreprise" {...register('nomEntreprise')} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input id="telephone" {...register('telephone')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adresse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input id="adresse" {...register('adresse')} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input id="ville" {...register('ville')} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="codePostal">Code postal</Label>
                  <Input id="codePostal" {...register('codePostal')} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pays">Pays</Label>
                  <Input id="pays" {...register('pays')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="preferencesTissus">Préférences tissus</Label>
                <Textarea id="preferencesTissus" rows={3} {...register('preferencesTissus')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notesHistorique">Notes</Label>
                <Textarea id="notesHistorique" rows={3} {...register('notesHistorique')} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer le client'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/partenaires/clients')}
            >
              Annuler
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
