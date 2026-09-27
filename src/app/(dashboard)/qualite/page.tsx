'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  RefreshCw,
  Search,
  Send,
  Tags,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PaginatedResponsiveTable } from '@/components/shared/paginated-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { CommandeSelect } from '@/components/forms/commande-select'
import { useGetChainesProduction } from '@/hooks/use-production'
import { useGetCommandes } from '@/hooks/use-commandes'
import { useCreateOrdreFabrication } from '@/hooks/use-ordres-fabrication'
import {
  useGetControlesQualite,
  useGetReferenceQualite,
  useCreateControleQualite,
  useCreateEnvoiRetouche,
  useGetQualiteDashboard,
  useGetQualiteJournal,
  useGetDefautCodes,
  useCreateDefautCode,
  useUpdateDefautCode,
  useDeleteDefautCode,
  type QualiteDashboardLigne,
  type QualiteJournalLigne,
  type DefautCode,
} from '@/hooks/use-qualite'
import type { ControleQualite, CreateControleQualiteDefautLignePayload } from '@/types/controle-qualite'

const TAILLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

type ChaineLite = { id: number; nom: string }
type OfLite = { id: number; numeroOF: string }

const castControle = (row: unknown) => row as ControleQualite
const castLigne = (row: unknown) => row as QualiteDashboardLigne
const castJournal = (row: unknown) => row as QualiteJournalLigne
const castDefaut = (row: unknown) => row as DefautCode

// ── Variante de badge selon le statut du cycle ──
function badgeVariant(statut: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (statut) {
    case 'en-retouche-sous-traitant':
    case 'retouche-sur-place':
    case 'retouches-a-renvoyer':
      return 'destructive'
    case 'en-attente-premier-controle':
      return 'default'
    case 'aucun-export':
      return 'outline'
    default:
      return 'secondary'
  }
}

