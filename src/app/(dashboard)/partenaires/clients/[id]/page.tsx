'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { clientSchema, toClientPayload, type ClientSchema } from '@/lib/validations/client'
import {
  useGetClient,
  useUpdateClient,
  useDeleteClient,
  useDesactiverClient,
  useActiverClient,
  useGetClientHistorique,
} from '@/hooks/use-clients'
import { useGetPlateformes } from '@/hooks/use-plateformes'
import { STATUT_COMMANDE } from '@/types/client'

const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—'

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const clientId = Number(id)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') === 'historique' ? 'historique' : 'info',
  )

  const { data: client, isLoading } = useGetClient(clientId)
  const { data: historique, isLoading: histLoading } = useGetClientHistorique(
    clientId,
    activeTab === 'historique',
  )
  const { data: plateformes } = useGetPlateformes()
  const updateMutation = useUpdateClient()
  const deleteMutation = useDeleteClient()
  const desactiverMutation = useDesactiverClient()
  const activerMutation = useActiverClient()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientSchema>({
    resolver: zodResolver(clientSchema),
  })

  useEffect(() => {
    if (client) {
      reset({
        nom: client.nom,
        prenom: client.prenom ?? '',
        nomEntreprise: client.nomEntreprise ?? '',
        email: client.email,
        telephone: client.telephone ?? '',
        adresse: client.adresse ?? '',
        ville: client.ville ?? '',
        codePostal: client.codePostal ?? '',
        pays: client.pays ?? '',
        preferencesTissus: client.preferencesTissus ?? '',
        notesHistorique: client.notesHistorique ?? '',
        plateformeId: client.plateformeId,
      })
    }
  }, [client, reset])

  const onSubmit = async (data: ClientSchema) => {
    if (!client) return
    await updateMutation.mutateAsync({ ...client, ...toClientPayload(data) })
    router.push('/partenaires/clients')
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!client) {
    return <p className="text-muted-foreground">Client introuvable.</p>
  }

  return (
    <div>
      <PageHeader
        title={client.nom + (client.prenom ? ' ' + client.prenom : '')}
        backHref="/partenaires/clients"
        action={
          <div className="flex items-center gap-2">
            <Badge variant={client.estActif ? 'default' : 'secondary'}>
              {client.estActif ? 'Actif' : 'Inactif'}
            </Badge>
            <PermissionGate module="clients" mode="write">
              {client.estActif ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm" disabled={desactiverMutation.isPending}>
                      <UserX className="size-4" />
                      Désactiver
                    </Button>
                  }
                  title="Désactiver ce client ?"
                  description="Le client sera masqué des listes mais conservé en base."
                  confirmLabel="Désactiver"
                  onConfirm={() => desactiverMutation.mutate(clientId)}
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => activerMutation.mutate(clientId)}
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
                title="Supprimer ce client ?"
                description="Bloqué par le serveur si le client a des commandes. Préférez la désactivation."
                onConfirm={async () => {
                  await deleteMutation.mutateAsync(clientId)
                  router.push('/partenaires/clients')
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
                  <CardTitle className="text-base">Identité</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>
                      Plateforme <span className="text-destructive">*</span>
                    </Label>
                    <Controller
                      name="plateformeId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value > 0 ? String(field.value) : ''}
                          onValueChange={(val) => field.onChange(Number(val))}
                        >
                          <SelectTrigger aria-invalid={!!errors.plateformeId}>
                            <SelectValue placeholder="Sélectionner" />
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
                    <Label htmlFor="nomEntreprise">Entreprise</Label>
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

              <PermissionGate module="clients" mode="write">
                <div className="flex gap-3">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/partenaires/clients')}
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : historique ? (
            <div className="space-y-6">
              {/* Statistiques */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">{historique.statistiques.nombreCommandes}</p>
                    <p className="text-sm text-muted-foreground">Commandes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {fmt.format(historique.statistiques.montantTotal)}
                    </p>
                    <p className="text-sm text-muted-foreground">Montant total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {historique.statistiques.commandesTerminees}
                    </p>
                    <p className="text-sm text-muted-foreground">Terminées</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {fmtDate(historique.statistiques.derniereCommande)}
                    </p>
                    <p className="text-sm text-muted-foreground">Dernière commande</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tableau des commandes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Commandes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N°</TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historique.commandes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                            Aucune commande
                          </TableCell>
                        </TableRow>
                      ) : (
                        historique.commandes.map((cmd) => (
                          <TableRow key={cmd.id}>
                            <TableCell className="font-mono text-sm">
                              {cmd.numeroCommande}
                            </TableCell>
                            <TableCell>{cmd.titreCommande ?? '—'}</TableCell>
                            <TableCell>{fmtDate(cmd.dateCommande)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {STATUT_COMMANDE[cmd.statut] ?? `Statut ${cmd.statut}`}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {fmt.format(cmd.montantTotal)}
                              {cmd.devise && cmd.devise !== 'EUR' && (
                                <span className="ml-1 text-muted-foreground">{cmd.devise}</span>
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
