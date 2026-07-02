'use client'

import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
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
import { ArticleSelect } from '@/components/forms/article-select'
import {
  commandeSchema,
  toCommandePayload,
  tailleItemSchema,
  bomItemSchema,
} from '@/lib/validations/commande'
import {
  useCreateCommande,
  useSetTailles,
  useSetBom,
} from '@/hooks/use-commandes'
import { useGetClients } from '@/hooks/use-clients'

// Schéma combiné pour le formulaire de création
const createSchema = commandeSchema.extend({
  tailles: z.array(tailleItemSchema),
  bom: z.array(bomItemSchema),
})

type CreateSchema = z.infer<typeof createSchema>

export default function NouvelleCommandePage() {
  const router = useRouter()
  const { data: clients } = useGetClients()
  const createMutation = useCreateCommande()
  const setTaillesMutation = useSetTailles()
  const setBomMutation = useSetBom()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateSchema>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      clientId: 0,
      marqueId: null,
      titreCommande: null,
      descriptionCommande: null,
      dateLivraisonSouhaitee: null,
      devise: 'EUR',
      notesSpeciales: null,
      specificationsClient: null,
      creePar: null,
      tailles: [],
      bom: [],
    },
  })

  const {
    fields: taillesFields,
    append: appendTaille,
    remove: removeTaille,
  } = useFieldArray({ control, name: 'tailles' })

  const {
    fields: bomFields,
    append: appendBom,
    remove: removeBom,
  } = useFieldArray({ control, name: 'bom' })

  const isPending =
    createMutation.isPending || setTaillesMutation.isPending || setBomMutation.isPending

  const onSubmit = async (data: CreateSchema) => {
    const commande = await createMutation.mutateAsync(
      toCommandePayload(data) as Record<string, unknown>,
    )

    // POST /Tailles si des tailles ont été définies
    if (data.tailles.length > 0) {
      await setTaillesMutation.mutateAsync({
        commandeId: commande.id,
        tailles: data.tailles,
      })
    }

    // POST /Bom si des lignes BOM ont été définies
    if (data.bom.length > 0) {
      await setBomMutation.mutateAsync({
        commandeId: commande.id,
        bom: data.bom.map((b) => ({ ...b, unite: b.unite || null })),
      })
    }

    router.push(`/commandes/${commande.id}`)
  }

  return (
    <div>
      <PageHeader title="Nouvel ordre de fabrication" backHref="/commandes" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid max-w-3xl gap-6">

          {/* ── Carte 1 : Infos générales ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>
                    Client <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="clientId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? String(field.value) : ''}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un client…" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.clientId && (
                    <p className="text-sm text-destructive">{errors.clientId.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="marqueId">ID Marque (optionnel)</Label>
                  <Input
                    id="marqueId"
                    type="number"
                    min="1"
                    placeholder="Ex : 3"
                    {...register('marqueId', {
                      setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                    })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="titreCommande">Titre de la commande</Label>
                <Input id="titreCommande" {...register('titreCommande')} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descriptionCommande">Description</Label>
                <Textarea id="descriptionCommande" rows={2} {...register('descriptionCommande')} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="dateLivraisonSouhaitee">Livraison souhaitée</Label>
                  <Input
                    id="dateLivraisonSouhaitee"
                    type="date"
                    {...register('dateLivraisonSouhaitee')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="devise">Devise</Label>
                  <Input id="devise" {...register('devise')} maxLength={10} placeholder="EUR" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="creePar">Créé par</Label>
                <Input id="creePar" {...register('creePar')} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notesSpeciales">Notes spéciales</Label>
                <Textarea id="notesSpeciales" rows={2} {...register('notesSpeciales')} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="specificationsClient">Spécifications client</Label>
                <Textarea id="specificationsClient" rows={2} {...register('specificationsClient')} />
              </div>
            </CardContent>
          </Card>

          {/* ── Carte 2 : Tailles ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Configuration des tailles</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendTaille({ taille: '', quantite: 0 })}
                >
                  <Plus className="size-3.5" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {taillesFields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune taille définie. Vous pouvez en ajouter plus tard depuis la page détail.
                </p>
              )}
              <div className="space-y-2">
                {taillesFields.map((field, idx) => (
                  <div key={field.id} className="flex items-end gap-3">
                    <div className="grid flex-1 gap-1">
                      <Label className="text-xs">Taille</Label>
                      <Input
                        placeholder="Ex : S, M, L, XL…"
                        {...register(`tailles.${idx}.taille`)}
                        aria-invalid={!!errors.tailles?.[idx]?.taille}
                      />
                      {errors.tailles?.[idx]?.taille && (
                        <p className="text-xs text-destructive">
                          {errors.tailles[idx]!.taille!.message}
                        </p>
                      )}
                    </div>
                    <div className="grid w-28 gap-1">
                      <Label className="text-xs">Quantité</Label>
                      <Input
                        type="number"
                        min="1"
                        {...register(`tailles.${idx}.quantite`, { valueAsNumber: true })}
                        aria-invalid={!!errors.tailles?.[idx]?.quantite}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mb-0.5 text-destructive hover:text-destructive"
                      onClick={() => removeTaille(idx)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              {taillesFields.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Total :{' '}
                  <span className="font-medium">
                    {taillesFields.reduce((s, _, i) => {
                      const q = (document.getElementById(`tailles.${i}.quantite`) as HTMLInputElement)
                        ?.valueAsNumber
                      return s + (isNaN(q) ? 0 : q)
                    }, 0)}
                  </span>{' '}
                  pièces
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Carte 3 : BOM par pièce ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">BOM (nomenclature par pièce)</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Quantité par pièce × total pièces = besoin final (calculé par le backend)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendBom({ articleId: 0, quantiteParPiece: 0, unite: null })}
                >
                  <Plus className="size-3.5" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bomFields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune ligne BOM définie. Vous pouvez en ajouter plus tard depuis la page détail.
                </p>
              )}
              <div className="space-y-3">
                {bomFields.map((field, idx) => (
                  <div key={field.id} className="flex flex-wrap items-end gap-3">
                    <div className="w-full grid gap-1 sm:flex-1">
                      <Label className="text-xs">Article</Label>
                      <Controller
                        name={`bom.${idx}.articleId`}
                        control={control}
                        render={({ field: f }) => (
                          <ArticleSelect
                            value={f.value || null}
                            onChange={(id) => f.onChange(id ?? 0)}
                          />
                        )}
                      />
                      {errors.bom?.[idx]?.articleId && (
                        <p className="text-xs text-destructive">
                          {errors.bom[idx]!.articleId!.message}
                        </p>
                      )}
                    </div>
                    <div className="w-28 grid gap-1">
                      <Label className="text-xs">Qté / pièce</Label>
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        {...register(`bom.${idx}.quantiteParPiece`, { valueAsNumber: true })}
                        aria-invalid={!!errors.bom?.[idx]?.quantiteParPiece}
                      />
                    </div>
                    <div className="w-20 grid gap-1">
                      <Label className="text-xs">Unité</Label>
                      <Input
                        placeholder="m, kg…"
                        {...register(`bom.${idx}.unite`)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mb-0.5 text-destructive hover:text-destructive"
                      onClick={() => removeBom(idx)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Création…' : 'Créer l\'ordre de fabrication'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/commandes')}>
              Annuler
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