function KpiCard({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${className}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

export default function QualitePage() {
  const [onglet, setOnglet] = useState<'dashboard' | 'commande' | 'journal' | 'codes'>('dashboard')
  const [recherche, setRecherche] = useState('')
  const [statut, setStatut] = useState<string>('tous')
  const [commandeId, setCommandeId] = useState<number | null>(null)
  const [typeControle, setTypeControle] = useState<'Interne' | 'RetourSousTraitant'>('Interne')

  const { data: commandes } = useGetCommandes()
  const { data: chaines = [] } = useGetChainesProduction()

  // Commandes actives : on masque Terminée/Annulée comme sur les autres modules.
  const commandesActives = useMemo(
    () => (commandes ?? []).filter((c) => c.statut !== 3 && c.statut !== 4),
    [commandes],
  )

  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } = useGetQualiteDashboard({
    recherche: recherche.trim() || undefined,
    statut: statut === 'tous' ? null : statut,
  })
  const { data: journal = [], isLoading: journalLoading } = useGetQualiteJournal()
  const { data: codesDefaut = [] } = useGetDefautCodes()

  const commande = commandeId ?? 0
  const { data: controles = [], isLoading: controlesLoading } = useGetControlesQualite(
    commande > 0 ? commande : undefined,
  )

  const stats = useMemo(() => {
    let acceptees = 0
    let retouche = 0
    let rebut = 0
    for (const c of controles) {
      acceptees += c.quantiteAcceptee
      retouche += c.quantiteRetouche
      rebut += c.quantiteRebut
    }
    return { acceptees, retouche, rebut }
  }, [controles])

  const ouvrirCommande = (id: number) => {
    setCommandeId(id)
    setOnglet('commande')
  }

  return (
    <PermissionGate module="qualite" mode="read" fallback={<ForbiddenState moduleLabel="qualite" />}>
      <div className="grid gap-6">
        <PageHeader
          title="Contrôle qualité"
          description="Cycle qualité LOT 8 : référence (plafond strict), contrôle Interne / Retour sous-traitant, envois en retouche. Toutes les commandes actives sont listées, y compris celles sans export."
        />

        <Tabs value={onglet} onValueChange={(v) => setOnglet(v as typeof onglet)}>
          <TabsList>
            <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
            <TabsTrigger value="commande">Contrôles d&apos;une commande</TabsTrigger>
            <TabsTrigger value="journal">Journal du jour</TabsTrigger>
            <TabsTrigger value="codes">Codes défauts</TabsTrigger>
          </TabsList>

          {/* ══════════ TABLEAU DE BORD ══════════ */}
          <TabsContent value="dashboard" className="mt-4 grid gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Commandes actives" value={dashboard?.nombreCommandesActives ?? 0} />
              <KpiCard label="Exporté" value={dashboard?.quantiteExporteeTotale ?? 0} />
              <KpiCard label="Contrôlé" value={dashboard?.quantiteControleeTotale ?? 0} />
              <KpiCard label="Accepté" value={dashboard?.quantiteAccepteeTotale ?? 0} className="text-emerald-600" />
              <KpiCard label="Retouche" value={dashboard?.quantiteRetoucheTotale ?? 0} className="text-amber-600" />
              <KpiCard label="Rebut" value={dashboard?.quantiteRebutTotale ?? 0} className="text-rose-600" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <KpiCard label="Commandes avec contrôle" value={dashboard?.commandesAvecControle ?? 0} className="text-emerald-600" />
              <KpiCard
                label="Commandes sans contrôle"
                value={dashboard?.commandesSansControle ?? 0}
                className="text-amber-600"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <ClipboardCheck className="size-4" />
                  Commandes actives et leur cycle qualité
                  <span className="text-xs font-normal text-muted-foreground">
                    {dashboard?.nombreLignes ?? 0} ligne(s) — les commandes sans export restent listées
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        placeholder="Commande, client, chaîne, taille…"
                        className="h-8 w-56 pl-7 text-sm"
                      />
                    </div>
                    <Select value={statut} onValueChange={setStatut}>
                      <SelectTrigger className="h-8 w-56 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Tous les statuts</SelectItem>
                        <SelectItem value="en-attente-premier-controle">En attente de premier contrôle</SelectItem>
                        <SelectItem value="retouche-sur-place">Retouche sur place</SelectItem>
                        <SelectItem value="retouches-a-renvoyer">Retouches à renvoyer</SelectItem>
                        <SelectItem value="en-retouche-sous-traitant">En retouche sous-traitant</SelectItem>
                        <SelectItem value="aucun-export">Aucun export</SelectItem>
                        <SelectItem value="termine">Terminé</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => refetchDash()}>
                      <RefreshCw className="size-3.5" /> Actualiser
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaginatedResponsiveTable
                  label="qualite-dashboard"
                  pageSize={15}
                  columns={[
                    {
                      key: 'numeroCommande',
                      header: 'Commande',
                      cardPrimary: true,
                      cell: (row: unknown) => {
                        const l = castLigne(row)
                        return (
                          <>
                            <span className="font-medium">{l.numeroCommande}</span>
                            {l.titreCommande && (
                              <span className="block text-xs font-normal text-muted-foreground">{l.titreCommande}</span>
                            )}
                          </>
                        )
                      },
                    },
                    {
                      key: 'clientNom',
                      header: 'Client',
                      cell: (row: unknown) => castLigne(row).clientNom ?? '—',
                    },
                    {
                      key: 'chaineNom',
                      header: 'Chaîne / Taille',
                      cell: (row: unknown) => {
                        const l = castLigne(row)
                        if (l.estCommandeSansExport) return <span className="text-muted-foreground">—</span>
                        return (
                          <span>
                            {l.chaineNom ?? 'Sans chaîne'}
                            {l.taille ? <span className="text-muted-foreground"> · {l.taille}</span> : null}
                          </span>
                        )
                      },
                    },
                    {
                      key: 'quantiteExportee',
                      header: 'Exporté',
                      cell: (row: unknown) => castLigne(row).quantiteExportee,
                    },
                    {
                      key: 'quantiteControleeTotale',
                      header: 'Contrôlé',
                      cell: (row: unknown) => castLigne(row).quantiteControleeTotale,
                    },
                    {
                      key: 'enCours',
                      header: 'En cours',
                      cell: (row: unknown) => castLigne(row).enCours,
                    },
                    {
                      key: 'statut',
                      header: 'Statut',
                      cell: (row: unknown) => {
                        const l = castLigne(row)
                        return <Badge variant={badgeVariant(l.statut)}>{l.statutLabel}</Badge>
                      },
                    },
                    {
                      key: 'nombreControles',
                      header: 'Contrôles',
                      cell: (row: unknown) => {
                        const l = castLigne(row)
                        return l.nombreControles === 0 ? (
                          <span className="text-amber-600">aucun</span>
                        ) : (
                          <span className="tabular-nums">{l.nombreControles}</span>
                        )
                      },
                    },
                    {
                      key: 'actions',
                      header: '',
                      cell: (row: unknown) => {
                        const l = castLigne(row)
                        return (
                          <div className="flex justify-end">
                            <Button size="sm" variant="outline" onClick={() => ouvrirCommande(l.commandeId)}>
                              Contrôler
                            </Button>
                          </div>
                        )
                      },
                    },
                  ]}
                  data={dashboard?.lignes ?? []}
                  keyExtractor={(l: QualiteDashboardLigne) => `${l.commandeId}-${l.chaineProductionId ?? 'x'}-${l.taille ?? 'x'}`}
                  emptyText="Aucune commande active ne correspond à ces critères."
                  isLoading={dashLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════ CONTRÔLES D'UNE COMMANDE ══════════ */}
          <TabsContent value="commande" className="mt-4 grid gap-4">
            <Card>
              <CardContent className="grid gap-4 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid w-96 max-w-full gap-1.5">
                    <Label className="text-xs" htmlFor="qualite-commande">
                      Commande
                    </Label>
                    <CommandeSelect
                      id="qualite-commande"
                      value={commandeId}
                      onChange={setCommandeId}
                      commandes={commandesActives}
                      placeholder="Rechercher une commande à contrôler…"
                    />
                  </div>
                  <Tabs value={typeControle} onValueChange={(v) => setTypeControle(v as 'Interne' | 'RetourSousTraitant')}>
                    <TabsList>
                      <TabsTrigger value="Interne">Interne</TabsTrigger>
                      <TabsTrigger value="RetourSousTraitant">Retour sous-traitant</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="ml-auto">
                    <PermissionGate module="qualite" mode="write" fallback={null}>
                      <NouveauControleDialog
                        commandeId={commande}
                        commandeNumero={
                          commandesActives.find((c) => c.id === commande)?.numeroCommande ?? null
                        }
                        chaines={chaines}
                        defaultType={typeControle}
                      />
                    </PermissionGate>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KpiCard label="Contrôles" value={controles.length} />
                  <KpiCard label="Acceptées" value={stats.acceptees} className="text-emerald-600" />
                  <KpiCard label="En retouche" value={stats.retouche} className="text-amber-600" />
                  <KpiCard label="Rebut" value={stats.rebut} className="text-rose-600" />
                </div>

                <PaginatedResponsiveTable
                  label="controles"
                  columns={[
                    { key: 'id', header: '#', cell: (row: unknown) => String(castControle(row).id) },
                    { key: 'taille', header: 'Taille', cell: (row: unknown) => castControle(row).taille },
                    { key: 'chaineNom', header: 'Chaîne', cell: (row: unknown) => castControle(row).chaineNom ?? '—' },
                    {
                      key: 'typeControle',
                      header: 'Type',
                      cell: (row: unknown) => (
                        <Badge variant={castControle(row).typeControle === 'Interne' ? 'default' : 'secondary'}>
                          {castControle(row).typeControle === 'Interne' ? 'Interne' : 'Retour ST'}
                        </Badge>
                      ),
                    },
                    {
                      key: 'quantiteControlee',
                      header: 'Contrôlée',
                      cell: (row: unknown) => castControle(row).quantiteControlee,
                    },
                    {
                      key: 'quantiteAcceptee',
                      header: 'Acceptée',
                      cell: (row: unknown) => (
                        <span className="text-emerald-600">{castControle(row).quantiteAcceptee}</span>
                      ),
                    },
                    {
                      key: 'quantiteRetouche',
                      header: 'Retouche',
                      cell: (row: unknown) => (
                        <span className="text-amber-600">{castControle(row).quantiteRetouche}</span>
                      ),
                    },
                    {
                      key: 'quantiteRebut',
                      header: 'Rebut',
                      cell: (row: unknown) => <span className="text-rose-600">{castControle(row).quantiteRebut}</span>,
                    },
                    {
                      key: 'actions',
                      header: '',
                      cell: (row: unknown) => {
                        const c = castControle(row)
                        return c.quantiteRetouche > 0 ? (
                          <div className="flex justify-end">
                            <PermissionGate module="qualite" mode="write" fallback={null}>
                              <EnvoiRetoucheDialog
                                controleId={c.id}
                                quantiteRetouche={c.quantiteRetouche}
                                chaines={chaines}
                              />
                            </PermissionGate>
                          </div>
                        ) : (
                          <span className="block text-right text-xs text-muted-foreground">—</span>
                        )
                      },
                    },
                  ]}
                  data={controles}
                  keyExtractor={(c: ControleQualite) => c.id}
                  emptyText={
                    commande > 0
                      ? 'Aucun contrôle enregistré pour cette commande. Utilisez « Nouveau contrôle » pour démarrer le cycle.'
                      : 'Sélectionnez une commande pour afficher ses contrôles.'
                  }
                  isLoading={controlesLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════ JOURNAL DU JOUR ══════════ */}
          <TabsContent value="journal" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <RefreshCw className="size-4" />
                  Journal du jour
                  <span className="text-xs font-normal text-muted-foreground">
                    Contrôles et envois en retouche enregistrés aujourd&apos;hui
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaginatedResponsiveTable
                  label="journal-qualite"
                  columns={[
                    {
                      key: 'dateOperation',
                      header: 'Heure',
                      cell: (row: unknown) =>
                        new Date(castJournal(row).dateOperation).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                    },
                    {
                      key: 'type',
                      header: 'Opération',
                      cell: (row: unknown) => {
                        const j = castJournal(row)
                        return (
                          <Badge variant={j.type === 'controle' ? 'default' : 'secondary'}>
                            {j.type === 'controle' ? 'Contrôle' : 'Envoi retouche'}
                          </Badge>
                        )
                      },
                    },
                    {
                      key: 'numeroCommande',
                      header: 'Commande',
                      cell: (row: unknown) => castJournal(row).numeroCommande ?? '—',
                    },
                    { key: 'taille', header: 'Taille', cell: (row: unknown) => castJournal(row).taille || '—' },
                    { key: 'chaineNom', header: 'Chaîne', cell: (row: unknown) => castJournal(row).chaineNom ?? '—' },
                    {
                      key: 'quantites',
                      header: 'Quantités',
                      cell: (row: unknown) => {
                        const j = castJournal(row)
                        if (j.type === 'controle') {
                          return (
                            <span className="tabular-nums text-xs">
                              C {j.quantiteControlee ?? 0} · A {j.quantiteAcceptee ?? 0} · R {j.quantiteRetouche ?? 0} · B{' '}
                              {j.quantiteRebut ?? 0}
                            </span>
                          )
                        }
                        return <span className="tabular-nums text-xs">Renvoyé {j.quantiteRenvoyee ?? 0}</span>
                      },
                    },
                    { key: 'effectuePar', header: 'Par', cell: (row: unknown) => castJournal(row).effectuePar ?? '—' },
                  ]}
                  data={journal}
                  keyExtractor={(j: QualiteJournalLigne) => `${j.type}-${j.id}`}
                  emptyText="Aucune opération qualité enregistrée aujourd'hui."
                  isLoading={journalLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════ CODES DÉFAUTS ══════════ */}
          <TabsContent value="codes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <Tags className="size-4" />
                  Codes défauts
                  <span className="text-xs font-normal text-muted-foreground">
                    Référentiel utilisé pour renseigner les lignes de défauts d&apos;un contrôle
                  </span>
                  <div className="ml-auto">
                    <PermissionGate module="qualite" mode="write" fallback={null}>
                      <DefautCodeDialog />
                    </PermissionGate>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaginatedResponsiveTable
                  label="codes-defauts"
                  columns={[
                    { key: 'code', header: 'Code', cardPrimary: true, cell: (row: unknown) => (
                      <span className="font-medium">{castDefaut(row).code}</span>
                    ) },
                    { key: 'libelle', header: 'Libellé', cell: (row: unknown) => castDefaut(row).libelle },
                    {
                      key: 'estActif',
                      header: 'État',
                      cell: (row: unknown) => (
                        <Badge variant={castDefaut(row).estActif ? 'default' : 'secondary'}>
                          {castDefaut(row).estActif ? 'Actif' : 'Inactif'}
                        </Badge>
                      ),
                    },
                    {
                      key: 'actions',
                      header: '',
                      cell: (row: unknown) => {
                        const d = castDefaut(row)
                        return (
                          <PermissionGate module="qualite" mode="write" fallback={null}>
                            <div className="flex items-center justify-end gap-1">
                              <EditDefautCodeDialog defaut={d} />
                              <DeleteDefautCodeDialog defaut={d} />
                            </div>
                          </PermissionGate>
                        )
                      },
                    },
                  ]}
                  data={codesDefaut}
                  keyExtractor={(d: DefautCode) => d.id}
                  emptyText="Aucun code défaut référencé. Créez le premier pour tracer les défauts d'un contrôle."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Dialog création contrôle (Interne ou RetourSousTraitant)
// ═══════════════════════════════════════════════════════════════════

function NouveauControleDialog({
  commandeId,
  commandeNumero,
  chaines,
  defaultType,
}: {
  commandeId: number
  commandeNumero: string | null
  chaines: ChaineLite[]
  defaultType: 'Interne' | 'RetourSousTraitant'
}) {
  const [open, setOpen] = useState(false)
  const [typeControle, setTypeControle] = useState<'Interne' | 'RetourSousTraitant'>(defaultType)
  const [ofId, setOfId] = useState('')
  const [chaineId, setChaineId] = useState('')
  const [taille, setTaille] = useState<string>('M')
  const [controlee, setControlee] = useState('')
  const [acceptee, setAcceptee] = useState('')
  const [retoucheQ, setRetoucheQ] = useState('')
  const [rebut, setRebut] = useState('')
  const [effectuePar, setEffectuePar] = useState('')
  const [notes, setNotes] = useState('')
  const [nouveauOfNumero, setNouveauOfNumero] = useState('')
  const [defauts, setDefauts] = useState<CreateControleQualiteDefautLignePayload[]>([])

  const qc = useQueryClient()
  const { data: ordres = [] } = useQuery<OfLite[]>({
    queryKey: ['of', 'commande', commandeId],
    queryFn: () => apiClient.get<OfLite[]>(`/api/OrdreFabrication/CommandeClient/${commandeId}`),
    enabled: commandeId > 0 && open,
    retry: false,
  })
  const { data: codesDefaut = [] } = useGetDefautCodes()
  const creerOf = useCreateOrdreFabrication()
  const { mutateAsync: creer, isPending } = useCreateControleQualite()

  // Plafond de référence recalculé sur la saisie réelle (OF / chaîne / taille / type).
  const { data: reference, isLoading: refLoading, isError: refError } = useGetReferenceQualite({
    commandeId,
    chaineProductionId: chaineId ? Number(chaineId) : null,
    taille,
    typeControle,
    enabled: open && commandeId > 0 && taille.length > 0,
  })

  const reset = () => {
    setOfId('')
    setChaineId('')
    setControlee('')
    setAcceptee('')
    setRetoucheQ('')
    setRebut('')
    setNotes('')
    setDefauts([])
  }

  // Garde-fou visuel de l'invariant métier A + R + B = C (le serveur reste autoritaire).
  const c = Number(controlee) || 0
  const a = Number(acceptee) || 0
  const r = Number(retoucheQ) || 0
  const b = Number(rebut) || 0
  const reste = c - a - r - b
  const plafond = reference?.referenceDisponible ?? 0
  // Le plafond est strict : une référence disponible à 0 interdit toute saisie.
  // Tant que la référence n'est pas chargée (chargement / erreur réseau) on refuse
  // de laisser saisir, plutôt que d'autoriser une saisie non plafonnée.
  const referenceIndisponible = refLoading || refError || !reference
  const referenceSoldee = reference?.estSolde === true
  const plafondDepasse = !referenceIndisponible && c > plafond

  const submit = async () => {
    const ordreFabricationId = Number(ofId)
    if (!ordreFabricationId) {
      toast.error('Choisissez un ordre de fabrication.')
      return
    }
    if (c <= 0) {
      toast.error('La quantité contrôlée est requise.')
      return
    }
    if (referenceIndisponible) {
      toast.error(
        'Référence indisponible : impossible de vérifier le plafond. Rechargez puis réessayez.',
      )
      return
    }
    if (referenceSoldee) {
      toast.error('Ce triplet est déjà soldé : aucune saisie supplémentaire possible.')
      return
    }
    if (plafondDepasse) {
      toast.error(`Quantité contrôlée (${c}) > référence disponible (${plafond}). Saisie rejetée.`)
      return
    }
    // Invariant strict : A + R + B doit être ÉGAL à C (une ventilation incomplète
    // laisserait des pièces non comptabilisées, ce que le serveur refuserait).
    if (reste !== 0) {
      toast.error(
        reste < 0
          ? `Invariant A + R + B = C violé : ${a} + ${r} + ${b} = ${a + r + b} > ${c} contrôlée.`
          : `Ventilation incomplète : ${a} + ${r} + ${b} = ${a + r + b} < ${c} contrôlée. ` +
            `Il reste ${reste} pièce(s) à ventiler en retouche, rebut ou acceptée.`,
      )
      return
    }
    await creer({
      ordreFabricationId,
      chaineProductionId: chaineId ? Number(chaineId) : null,
      typeControle,
      taille,
      quantiteControlee: c,
      quantiteAcceptee: a,
      quantiteRetouche: r,
      quantiteRebut: b,
      effectuePar: effectuePar.trim() || null,
      notes: notes.trim() || null,
      defauts: defauts.filter((d) => d.quantite > 0),
    })
    setOpen(false)
    reset()
    qc.invalidateQueries({ queryKey: ['controles-qualite'] })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" /> Nouveau contrôle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Réception + Contrôle</DialogTitle>
          <DialogDescription>
            Un tour du cycle qualité en une saisie. Le plafond de référence est appliqué côté serveur
            et l&apos;invariant Acceptée + Retouche + Rebut = Contrôlée est vérifié.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ctl-commande">Commande</Label>
              <div
                id="ctl-commande"
                className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm"
              >
                {commandeNumero || (commandeId > 0 ? `Commande #${commandeId}` : 'Aucune commande sélectionnée')}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Ordre de fabrication</Label>
              <Select value={ofId} onValueChange={setOfId} disabled={ordres.length === 0}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      commandeId <= 0
                        ? 'Choisissez d’abord une commande'
                        : ordres.length > 0
                          ? 'Choisir un OF…'
                          : 'Aucun OF pour cette commande'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {ordres.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.numeroOF}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {commandeId > 0 && ordres.length === 0 && (
                <div className="mt-1 grid gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50/60 p-2">
                  <p className="text-xs text-amber-800">
                    Cette commande n&apos;a pas d&apos;ordre de fabrication. Créez-le pour pouvoir enregistrer un
                    contrôle.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={nouveauOfNumero}
                      onChange={(e) => setNouveauOfNumero(e.target.value)}
                      placeholder="N° d’OF (ex. OF-2026-001)"
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!nouveauOfNumero.trim() || creerOf.isPending}
                      onClick={() =>
                        creerOf.mutate(
                          {
                            commandeId,
                            numeroOF: nouveauOfNumero.trim(),
                            chaineProductionId: chaineId ? Number(chaineId) : null,
                            notes: null,
                          },
                          {
                            onSuccess: (res) => {
                              setOfId(String(res.id))
                              qc.invalidateQueries({ queryKey: ['of', 'commande', commandeId] })
                            },
                          },
                        )
                      }
                    >
                      {creerOf.isPending ? 'Création…' : 'Créer l’OF'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Type de contrôle</Label>
              <Select value={typeControle} onValueChange={(v) => setTypeControle(v as 'Interne' | 'RetourSousTraitant')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interne">Interne</SelectItem>
                  <SelectItem value="RetourSousTraitant">Retour sous-traitant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Chaîne</Label>
              <Select value={chaineId} onValueChange={setChaineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chaîne…" />
                </SelectTrigger>
                <SelectContent>
                  {chaines.map((c2) => (
                    <SelectItem key={c2.id} value={String(c2.id)}>
                      {c2.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Taille</Label>
              <Select value={taille} onValueChange={setTaille}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAILLES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {reference && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/40">
              <span className="font-medium text-emerald-700">Référence disponible : </span>
              <span className="font-semibold tabular-nums text-emerald-800">{plafond} pièces</span>
              <span className="text-muted-foreground">
                {' '}
                — export {reference.quantiteExportee}, déjà contrôlé {reference.quantiteControlee}.
                {reference.estSolde ? ' Triplet soldé : aucune saisie supplémentaire possible.' : ''}
              </span>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ctl-qc">Contrôlée (C)</Label>
              <Input id="ctl-qc" type="number" min={1} value={controlee} onChange={(e) => setControlee(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ctl-a">Acceptée (A)</Label>
              <Input id="ctl-a" type="number" min={0} value={acceptee} onChange={(e) => setAcceptee(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ctl-r">Retouche (R)</Label>
              <Input id="ctl-r" type="number" min={0} value={retoucheQ} onChange={(e) => setRetoucheQ(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ctl-b">Rebut (B)</Label>
              <Input id="ctl-b" type="number" min={0} value={rebut} onChange={(e) => setRebut(e.target.value)} />
            </div>
          </div>

          <div
            className={`flex items-center gap-2 rounded-md border p-2 text-sm ${
              reste < 0
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : reste === 0
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
            }`}
          >
            {reste < 0 ? (
              <AlertTriangle className="size-4 shrink-0" />
            ) : reste === 0 ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertTriangle className="size-4 shrink-0" />
            )}
            <span className="tabular-nums">
              A + R + B = {a + r + b} / C = {c} — reste {reste}
              {reste > 0 ? ` — ${reste} pièce(s) à ventiler avant validation` : ''}
            </span>
          </div>

          {plafondDepasse && (
            <p className="flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 p-2 text-sm text-rose-800">
              <AlertTriangle className="size-4 shrink-0" />
              Quantité contrôlée ({c}) supérieure à la référence disponible ({plafond}) : la saisie
              sera rejetée.
            </p>
          )}
          {referenceSoldee && (
            <p className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
              <AlertTriangle className="size-4 shrink-0" />
              Triplet soldé : la quantité exportée a déjà été entièrement contrôlée.
            </p>
          )}

          {/* Lignes de défauts */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Défauts relevés</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={codesDefaut.length === 0}
                onClick={() =>
                  setDefauts((prev) => {
                    const used = new Set(prev.map((d) => d.defautCodeId))
                    const next = codesDefaut.find((cd) => !used.has(cd.id))
                    return next ? [...prev, { defautCodeId: next.id, quantite: 0 }] : prev
                  })
                }
              >
                <Plus className="size-3.5" /> Ajouter un défaut
              </Button>
            </div>
            {codesDefaut.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun code défaut référencé : créez d&apos;abord un code dans l&apos;onglet « Codes défauts ».
              </p>
            ) : defauts.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune ligne de défaut saisie (facultatif).</p>
            ) : (
              <div className="grid gap-2">
                {defauts.map((d, idx) => {
                  const cd = codesDefaut.find((x) => x.id === d.defautCodeId)
                  return (
                    <div key={`${d.defautCodeId}-${idx}`} className="flex items-end gap-2">
                      <div className="grid flex-1 gap-1.5">
                        <Label className="text-xs">Code</Label>
                        <Select
                          value={String(d.defautCodeId)}
                          onValueChange={(v) =>
                            setDefauts((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, defautCodeId: Number(v) } : x)),
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {codesDefaut.map((x) => (
                              <SelectItem key={x.id} value={String(x.id)}>
                                {x.code} — {x.libelle}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">{cd?.libelle}</span>
                      </div>
                      <div className="grid w-28 gap-1.5">
                        <Label className="text-xs" htmlFor={`defaut-qte-${idx}`}>
                          Quantité
                        </Label>
                        <Input
                          id={`defaut-qte-${idx}`}
                          type="number"
                          min={0}
                          className="h-8 text-sm"
                          value={d.quantite}
                          onChange={(e) =>
                            setDefauts((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, quantite: Number(e.target.value) || 0 } : x,
                              ),
                            )
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDefauts((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ctl-par">Effectué par</Label>
              <Input
                id="ctl-par"
                value={effectuePar}
                onChange={(e) => setEffectuePar(e.target.value)}
                placeholder="Nom de l'opérateur"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ctl-notes">Notes</Label>
              <Textarea id="ctl-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations…" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            onClick={submit}
            disabled={
              isPending ||
              commandeId <= 0 ||
              c <= 0 ||
              reste !== 0 ||
              plafondDepasse ||
              referenceIndisponible ||
              referenceSoldee
            }
          >
            <ClipboardCheck className="size-3.5" /> Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Dialog envoi en retouche (plafond strict : quantité retouche du contrôle)
// ═══════════════════════════════════════════════════════════════════

function EnvoiRetoucheDialog({
  controleId,
  quantiteRetouche,
  chaines,
}: {
  controleId: number
  quantiteRetouche: number
  chaines: ChaineLite[]
}) {
  const [chaineId, setChaineId] = useState('')
  const [quantite, setQuantite] = useState('')
  const { mutateAsync: envoyer, isPending } = useCreateEnvoiRetouche()

  const submit = async () => {
    if (!chaineId || !Number(quantite)) {
      toast.error('Chaîne et quantité renvoyée sont requises.')
      return
    }
    if (Number(quantite) > quantiteRetouche) {
      toast.error(`Quantité ${quantite} > retouche (${quantiteRetouche}). Plafond strict — envoi rejeté.`)
      return
    }
    await envoyer({
      controleQualiteId: controleId,
      chaineProductionId: Number(chaineId),
      quantiteRenvoyee: Number(quantite),
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Send className="size-3.5" /> Renvoyer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renvoyer en retouche</DialogTitle>
          <DialogDescription>
            Nouveau tour du cycle : envoi à la chaîne sous-traitante — plafond strict : quantité retouche ={' '}
            {quantiteRetouche}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Chaîne cible</Label>
            <Select value={chaineId} onValueChange={setChaineId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une chaîne…" />
              </SelectTrigger>
              <SelectContent>
                {chaines.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="envoi-qte">Quantité renvoyée</Label>
            <Input
              id="envoi-qte"
              type="number"
              min={1}
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              placeholder={`max ${quantiteRetouche}`}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button onClick={submit} disabled={isPending}>
            <Send className="size-3.5" /> Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Codes défauts — CRUD complet
// ═══════════════════════════════════════════════════════════════════

function DefautCodeDialog() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [libelle, setLibelle] = useState('')
  const [estActif, setEstActif] = useState(true)
  const creer = useCreateDefautCode()

  const submit = async () => {
    if (!code.trim() || !libelle.trim()) {
      toast.error('Le code et le libellé sont requis.')
      return
    }
    await creer.mutateAsync({ code: code.trim(), libelle: libelle.trim(), estActif })
    setOpen(false)
    setCode('')
    setLibelle('')
    setEstActif(true)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" /> Nouveau code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau code défaut</DialogTitle>
          <DialogDescription>Référentiel des défauts relevés lors d&apos;un contrôle qualité.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="defaut-code">Code</Label>
            <Input
              id="defaut-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ex. TA-01"
              maxLength={30}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="defaut-libelle">Libellé</Label>
            <Input
              id="defaut-libelle"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="ex. Tache d'aiguille"
              maxLength={150}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="defaut-actif"
              type="checkbox"
              checked={estActif}
              onChange={(e) => setEstActif(e.target.checked)}
              className="size-4"
            />
            <Label htmlFor="defaut-actif">Actif</Label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button onClick={submit} disabled={creer.isPending}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditDefautCodeDialog({ defaut }: { defaut: DefautCode }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState(defaut.code)
  const [libelle, setLibelle] = useState(defaut.libelle)
  const [estActif, setEstActif] = useState(defaut.estActif)
  const updater = useUpdateDefautCode()

  const submit = async () => {
    if (!code.trim() || !libelle.trim()) {
      toast.error('Le code et le libellé sont requis.')
      return
    }
    await updater.mutateAsync({ id: defaut.id, code: code.trim(), libelle: libelle.trim(), estActif })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le code défaut</DialogTitle>
          <DialogDescription>{defaut.code}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`edit-code-${defaut.id}`}>Code</Label>
            <Input
              id={`edit-code-${defaut.id}`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={30}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`edit-libelle-${defaut.id}`}>Libellé</Label>
            <Input
              id={`edit-libelle-${defaut.id}`}
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              maxLength={150}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id={`edit-actif-${defaut.id}`}
              type="checkbox"
              checked={estActif}
              onChange={(e) => setEstActif(e.target.checked)}
              className="size-4"
            />
            <Label htmlFor={`edit-actif-${defaut.id}`}>Actif</Label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button onClick={submit} disabled={updater.isPending}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDefautCodeDialog({ defaut }: { defaut: DefautCode }) {
  const [open, setOpen] = useState(false)
  const supprimer = useDeleteDefautCode()

  const submit = async () => {
    await supprimer.mutateAsync(defaut.id)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <Trash2 className="size-3.5" /> Supprimer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer le code défaut</DialogTitle>
          <DialogDescription>
            Le code « {defaut.code} — {defaut.libelle} » sera supprimé du référentiel. Les contrôles
            déjà enregistrés conservent leurs lignes de défauts.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button variant="destructive" onClick={submit} disabled={supprimer.isPending}>
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
