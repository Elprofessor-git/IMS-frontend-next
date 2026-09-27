'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Layers, Plus, Scissors, Send, AlertTriangle, Truck, ArrowLeft, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PaginatedResponsiveTable } from '@/components/shared/paginated-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useGetChainesProduction } from '@/hooks/use-production'
import { useGetCommandes } from '@/hooks/use-commandes'
import { useCreateOrdreFabrication } from '@/hooks/use-ordres-fabrication'
import { CommandeSelect } from '@/components/forms/commande-select'
import { useGetProductionDashboard, useGetProductionExports, useGetProductionJournal,
  type ProductionDashboardCommande, type ProductionExportParChaine,
  type ProductionEtape, type ProductionEtapeWritePayload,
  type ProductionJournalLigne, type ProductionOfLite } from '@/hooks/use-production'
import type { ApiError } from '@/types/index'

const TYPES_ETAPE = ['Coupe', 'Production', 'ControleQualite', 'Expedition'] as const
const STATUTS_ETAPE = ['NonCommence', 'EnCours', 'Bloque', 'Termine', 'Annule'] as const

const ETAPE_LABELS: Record<string, string> = {
  Coupe: 'Coupe',
  Production: 'Production',
  ControleQualite: 'Contrôle qualité',
  Expedition: 'Expédition',
}

const ETAPE_ICONES: Record<string, React.ElementType> = {
  Coupe: Scissors,
  Production: Layers,
  ControleQualite: ClipboardCheck,
  Expedition: Send,
}

const STATUT_LABELS: Record<string, string> = {
  NonCommence: 'Non commencé',
  EnCours: 'En cours',
  Bloque: 'Bloqué',
  Termine: 'Terminé',
  Annule: 'Annulé',
}

