'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { ArticleSelect } from '@/components/forms/article-select'
import { CommandeSelect } from '@/components/forms/commande-select'
import { apiClient } from '@/lib/api-client'
import {
  achatSchema,
  toAchatPayload,
  ligneAchatSchema,
  toLigneAchatPayload,
} from '@/lib/validations/achat'
import { useGetFournisseurs } from '@/hooks/use-fournisseurs'
import { useGetCommandes } from '@/hooks/use-commandes'
import { useGetClients } from '@/hooks/use-clients'
import { useGetPlateformes } from '@/hooks/use-plateformes'
import { PermissionGate } from '@/components/auth/permission-gate'
import type { Achat } from '@/types/achat'
import type { ApiError } from '@/types'

const creationSchema = achatSchema.extend({
  lignes: z.array(ligneAchatSchema),
})
type CreationSchema = z.infer<typeof creationSchema>

const LIGNE_DEFAULTS = {
  articleId: 0,
  quantite: 1,
  prixUnitaire: 0,
  typeDestination: 'StockLibre' as const,
  commandeClientId: null,
  clientId: null,
  plateformeId: null,
  couleur: null,
  codeCouleur: null,
  taille: null,
  dimension: null,
  devise: null,
  descriptionSpecifique: null,
  notes: null,
}

