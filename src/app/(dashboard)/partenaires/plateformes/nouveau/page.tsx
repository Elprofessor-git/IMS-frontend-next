'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { plateformeSchema, toApiPayload, type PlateformeSchema } from '@/lib/validations/plateforme'
import { useCreatePlateforme } from '@/hooks/use-plateformes'

export default function NouvellePlateforme() {
  const router = useRouter()
  const createMutation = useCreatePlateforme()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlateformeSchema>({
    resolver: zodResolver(plateformeSchema),
    defaultValues: {
      nom: '',
      description: '',
      siteWeb: '',
      contactEmail: '',
      telephone: '',
    },
  })

  const onSubmit = async (data: PlateformeSchema) => {
    await createMutation.mutateAsync(toApiPayload(data))
    router.push('/partenaires/plateformes')
  }

  return (
    <div>
      <PageHeader title="Nouvelle plateforme" backHref="/partenaires/plateformes" />

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
              <Input id="siteWeb" type="url" placeholder="https://" {...register('siteWeb')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Email contact</Label>
                <Input id="contactEmail" type="text" {...register('contactEmail')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" {...register('telephone')} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                {createMutation.isPending ? 'Création…' : 'Créer la plateforme'}
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
