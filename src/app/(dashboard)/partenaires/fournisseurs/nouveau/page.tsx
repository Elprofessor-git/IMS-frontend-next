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
import { fournisseurSchema, toFournisseurPayload, type FournisseurSchema } from '@/lib/validations/fournisseur'
import { useCreateFournisseur } from '@/hooks/use-fournisseurs'
import { PermissionGate } from '@/components/auth/permission-gate'

export default function NouveauFournisseurPage() {
  const router = useRouter()
  const createMutation = useCreateFournisseur()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FournisseurSchema>({
    resolver: zodResolver(fournisseurSchema),
    defaultValues: {
      nomEntreprise: '',
      personneContact: null,
      email: '',
      telephone: null,
      adresse: null,
      ville: null,
      codePostal: null,
      pays: null,
      specialitesProduits: null,
      conditionsPaiement: null,
      delaiLivraisonJours: 0,
      notesContrat: null,
    },
  })

  const onSubmit = async (data: FournisseurSchema) => {
    await createMutation.mutateAsync(toFournisseurPayload(data))
    router.push('/partenaires/fournisseurs')
  }

  return (
    <div>
      <PageHeader title="Nouveau fournisseur" backHref="/partenaires/fournisseurs" />

      <PermissionGate
        module="fournisseurs"
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
              <CardTitle className="text-base">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="nomEntreprise">
                    Nom de l&apos;entreprise <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nomEntreprise"
                    {...register('nomEntreprise')}
                    aria-invalid={!!errors.nomEntreprise}
                  />
                  {errors.nomEntreprise && (
                    <p className="text-sm text-destructive">{errors.nomEntreprise.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="personneContact">Personne contact</Label>
                  <Input id="personneContact" {...register('personneContact')} />
                </div>
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

              <div className="grid gap-2">
                <Label htmlFor="delaiLivraisonJours">Délai de livraison (jours)</Label>
                <Input
                  id="delaiLivraisonJours"
                  type="number"
                  min="0"
                  className="w-36"
                  {...register('delaiLivraisonJours', { valueAsNumber: true })}
                  aria-invalid={!!errors.delaiLivraisonJours}
                />
                {errors.delaiLivraisonJours && (
                  <p className="text-sm text-destructive">{errors.delaiLivraisonJours.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conditions commerciales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="specialitesProduits">Spécialités / Produits</Label>
                <Textarea id="specialitesProduits" rows={3} {...register('specialitesProduits')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="conditionsPaiement">Conditions de paiement</Label>
                <Textarea id="conditionsPaiement" rows={3} {...register('conditionsPaiement')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notesContrat">Notes contrat</Label>
                <Textarea id="notesContrat" rows={3} {...register('notesContrat')} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Enregistrement…' : 'Créer le fournisseur'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/partenaires/fournisseurs')}
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