export default function NouvelAchatPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: fournisseurs } = useGetFournisseurs()
  const { data: commandes, isLoading: loadingCommandes } = useGetCommandes()
  const { data: clients } = useGetClients()
  const { data: plateformes } = useGetPlateformes()

  const [plateformeFilter, setPlateformeFilter] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState<{ current: number; total: number } | null>(
    null,
  )

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreationSchema>({
    resolver: zodResolver(creationSchema),
    defaultValues: {
      fournisseurId: 0,
      commandeClientId: null,
      dateLivraisonPrevue: null,
      devise: 'EUR',
      conditionsPaiement: null,
      notesAchat: null,
      creePar: null,
      lignes: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lignes' })

  const watchedLignes = watch('lignes')
  const parentDevise = watch('devise')

  const filteredCommandes = plateformeFilter
    ? (commandes ?? []).filter((c) => c.client?.plateforme?.id === plateformeFilter)
    : (commandes ?? [])

  function handlePlateformeFilterChange(pid: number | null) {
    setPlateformeFilter(pid)
    if (pid) {
      const validIds = new Set(
        (commandes ?? [])
          .filter((c) => c.client?.plateforme?.id === pid)
          .map((c) => c.id),
      )
      const current = watchedLignes ?? []
      current.forEach((l, i) => {
        if (l.commandeClientId && !validIds.has(l.commandeClientId)) {
          setValue(`lignes.${i}.commandeClientId`, null)
        }
      })
    }
  }

  function addLigne() {
    append({ ...LIGNE_DEFAULTS, devise: parentDevise || 'EUR' })
  }

  const totalEstime = (watchedLignes ?? []).reduce(
    (sum, l) => sum + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0),
    0,
  )

  function submitLabel() {
    if (submitProgress)
      return `Création… ligne ${submitProgress.current}/${submitProgress.total}`
    if (isSubmitting) return 'Création en cours…'
    return "Créer l'achat"
  }

  const onSubmit = async (data: CreationSchema) => {
    setIsSubmitting(true)
    setSubmitProgress(null)
    try {
      const { lignes, ...headerData } = data
      const achat = await apiClient.post<Achat>('/api/Achat', toAchatPayload(headerData))

      let successCount = 0
      for (let i = 0; i < lignes.length; i++) {
        setSubmitProgress({ current: i + 1, total: lignes.length })
        try {
          await apiClient.post(
            `/api/Achat/${achat.id}/LignesAchat`,
            toLigneAchatPayload(lignes[i]) as Record<string, unknown>,
          )
          successCount++
        } catch (lineErr) {
          const msg = (lineErr as ApiError).message ?? 'Erreur inconnue'
          toast.warning(
            `Achat ${achat.numeroAchat} créé avec ${successCount}/${lignes.length} ligne${successCount !== 1 ? 's' : ''} — ` +
              `Ligne ${i + 1} : ${msg}. Ajoutez les lignes manquantes depuis la page détail.`,
            { duration: 10_000 },
          )
          qc.invalidateQueries({ queryKey: ['achats'] })
          router.push(`/achats/${achat.id}`)
          return
        }
      }

      const n = lignes.length
      toast.success(
        n === 0
          ? `Achat ${achat.numeroAchat} créé`
          : `Achat ${achat.numeroAchat} créé avec ${n} ligne${n !== 1 ? 's' : ''}`,
      )
      qc.invalidateQueries({ queryKey: ['achats'] })
      router.push(`/achats/${achat.id}`)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
      setSubmitProgress(null)
    }
  }

  return (
    <div>
      <PageHeader title="Nouvel achat" backHref="/achats" />

      <PermissionGate
        module="achats"
        mode="write"
        fallback={
          <p className="text-sm text-muted-foreground">
            Vous n&apos;avez pas les droits pour créer un élément dans ce module.
          </p>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid max-w-4xl gap-6">
          {/* ── Informations générales ── */}
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
                  <Label htmlFor="dateLivraisonPrevue">Livraison prévue</Label>
                  <Input
                    id="dateLivraisonPrevue"
                    type="date"
                    {...register('dateLivraisonPrevue')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="devise">Devise</Label>
                  <Input id="devise" {...register('devise')} placeholder="EUR" maxLength={10} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="creePar">Commandé par</Label>
                <Input id="creePar" {...register('creePar')} />
              </div>
            </CardContent>
          </Card>

          {/* ── Lignes ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">
                Lignes
                {fields.length > 0 && (
                  <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal tabular-nums">
                    {fields.length}
                  </span>
                )}
              </CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addLigne}>
                <Plus className="mr-1.5 size-3.5" />
                Ajouter une ligne
              </Button>
            </CardHeader>
            <CardContent>
              {/* Plateforme filter — filters commande selects on all lines */}
              {fields.length > 0 && (
                <div className="mb-4 grid gap-2">
                  <Label>Filtrer commandes par plateforme</Label>
                  {loadingCommandes ? (
                    <Skeleton className="h-9 max-w-xs" />
                  ) : (
                    <Select
                      value={plateformeFilter ? String(plateformeFilter) : '0'}
                      onValueChange={(v) =>
                        handlePlateformeFilterChange(v === '0' ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Toutes les plateformes</SelectItem>
                        {plateformes?.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune ligne — vous pourrez en ajouter depuis la page détail après la création.
                </p>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, i) => {
                    const l = watchedLignes?.[i]
                    const montant =
                      l && Number(l.quantite) > 0 && Number(l.prixUnitaire) >= 0
                        ? Number(l.quantite) * Number(l.prixUnitaire)
                        : null
                    const deviseAffichee = l?.devise || parentDevise || ''

                    return (
                      <div key={field.id} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Article {i + 1}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => remove(i)}
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {/* Article */}
                          <div className="grid gap-2">
                            <Label>
                              Article <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                              name={`lignes.${i}.articleId`}
                              control={control}
                              render={({ field: f }) => (
                                <ArticleSelect
                                  value={f.value || null}
                                  onChange={(id) => f.onChange(id ?? 0)}
                                />
                              )}
                            />
                            {errors.lignes?.[i]?.articleId && (
                              <p className="text-xs text-destructive">
                                {errors.lignes[i].articleId?.message}
                              </p>
                            )}
                          </div>

                          {/* Quantité · Prix · Devise */}
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="grid gap-2">
                              <Label>
                                Quantité <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                {...register(`lignes.${i}.quantite`, { valueAsNumber: true })}
                                aria-invalid={!!errors.lignes?.[i]?.quantite}
                              />
                              {errors.lignes?.[i]?.quantite && (
                                <p className="text-xs text-destructive">
                                  {errors.lignes[i].quantite?.message}
                                </p>
                              )}
                            </div>
                            <div className="grid gap-2">
                              <Label>
                                Prix unitaire <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...register(`lignes.${i}.prixUnitaire`, { valueAsNumber: true })}
                                aria-invalid={!!errors.lignes?.[i]?.prixUnitaire}
                              />
                              {errors.lignes?.[i]?.prixUnitaire && (
                                <p className="text-xs text-destructive">
                                  {errors.lignes[i].prixUnitaire?.message}
                                </p>
                              )}
                            </div>
                            <div className="grid gap-2">
                              <Label>Devise</Label>
                              <Input
                                {...register(`lignes.${i}.devise`)}
                                placeholder={parentDevise || 'EUR'}
                                maxLength={10}
                              />
                            </div>
                          </div>

                          {/* Couleur · Taille */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                              <Label>Couleur</Label>
                              <Input {...register(`lignes.${i}.couleur`)} />
                            </div>
                            <div className="grid gap-2">
                              <Label>Taille</Label>
                              <Input {...register(`lignes.${i}.taille`)} />
                            </div>
                          </div>

                          {/* Destination */}
                          <div className="grid gap-2">
                            <Label>Destination</Label>
                            <Controller
                              name={`lignes.${i}.typeDestination`}
                              control={control}
                              render={({ field: f }) => (
                                <Select
                                  value={f.value ?? 'StockLibre'}
                                  onValueChange={(v) => {
                                    f.onChange(v)
                                    if (v !== 'Commande') setValue(`lignes.${i}.commandeClientId`, null)
                                    if (v !== 'Marque') setValue(`lignes.${i}.clientId`, null)
                                    if (v !== 'Plateforme') setValue(`lignes.${i}.plateformeId`, null)
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Commande">Commande</SelectItem>
                                    <SelectItem value="Marque">Marque (client)</SelectItem>
                                    <SelectItem value="Plateforme">Plateforme</SelectItem>
                                    <SelectItem value="StockLibre">Stock libre</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>

                          {/* Champ conditionnel selon TypeDestination */}
                          {watchedLignes?.[i]?.typeDestination === 'Commande' && (
                            <div className="grid gap-2">
                              <Label>
                                Commande client <span className="text-destructive">*</span>
                              </Label>
                              <Controller
                                name={`lignes.${i}.commandeClientId`}
                                control={control}
                                render={({ field: f }) => (
                                  <CommandeSelect
                                    value={f.value ?? null}
                                    onChange={(id) => f.onChange(id)}
                                    commandes={filteredCommandes}
                                    placeholder="Sélectionner…"
                                  />
                                )}
                              />
                              {errors.lignes?.[i]?.commandeClientId && (
                                <p className="text-xs text-destructive">
                                  {errors.lignes[i].commandeClientId?.message}
                                </p>
                              )}
                            </div>
                          )}
                          {watchedLignes?.[i]?.typeDestination === 'Marque' && (
                            <div className="grid gap-2">
                              <Label>
                                Client <span className="text-destructive">*</span>
                              </Label>
                              <Controller
                                name={`lignes.${i}.clientId`}
                                control={control}
                                render={({ field: f }) => (
                                  <Select
                                    value={f.value ? String(f.value) : '0'}
                                    onValueChange={(v) => f.onChange(v === '0' ? null : Number(v))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">Sélectionner…</SelectItem>
                                      {clients?.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                          {c.nomEntreprise ?? `${c.nom} ${c.prenom ?? ''}`.trim()}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              {errors.lignes?.[i]?.clientId && (
                                <p className="text-xs text-destructive">
                                  {errors.lignes[i].clientId?.message}
                                </p>
                              )}
                            </div>
                          )}
                          {watchedLignes?.[i]?.typeDestination === 'Plateforme' && (
                            <div className="grid gap-2">
                              <Label>
                                Plateforme <span className="text-destructive">*</span>
                              </Label>
                              <Controller
                                name={`lignes.${i}.plateformeId`}
                                control={control}
                                render={({ field: f }) => (
                                  <Select
                                    value={f.value ? String(f.value) : '0'}
                                    onValueChange={(v) => f.onChange(v === '0' ? null : Number(v))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">Sélectionner…</SelectItem>
                                      {plateformes?.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                          {p.nom}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              {errors.lignes?.[i]?.plateformeId && (
                                <p className="text-xs text-destructive">
                                  {errors.lignes[i].plateformeId?.message}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Montant ligne */}
                          {montant !== null && (
                            <p className="text-right text-sm text-muted-foreground">
                              Montant :{' '}
                              <span className="font-mono font-medium text-foreground">
                                {montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                {deviseAffichee ? ` ${deviseAffichee}` : ''}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Total estimé */}
                  {totalEstime > 0 && (
                    <div className="flex justify-end rounded-lg border bg-muted/40 px-4 py-2.5 text-sm font-medium">
                      Total estimé
                      <span className="ml-2 font-mono">
                        {totalEstime.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        {parentDevise ? ` ${parentDevise}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Notes & conditions ── */}
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
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel()}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/achats')}
              disabled={isSubmitting}
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
