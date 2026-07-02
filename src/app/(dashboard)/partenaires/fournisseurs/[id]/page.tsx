'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import {
  fournisseurSchema,
  toFournisseurPayload,
  type FournisseurSchema,
} from '@/lib/validations/fournisseur'
import {
  useGetFournisseur,
  useUpdateFournisseur,
  useDeleteFournisseur,
  useDesactiverFournisseur,
  useActiverFournisseur,
  useGetFournisseurHistorique,
} from '@/hooks/use-fournisseurs'
import { STATUT_ACHAT, STATUT_IMPORTATION, MODE_EXPEDITION } from '@/types/fournisseur'

const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—'

export default function EditFournisseurPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const fournisseurId = Number(id)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') === 'historique' ? 'historique' : 'info',
  )

  const { data: fournisseur, isLoading } = useGetFournisseur(fournisseurId)
  const { data: historique, isLoading: histLoading } = useGetFournisseurHistorique(
    fournisseurId,
    activeTab === 'historique',
  )
  const updateMutation = useUpdateFournisseur()
  const deleteMutation = useDeleteFournisseur()
  const desactiverMutation = useDesactiverFournisseur()
  const activerMutation = useActiverFournisseur()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FournisseurSchema>({
    resolver: zodResolver(fournisseurSchema),
  })

  useEffect(() => {
    if (fournisseur) {
      reset({
        nomEntreprise: fournisseur.nomEntreprise,
        personneContact: fournisseur.personneContact ?? '',
        email: fournisseur.email,
        telephone: fournisseur.telephone ?? '',
        adresse: fournisseur.adresse ?? '',
        ville: fournisseur.ville ?? '',
        codePostal: fournisseur.codePostal ?? '',
        pays: fournisseur.pays ?? '',
        specialitesProduits: fournisseur.specialitesProduits ?? '',
        conditionsPaiement: fournisseur.conditionsPaiement ?? '',
        delaiLivraisonJours: fournisseur.delaiLivraisonJours,
        notesContrat: fournisseur.notesContrat ?? '',
      })
    }
  }, [fournisseur, reset])

  const onSubmit = async (data: FournisseurSchema) => {
    if (!fournisseur) return
    await updateMutation.mutateAsync({ ...fournisseur, ...toFournisseurPayload(data) })
    router.push('/partenaires/fournisseurs')
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!fournisseur) {
    return <p className="text-muted-foreground">Fournisseur introuvable.</p>
  }

  return (
    <div>
      <PageHeader
        title={fournisseur.nomEntreprise}
        backHref="/partenaires/fournisseurs"
        action={
          <div className="flex items-center gap-2">
            <Badge variant={fournisseur.estActif ? 'default' : 'secondary'}>
              {fournisseur.estActif ? 'Actif' : 'Inactif'}
            </Badge>
            <PermissionGate module="fournisseurs" mode="write">
              {fournisseur.estActif ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm" disabled={desactiverMutation.isPending}>
                      <UserX className="size-4" />
                      Désactiver
                    </Button>
                  }
                  title="Désactiver ce fournisseur ?"
                  description="Le fournisseur sera masqué des listes mais conservé en base."
                  confirmLabel="Désactiver"
                  onConfirm={() => desactiverMutation.mutate(fournisseurId)}
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => activerMutation.mutate(fournisseurId)}
                  disabled={activerMutation.isPending}
                >
                  <UserCheck className="size-4" />
                  Activer
                </Button>
              )}
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}>
                    Supprimer
                  </Button>
                }
                title="Supprimer ce fournisseur ?"
                description="Bloqué par le serveur si le fournisseur a des achats ou importations. Préférez la désactivation."
                onConfirm={async () => {
                  await deleteMutation.mutateAsync(fournisseurId)
                  router.push('/partenaires/fournisseurs')
                }}
              />
            </PermissionGate>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl">
        <TabsList className="mb-4">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        {/* ── ONGLET INFORMATIONS ── */}
        <TabsContent value="info">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-6">
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
                      <p className="text-sm text-destructive">
                        {errors.delaiLivraisonJours.message}
                      </p>
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
                    <Textarea
                      id="specialitesProduits"
                      rows={3}
                      {...register('specialitesProduits')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="conditionsPaiement">Conditions de paiement</Label>
                    <Textarea
                      id="conditionsPaiement"
                      rows={3}
                      {...register('conditionsPaiement')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notesContrat">Notes contrat</Label>
                    <Textarea id="notesContrat" rows={3} {...register('notesContrat')} />
                  </div>
                </CardContent>
              </Card>

              <PermissionGate module="fournisseurs" mode="write">
                <div className="flex gap-3">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/partenaires/fournisseurs')}
                  >
                    Annuler
                  </Button>
                </div>
              </PermissionGate>
            </div>
          </form>
        </TabsContent>

        {/* ── ONGLET HISTORIQUE ── */}
        <TabsContent value="historique">
          {histLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : historique ? (
            <div className="space-y-6">
              {/* Statistiques */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">{historique.statistiques.nombreAchats}</p>
                    <p className="text-sm text-muted-foreground">Achats</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {fmt.format(historique.statistiques.montantTotalAchats)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total achats</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {fmtDate(historique.statistiques.dernierAchat)}
                    </p>
                    <p className="text-sm text-muted-foreground">Dernier achat</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {historique.statistiques.nombreImportations}
                    </p>
                    <p className="text-sm text-muted-foreground">Importations</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {fmt.format(historique.statistiques.montantTotalImportations)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total importations</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {fmtDate(historique.statistiques.derniereImportation)}
                    </p>
                    <p className="text-sm text-muted-foreground">Dernière importation</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tableau des achats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Achats</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N°</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Commande client</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historique.achats.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-8 text-center text-muted-foreground"
                          >
                            Aucun achat
                          </TableCell>
                        </TableRow>
                      ) : (
                        historique.achats.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-mono text-sm">{a.numeroAchat}</TableCell>
                            <TableCell>{fmtDate(a.dateAchat)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {STATUT_ACHAT[a.statut] ?? `Statut ${a.statut}`}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {a.commandeClient}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{a.client}</TableCell>
                            <TableCell className="text-right">
                              {fmt.format(a.montantTotal)}
                              {a.devise && a.devise !== 'EUR' && (
                                <span className="ml-1 text-muted-foreground">{a.devise}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Tableau des importations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Importations</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Mode expédition</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historique.importations.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-8 text-center text-muted-foreground"
                          >
                            Aucune importation
                          </TableCell>
                        </TableRow>
                      ) : (
                        historique.importations.map((imp) => (
                          <TableRow key={imp.id}>
                            <TableCell className="font-mono text-sm">
                              {imp.referenceImportation}
                            </TableCell>
                            <TableCell>{fmtDate(imp.dateImportation)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {STATUT_IMPORTATION[imp.statut] ?? `Statut ${imp.statut}`}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {MODE_EXPEDITION[imp.modeExpedition] ?? `Mode ${imp.modeExpedition}`}
                            </TableCell>
                            <TableCell className="text-right">
                              {fmt.format(imp.montantTotal)}
                              {imp.devise && imp.devise !== 'EUR' && (
                                <span className="ml-1 text-muted-foreground">{imp.devise}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
