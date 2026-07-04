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
import { articleSchema, toArticlePayload, type ArticleSchema } from '@/lib/validations/article'
import { useCreateArticle } from '@/hooks/use-articles'
import { PermissionGate } from '@/components/auth/permission-gate'

export default function NouvelArticlePage() {
  const router = useRouter()
  const createMutation = useCreateArticle()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ArticleSchema>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      designation: '',
      description: null,
      categorie: null,
      sousCategorie: null,
      unite: null,
      marque: null,
      reference: null,
      caracteristiques: null,
      seuilAlerte: 0,
      seuilCritique: 0,
    },
  })

  const onSubmit = async (data: ArticleSchema) => {
    await createMutation.mutateAsync(toArticlePayload(data))
    router.push('/articles')
  }

  return (
    <div>
      <PageHeader title="Nouvel article" backHref="/articles" />

      <PermissionGate
        module="articles"
        mode="write"
        fallback={
          <p className="text-sm text-muted-foreground">
            Vous n&apos;avez pas les droits pour créer un élément dans ce module.
          </p>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid max-w-4xl gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="designation">
                  Désignation <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="designation"
                  {...register('designation')}
                  aria-invalid={!!errors.designation}
                />
                {errors.designation && (
                  <p className="text-sm text-destructive">{errors.designation.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Référence</Label>
                  <Input
                    value="Générée automatiquement (ARTyyyyMMNNNN)"
                    readOnly
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="marque">Marque</Label>
                  <Input id="marque" {...register('marque')} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="categorie">Catégorie</Label>
                  <Input id="categorie" {...register('categorie')} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sousCategorie">Sous-catégorie</Label>
                  <Input id="sousCategorie" {...register('sousCategorie')} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unite">Unité</Label>
                  <Input id="unite" {...register('unite')} placeholder="pièce, mètre, kg…" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} {...register('description')} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="caracteristiques">Caractéristiques</Label>
                <Textarea id="caracteristiques" rows={3} {...register('caracteristiques')} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seuils d&apos;alerte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="seuilAlerte">Seuil d&apos;alerte (orange)</Label>
                  <Input
                    id="seuilAlerte"
                    type="number"
                    min="0"
                    {...register('seuilAlerte', { valueAsNumber: true })}
                    aria-invalid={!!errors.seuilAlerte}
                  />
                  {errors.seuilAlerte && (
                    <p className="text-sm text-destructive">{errors.seuilAlerte.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="seuilCritique">Seuil critique (rouge)</Label>
                  <Input
                    id="seuilCritique"
                    type="number"
                    min="0"
                    {...register('seuilCritique', { valueAsNumber: true })}
                    aria-invalid={!!errors.seuilCritique}
                  />
                  {errors.seuilCritique && (
                    <p className="text-sm text-destructive">{errors.seuilCritique.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Enregistrement…' : "Créer l'article"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/articles')}
            >
              Annuler
            </Button>
          </div>
        </div>
        </form>
      </PermissionGate>
    </div>
  )
}
