'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { plateformeSchema, toApiPayload, type PlateformeSchema } from '@/lib/validations/plateforme'
import { useGetPlateforme, useUpdatePlateforme } from '@/hooks/use-plateformes'

export default function EditPlateforme({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const plateformeId = Number(id)
  const router = useRouter()

  const { data: plateforme, isLoading } = useGetPlateforme(plateformeId)
  const updateMutation = useUpdatePlateforme()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlateformeSchema>({
    resolver: zodResolver(plateformeSchema),
  })

  // Pré-remplir le formulaire dès que la donnée arrive
  useEffect(() => {
    if (plateforme) {
      // null → '' pour que les inputs HTML affichent du vide (pas "null")
      reset({
        nom: plateforme.nom,
        description: plateforme.description ?? '',
        siteWeb: plateforme.siteWeb ?? '',
        contactEmail: plateforme.contactEmail ?? '',
        telephone: plateforme.telephone ?? '',
      })
    }
  }, [plateforme, reset])

  const onSubmit = async (data: PlateformeSchema) => {
    if (!plateforme) return
    // PUT requiert TOUS les champs — on fusionne pour préserver id, dateCreation, estActif
    await updateMutation.mutateAsync({
      ...plateforme,
      ...toApiPayload(data),
    })
    router.push('/partenaires/plateformes')
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!plateforme) {
    return <p className="text-muted-foreground">Plateforme introuvable.</p>
  }

  return (
    <div>
      <PageHeader
        title={`Modifier — ${plateforme.nom}`}
        backHref="/partenaires/plateformes"
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register('description')} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="siteWeb">Site web</Label>
              <Input id="siteWeb" type="url" {...register('siteWeb')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Email contact</Label>
                <Input id="contactEmail" {...register('contactEmail')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" {...register('telephone')} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/partenaires/plateformes')}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