function KpiCard({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-2xl font-semibold tabular-nums ${className}`}>{value}</span>
      </CardContent>
    </Card>
  )
}

function StatutBadge({ statut }: { statut: string }) {
  const classe =
    statut === 'EnCours'
      ? 'bg-emerald-600/15 text-emerald-700'
      : statut === 'Bloque'
        ? 'bg-amber-600/15 text-amber-700'
        : statut === 'Termine'
          ? 'bg-sky-600/15 text-sky-700'
          : statut === 'Annule'
            ? 'bg-rose-600/15 text-rose-700'
            : 'bg-muted text-muted-foreground'
  return (
    <Badge variant="outline" className={classe}>{STATUT_LABELS[statut] ?? statut}</Badge>
  )
}

function TypeEtapeBadge({ type }: { type: string }) {
  const Icon = ETAPE_ICONES[type]
  return (
    <Badge variant="outline">
      {Icon ? <><Icon className="size-3.5" /> {ETAPE_LABELS[type] ?? type}</> : (ETAPE_LABELS[type] ?? type)}
    </Badge>
  )
}

export default function ProductionPage() {
  const { data: commandes } = useGetCommandes()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'detail'>('dashboard')
  const [detailCommandeId, setDetailCommandeId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const { data: dashboard, isLoading: dashboardLoading } = useGetProductionDashboard()
  const { data: journal, isLoading: journalLoading } = useGetProductionJournal()

  // KPI globaux
  const kpis = useMemo(() => {
    if (!dashboard) return { totalCommandes: 0, totalEtapes: 0, enCours: 0, terminees: 0, enRetard: 0, aPlanifier: 0 }
    return {
      totalCommandes: dashboard.nombreCommandes,
      totalEtapes: dashboard.totalEtapes,
      enCours: dashboard.etapesEnCours,
      terminees: dashboard.etapesTerminees,
      enRetard: dashboard.commandesEnRetard,
      aPlanifier: dashboard.commandes.reduce((sum, c) => sum + c.etapesAPlanifier, 0),
    }
  }, [dashboard])

  const commandesDashboard = useMemo(() => {
    const list = dashboard?.commandes ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) =>
      [c.numeroCommande, c.titreCommande, c.clientNom, c.chainePrincipaleNom]
        .some((f) => (f ?? '').toLowerCase().includes(q)),
    )
  }, [dashboard, search])

  return (
    <PermissionGate module="production" mode="read" fallback={<ForbiddenState moduleLabel="production" />}>
      <div className="grid gap-6">
        {/* ─── Header avec bouton d'entrée principal ─── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title="Module Production"
            description="Gamme opératoire des OF (doc 5.3) : étapes Coupe / Production / Contrôle qualité / Expédition suivies par statut, chaîne, dates et temps réel."
          />
          <div className="flex flex-wrap items-center gap-2">
            <PermissionGate module="production" mode="write" fallback={null}>
              <Button size="sm" className="mt-6" onClick={() => { setActiveTab('detail'); setDetailCommandeId(null); }}>
                <Plus className="size-3.5" /> Planifier les étapes
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* ─── Point d'entrée : choisir une commande (CommandeSelect) ─── */}
        <Dialog open={activeTab === 'detail' && detailCommandeId === null} onOpenChange={(open) => { if (!open) setActiveTab('dashboard'); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Planifier les étapes d&apos;un OF</DialogTitle>
              <DialogDescription>
                Recherchez la commande à planifier (par nom, client ou numéro) : vous arrivez
                directement sur son ordre de fabrication, qu&apos;il ait déjà des étapes ou non.
              </DialogDescription>
            </DialogHeader>
            <CommandeSelect
              value={detailCommandeId}
              onChange={setDetailCommandeId}
              commandes={commandes?.filter(c => c.statut !== 3 && c.statut !== 4) ?? []} // exclure Terminée/Annulée
              placeholder="Rechercher une commande à planifier…"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setActiveTab('dashboard'); setDetailCommandeId(null); }}>
                Annuler
              </Button>
              <Button disabled={detailCommandeId === null} onClick={() => { if (detailCommandeId !== null) setActiveTab('detail'); }}>
                <ArrowLeft className="size-3.5" /> Ouvrir l&apos;OF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── KPI globaux ─── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard label="Commandes actives" value={kpis.totalCommandes} />
          <KpiCard label="Total étapes" value={kpis.totalEtapes} />
          <KpiCard label="En cours" value={kpis.enCours} className="text-emerald-600" />
          <KpiCard label="Terminées" value={kpis.terminees} className="text-sky-600" />
          <KpiCard label="En retard" value={kpis.enRetard} className="text-rose-600" />
          <KpiCard label="À planifier" value={kpis.aPlanifier} className="text-amber-600" />
        </div>

        {activeTab === 'dashboard' && (
          <>
            {/* ─── Tableau de bord : liste des commandes avec avancement ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <Layers className="size-4" />
                  Avancement de la production par commande
                  <span className="text-xs font-normal text-muted-foreground">
                    {commandesDashboard.length} commande(s) · triées par retard puis date
                  </span>
                </CardTitle>
                <div className="relative mt-2 max-w-xs">
                  <Input
                    placeholder="Rechercher une commande…"
                    onChange={(e) => setSearch(e.target.value)}
                    value={search}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <PaginatedResponsiveTable
                    label="commandes-production"
                    columns={[
                      {
                        key: 'numeroCommande',
                        header: 'Commande',
                        cardPrimary: true,
                        cell: (row: unknown) => {
                          const c = row as ProductionDashboardCommande
                          return (
                            <>
                              <span className="font-medium">{c.numeroCommande}</span>
                              {c.titreCommande && <span className="block text-xs font-normal text-muted-foreground">{c.titreCommande}</span>}
                            </>
                          )
                        },
                      },
                      {
                        key: 'clientNom',
                        header: 'Client',
                        cell: (row: unknown) => <span className="text-muted-foreground">{(row as ProductionDashboardCommande).clientNom ?? '—'}</span>,
                      },
                      {
                        key: 'statut',
                        header: 'Statut',
                        cell: (row: unknown) => <StatutBadge statut={(row as ProductionDashboardCommande).statut} />,
                      },
                      {
                        key: 'etapeCouranteType',
                        header: 'Étape courante',
                        cell: (row: unknown) => {
                          const c = row as ProductionDashboardCommande
                          if (!c.etapeCouranteType) return <span className="text-muted-foreground">—</span>
                          return <TypeEtapeBadge type={c.etapeCouranteType} />
                        },
                      },
                      {
                        key: 'etapeCouranteStatut',
                        header: 'Statut étape',
                        cell: (row: unknown) => {
                          const c = row as ProductionDashboardCommande
                          if (!c.etapeCouranteStatut) return <span className="text-muted-foreground">—</span>
                          return <StatutBadge statut={c.etapeCouranteStatut} />
                        },
                      },
                      {
                        key: 'etapeCouranteChaine',
                        header: 'Chaîne',
                        cell: (row: unknown) => <span className="text-muted-foreground">{(row as ProductionDashboardCommande).etapeCouranteChaine ?? '—'}</span>,
                      },
                      {
                        key: 'avancement',
                        header: 'Avancement',
                        cell: (row: unknown) => {
                          const c = row as ProductionDashboardCommande
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${c.avancement}%` }} />
                              </div>
                              <span className="text-sm font-mono tabular-nums w-10 text-right">{c.avancement}%</span>
                            </div>
                          )
                        },
                      },
                      {
                        key: 'enRetard',
                        header: 'Retard',
                        cell: (row: unknown) => {
                          const c = row as ProductionDashboardCommande
                          return c.enRetard ? (
                            <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700">
                              <AlertTriangle className="size-3" /> En retard
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
                              <CheckCircle2 className="size-3" /> OK
                            </Badge>
                          )
                        },
                      },
                      {
                        key: 'actions',
                        header: '',
                        cell: (row: unknown) => {
                          const c = row as ProductionDashboardCommande
                          return (
                            <PermissionGate module="production" mode="write" fallback={null}>
                              <Button size="sm" variant="outline" onClick={() => { setDetailCommandeId(c.commandeId); setActiveTab('detail'); }}>
                                <Layers className="size-3.5" /> Planifier
                              </Button>
                            </PermissionGate>
                          )
                        },
                      },
                    ]}
                    data={commandesDashboard}
                    keyExtractor={(c: ProductionDashboardCommande) => c.commandeId}
                    emptyText="Aucune commande active en production."
                    isLoading={dashboardLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ─── Journal du jour ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <RefreshCw className="size-4" />
                  Journal du jour (transitions d&apos;étapes)
                  {journal && (
                    <Badge variant="outline" className="ml-auto">{journal.length} transition(s)</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {journalLoading ? (
                  <div className="h-32 w-full animate-pulse bg-muted" />
                ) : (journal ?? []).length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Aucune transition d&apos;étape aujourd&apos;hui.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <PaginatedResponsiveTable
                      label="journal-production"
                      columns={[
                        { key: 'dateTransition', header: 'Heure', cell: (row: unknown) => new Date((row as ProductionJournalLigne).dateTransition).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) },
                        { key: 'numeroOF', header: 'OF', cell: (row: unknown) => (row as ProductionJournalLigne).numeroOF ?? '—' },
                        { key: 'numeroCommande', header: 'Commande', cell: (row: unknown) => (row as ProductionJournalLigne).numeroCommande ?? '—' },
                        { key: 'typeEtape', header: 'Type', cell: (row: unknown) => <TypeEtapeBadge type={(row as ProductionJournalLigne).typeEtape} /> },
                        { key: 'nouveauStatut', header: 'Nouveau statut', cell: (row: unknown) => <StatutBadge statut={(row as ProductionJournalLigne).nouveauStatut} /> },
                        { key: 'chaineNom', header: 'Chaîne', cell: (row: unknown) => (row as ProductionJournalLigne).chaineNom ?? '—' },
                        { key: 'effectuePar', header: 'Par', cell: (row: unknown) => (row as ProductionJournalLigne).effectuePar ?? '—' },
                      ]}
                      data={journal ?? []}
                      keyExtractor={(j: ProductionJournalLigne) => j.id}
                      emptyText="Aucune transition aujourd'hui."
                      isLoading={journalLoading}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'detail' && detailCommandeId && (
          <ProductionDetailView
            commandeId={detailCommandeId}
            onBack={() => { setActiveTab('dashboard'); setDetailCommandeId(null); }}
          />
        )}
      </div>
    </PermissionGate>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VUE DÉTAIL D'UNE COMMANDE (CRUD étapes + exports par chaîne + journal)
// ─────────────────────────────────────────────────────────────────────────────

function ProductionDetailView({ commandeId, onBack }: { commandeId: number; onBack: () => void }) {
  const { data: dashboard } = useGetProductionDashboard()
  const commande = dashboard?.commandes.find(c => c.commandeId === commandeId)
  const { data: exports } = useGetProductionExports(commandeId)
  const { data: journal = [] } = useGetProductionJournal()
  const { data: chaines = [] } = useGetChainesProduction(false)
  const qc = useQueryClient()

  const { data: etapes = [], isLoading } = useQuery<ProductionEtape[]>({
    queryKey: ['production-etapes', commandeId],
    queryFn: () => apiClient.get<ProductionEtape[]>(`/api/OrdreFabricationEtape?commandeId=${commandeId}`),
    retry: false,
  })

  const [dialogCreation, setDialogCreation] = useState(false)
  const [editingEtape, setEditingEtape] = useState<ProductionEtape | null>(null)
  const openEditDialog = (e: ProductionEtape) => setEditingEtape(e)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.del(`/api/OrdreFabricationEtape/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production-etapes', commandeId] }); qc.invalidateQueries({ queryKey: ['production', 'dashboard'] }); toast.success('Étape supprimée'); },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur suppression'),
  })

  if (!commande) return <div className="p-4 text-muted-foreground">Commande introuvable</div>

  return (
    <div className="grid gap-6">
      {/* Header avec retour */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-3.5" /> Retour au tableau de bord</Button>
        <PageHeader title={`Production — ${commande.numeroCommande}`} description={commande.titreCommande ?? ''} />
      </div>

      {/* KPI commande */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <KpiCard label="Étapes totales" value={commande.nombreEtapes} />
        <KpiCard label="En cours" value={commande.etapesEnCours} className="text-emerald-600" />
        <KpiCard label="Terminées" value={commande.etapesTerminees} className="text-sky-600" />
        <KpiCard label="Avancement" value={commande.avancement} className="text-primary" />
      </div>

      {/* ─── CRUD Étapes ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <Layers className="size-4" />
            Gamme opératoire (étapes de l&apos;OF)
            <PermissionGate module="production" mode="write" fallback={null}>
              <Button size="sm" className="ml-auto" onClick={() => setDialogCreation(true)}>
                <Plus className="size-3.5" /> Nouvelle étape
              </Button>
            </PermissionGate>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <PaginatedResponsiveTable
              label="etapes-of"
              columns={[
                { key: 'typeEtape', header: 'Type', cell: (row: unknown) => <TypeEtapeBadge type={(row as ProductionEtape).typeEtape} /> },
                { key: 'statut', header: 'Statut', cell: (row: unknown) => <StatutBadge statut={(row as ProductionEtape).statut} /> },
                { key: 'chaineProductionNom', header: 'Chaîne', cell: (row: unknown) => (row as ProductionEtape).chaineProductionNom ?? '—' },
                { key: 'dateDebutPrevue', header: 'Début prévu', cell: (row: unknown) => (row as ProductionEtape).dateDebutPrevue ? new Date((row as ProductionEtape).dateDebutPrevue!).toLocaleDateString('fr-FR') : '—' },
                { key: 'dateFinPrevue', header: 'Fin prévue', cell: (row: unknown) => (row as ProductionEtape).dateFinPrevue ? new Date((row as ProductionEtape).dateFinPrevue!).toLocaleDateString('fr-FR') : '—' },
                { key: 'dateDebutReelle', header: 'Début réel', cell: (row: unknown) => (row as ProductionEtape).dateDebutReelle ? new Date((row as ProductionEtape).dateDebutReelle!).toLocaleDateString('fr-FR') : '—' },
                { key: 'dateFinReelle', header: 'Fin réelle', cell: (row: unknown) => (row as ProductionEtape).dateFinReelle ? new Date((row as ProductionEtape).dateFinReelle!).toLocaleDateString('fr-FR') : '—' },
                { key: 'tempsTheoriqueHeures', header: 'Temps théo. (h)', cell: (row: unknown) => (row as ProductionEtape).tempsTheoriqueHeures ?? '—' },
                { key: 'tempsReelHeures', header: 'Temps réel (h)', cell: (row: unknown) => (row as ProductionEtape).tempsReelHeures ?? '—' },
                { key: 'responsableAssigne', header: 'Responsable', cell: (row: unknown) => (row as ProductionEtape).responsableAssigne ?? '—' },
                {
                  key: 'actions',
                  header: '',
                  cell: (row: unknown) => {
                    const e = row as ProductionEtape
                    return (
                      <PermissionGate module="production" mode="write" fallback={null}>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(e)}><ClipboardCheck className="size-3.5" /> Modifier</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(e.id)}><Scissors className="size-3.5" /> Supprimer</Button>
                        </div>
                      </PermissionGate>
                    )
                  },
                },
              ]}
              data={etapes}
              keyExtractor={(e: ProductionEtape) => e.id}
              emptyText="Aucune étape planifiée pour cet OF. Créez la première étape ci-dessus."
              isLoading={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Exports par chaîne (LotExport) ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <Truck className="size-4" />
            Suivi par chaîne (exports)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exports && exports.length > 0 ? (
            <PaginatedResponsiveTable
              label="exports-chaine"
              columns={[
                { key: 'chaineNom', header: 'Chaîne', cardPrimary: true, cell: (row: unknown) => (row as ProductionExportParChaine).chaineNom },
                { key: 'totalExports', header: 'Nb exports', cell: (row: unknown) => (row as ProductionExportParChaine).totalExports },
                { key: 'piecesExportees', header: 'Pièces exportées', cell: (row: unknown) => (row as ProductionExportParChaine).piecesExportees },
              ]}
              data={exports}
              keyExtractor={(e: ProductionExportParChaine) => e.chaineProductionId}
              emptyText="Aucun export pour cette commande."
            />
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucun export enregistré pour cette commande.</p>
          )}
        </CardContent>
      </Card>

      {/* ─── Journal spécifique à la commande ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <RefreshCw className="size-4" />
            Historique des transitions (cette commande)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {journal && journal.length > 0 ? (
            <PaginatedResponsiveTable
              label="journal-commande"
              columns={[
                { key: 'dateTransition', header: 'Date/Heure', cell: (row: unknown) => new Date((row as ProductionJournalLigne).dateTransition).toLocaleString('fr-FR') },
                { key: 'numeroOF', header: 'OF', cell: (row: unknown) => (row as ProductionJournalLigne).numeroOF ?? '—' },
                { key: 'typeEtape', header: 'Type', cell: (row: unknown) => <TypeEtapeBadge type={(row as ProductionJournalLigne).typeEtape} /> },
                { key: 'nouveauStatut', header: 'Statut', cell: (row: unknown) => <StatutBadge statut={(row as ProductionJournalLigne).nouveauStatut} /> },
                { key: 'chaineNom', header: 'Chaîne', cell: (row: unknown) => (row as ProductionJournalLigne).chaineNom ?? '—' },
                { key: 'effectuePar', header: 'Par', cell: (row: unknown) => (row as ProductionJournalLigne).effectuePar ?? '—' },
              ]}
              data={journal.filter((j: ProductionJournalLigne) => j.commandeId === commandeId)}
              keyExtractor={(j: ProductionJournalLigne) => j.id}
              emptyText="Aucun historique pour cette commande."
            />
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucun historique pour cette commande.</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog création étape */}
      <CreateEtapeDialog
        open={dialogCreation}
        onOpenChange={setDialogCreation}
        commandeId={commandeId}
        commandeNumero={commande?.numeroCommande}
        chaines={chaines}
        onSuccess={() => { setDialogCreation(false); qc.invalidateQueries({ queryKey: ['production-etapes', commandeId] }); qc.invalidateQueries({ queryKey: ['production', 'dashboard'] }); }}
      />

      {/* Dialog édition étape */}
      {editingEtape && (
        <EditEtapeDialog
          open={true}
          onOpenChange={(open) => { if (!open) setEditingEtape(null); }}
          etape={editingEtape}
          chaines={chaines}
          onSuccess={() => { setEditingEtape(null); qc.invalidateQueries({ queryKey: ['production-etapes', commandeId] }); qc.invalidateQueries({ queryKey: ['production', 'dashboard'] }); }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DIALOG CRÉATION ÉTAPE
// ─────────────────────────────────────────────────────────────────────────────

function CreateEtapeDialog({ open, onOpenChange, commandeId, commandeNumero, chaines, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void; commandeId: number; commandeNumero?: string | null; chaines: { id: number; nom: string }[]; onSuccess: () => void
}) {
  const [typeEtape, setTypeEtape] = useState('Production')
  const [statut, setStatut] = useState('NonCommence')
  const [chaineId, setChaineId] = useState('')
  const [responsable, setResponsable] = useState('')
  const [tempsTheorique, setTempsTheorique] = useState('')
  const [dateDebutPrevue, setDateDebutPrevue] = useState('')
  const [dateFinPrevue, setDateFinPrevue] = useState('')
  const [notes, setNotes] = useState('')
  const [ofId, setOfId] = useState<string>('')
  const [nouveauOfNumero, setNouveauOfNumero] = useState(
    commandeNumero ? `OF-${commandeNumero}` : '',
  )

  const creerOf = useCreateOrdreFabrication()
  const qcLocal = useQueryClient()

  const { data: ordres = [] } = useQuery<ProductionOfLite[]>({
    queryKey: ['of', 'commande', commandeId],
    queryFn: () => apiClient.get<ProductionOfLite[]>(`/api/OrdreFabrication/CommandeClient/${commandeId}`),
    enabled: commandeId > 0,
    retry: false,
  })

  const { mutate, isPending } = useMutation<{ message?: string }, ApiError, ProductionEtapeWritePayload>({
    mutationFn: (payload: ProductionEtapeWritePayload) =>
      apiClient.post<{ message?: string }>('/api/OrdreFabricationEtape', payload),
    onSuccess: (res) => { toast.success(res?.message ?? 'Étape créée'); onSuccess(); },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur création'),
  })

  const submit = () => {
    const ordreFabricationId = Number(ofId)
    if (!ordreFabricationId) { toast.error('Choisissez un OF'); return }
    mutate({
      ordreFabricationId,
      typeEtape,
      statut,
      chaineProductionId: chaineId ? Number(chaineId) : null,
      planningEntryId: null,
      dateDebutPrevue: dateDebutPrevue || null,
      dateFinPrevue: dateFinPrevue || null,
      tempsTheoriqueHeures: Number(tempsTheorique) || 0,
      responsableAssigne: responsable.trim() || null,
      notes: notes.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle étape d&apos;OF</DialogTitle>
          <DialogDescription>Gamme opératoire 5.3 : jalon (Coupe, Production, Contrôle qualité, Expédition) rattaché à un ordre de fabrication.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="nouvelle-etape-commande">Commande</Label>
              <div
                id="nouvelle-etape-commande"
                className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm"
              >
                {commandeNumero || `Commande #${commandeId}`}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Ordre de fabrication</Label>
              <Select value={ofId} onValueChange={setOfId} disabled={ordres.length === 0}>
                <SelectTrigger><SelectValue placeholder={ordres.length > 0 ? 'Choisir un OF…' : 'Aucun OF pour cette commande'} /></SelectTrigger>
                <SelectContent>{ordres.map((o: ProductionOfLite) => <SelectItem key={o.id} value={String(o.id)}>{o.numeroOF}</SelectItem>)}</SelectContent>
              </Select>
              {ordres.length === 0 && (
                <div className="mt-1 grid gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50/60 p-2">
                  <p className="text-xs text-amber-800">
                    Cette commande n&apos;a pas encore d&apos;ordre de fabrication. Créez-le pour pouvoir saisir sa première étape.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={nouveauOfNumero}
                      onChange={(ev) => setNouveauOfNumero(ev.target.value)}
                      placeholder="N° d&apos;OF (ex. OF-2026-001)"
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!nouveauOfNumero.trim() || creerOf.isPending}
                      onClick={() =>
                        creerOf.mutate(
                          { commandeId, numeroOF: nouveauOfNumero.trim(), chaineProductionId: chaineId ? Number(chaineId) : null, notes: null },
                          { onSuccess: (res) => {
                            setOfId(String(res.id))
                            qcLocal.invalidateQueries({ queryKey: ['of', 'commande', commandeId] })
                          } },
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
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type d&apos;étape</Label>
              <Select value={typeEtape} onValueChange={setTypeEtape}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES_ETAPE.map((t) => <SelectItem key={t} value={t}>{ETAPE_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Statut</Label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUTS_ETAPE.map((s) => <SelectItem key={s} value={s}>{STATUT_LABELS[s] ?? s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Chaîne</Label>
              <Select value={chaineId} onValueChange={setChaineId}>
                <SelectTrigger><SelectValue placeholder="Sans chaîne…" /></SelectTrigger>
                <SelectContent>{chaines.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Temps théorique (h)</Label>
              <Input type="number" min={0} value={tempsTheorique} onChange={(e) => setTempsTheorique(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Début prévu</Label>
              <Input type="date" value={dateDebutPrevue} onChange={(e) => setDateDebutPrevue(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Fin prévue</Label>
              <Input type="date" value={dateFinPrevue} onChange={(e) => setDateFinPrevue(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Responsable</Label>
            <Input value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Nom de l'opérateur" />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observations…" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
          <Button onClick={submit} disabled={isPending}><Plus className="size-3.5" /> Créer l&apos;étape</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DIALOG ÉDITION ÉTAPE
// ─────────────────────────────────────────────────────────────────────────────

function EditEtapeDialog({ open, onOpenChange, etape, chaines, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void; etape: ProductionEtape; chaines: { id: number; nom: string }[]; onSuccess: () => void
}) {
  const [typeEtape, setTypeEtape] = useState(etape.typeEtape)
  const [statut, setStatut] = useState(etape.statut)
  const [chaineId, setChaineId] = useState(etape.chaineProductionId?.toString() ?? '')
  const [responsable, setResponsable] = useState(etape.responsableAssigne ?? '')
  const [tempsTheorique, setTempsTheorique] = useState(etape.tempsTheoriqueHeures?.toString() ?? '')
  const [dateDebutPrevue, setDateDebutPrevue] = useState(etape.dateDebutPrevue?.slice(0, 10) ?? '')
  const [dateFinPrevue, setDateFinPrevue] = useState(etape.dateFinPrevue?.slice(0, 10) ?? '')
  const [notes, setNotes] = useState(etape.notes ?? '')

  const { mutate } = useMutation<{ message?: string }, ApiError, Omit<ProductionEtapeWritePayload, 'ordreFabricationId'>>({
    mutationFn: (data) => apiClient.put<{ message?: string }>(`/api/OrdreFabricationEtape/${etape.id}`, data),
    onSuccess: (res) => { toast.success(res?.message ?? 'Étape mise à jour'); onSuccess(); },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur modification'),
  })

  const submit = () => {
    mutate({
      typeEtape,
      statut,
      chaineProductionId: chaineId ? Number(chaineId) : null,
      planningEntryId: null,
      dateDebutPrevue: dateDebutPrevue || null,
      dateFinPrevue: dateFinPrevue || null,
      tempsTheoriqueHeures: Number(tempsTheorique) || 0,
      responsableAssigne: responsable.trim() || null,
      notes: notes.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;étape</DialogTitle>
          <DialogDescription>OF {etape.numeroOF} — étape #{etape.id}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type d&apos;étape</Label>
              <Select value={typeEtape} onValueChange={setTypeEtape}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES_ETAPE.map((t) => <SelectItem key={t} value={t}>{ETAPE_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Statut</Label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUTS_ETAPE.map((s) => <SelectItem key={s} value={s}>{STATUT_LABELS[s] ?? s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Chaîne</Label>
              <Select value={chaineId} onValueChange={setChaineId}>
                <SelectTrigger><SelectValue placeholder="Sans chaîne…" /></SelectTrigger>
                <SelectContent>{chaines.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Temps théorique (h)</Label>
              <Input type="number" min={0} value={tempsTheorique} onChange={(e) => setTempsTheorique(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Début prévu</Label>
              <Input type="date" value={dateDebutPrevue} onChange={(e) => setDateDebutPrevue(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Fin prévue</Label>
              <Input type="date" value={dateFinPrevue} onChange={(e) => setDateFinPrevue(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Responsable</Label>
            <Input value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Nom de l'opérateur" />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observations…" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
          <Button onClick={submit} disabled={false}><ClipboardCheck className="size-3.5" /> Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

