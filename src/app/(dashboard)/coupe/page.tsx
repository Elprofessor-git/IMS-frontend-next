'use client'

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Layers2,
  Plus,
  Scissors,
  Search,
  TriangleAlert,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { PermissionGate } from '@/components/auth/permission-gate'
import { CommandeSelect } from '@/components/forms/commande-select'
import { useGetCoupesDuJour } from '@/hooks/use-fournitures'
import { useGetCoupeDashboard } from '@/hooks/use-coupe-dashboard'
import { useGetCommandes } from '@/hooks/use-commandes'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { MatelasStats } from '@/types/matelas'
import type { CoupeDashboardCommande } from '@/types/coupe-dashboard'

const STATUTS: Record<string, string> = {
  EnAttente: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Prete: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  EnProduction: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Terminee: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
}

function fmt(v: number) {
  return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

function Kpi({ label, value, suffixe }: { label: string; value: number; suffixe?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">
          {fmt(value)}
          {suffixe ? <span className="ml-1 text-sm font-normal text-muted-foreground">{suffixe}</span> : null}
        </span>
      </CardContent>
    </Card>
  )
}

/**
 * /coupe — tableau de bord transversal du module Coupe : KPI, avancement + reste à
 * planifier/couper par commande, et journal du jour (toutes commandes confondues).
 * La liste part des COMMANDES (endpoint /api/Coupe/Dashboard) : une commande sans
 * aucun matelas est listée avec reste à planifier = demande totale.
 *
 * Point d'entrée du module (2 routes, 1 clic) :
 *  - bouton « Nouvel ordre de coupe » + CommandeSelect en haut de page (recherche par
 *    nom de commande) → /coupe/{commandeId} ;
 *  - bouton « Planifier » sur chaque ligne, y compris les commandes à 0 matelas.
 * Le reste de la lecture/écriture se fait dans /coupe/{commandeId}.
 */
export default function CoupePage() {
  const {
    data: dashboard,
    isLoading,
    isError,
    error,
  } = useGetCoupeDashboard()
  // KPI d'historique : /api/Matelas/Stats (inchangé — pièces commandées/coupées/exportées).
  const { data: stats } = useQuery<MatelasStats>({
    queryKey: ['matelas', 'stats'],
    queryFn: () => apiClient.get<MatelasStats>('/api/Matelas/Stats'),
    retry: false,
  })
  const { data: journal, isLoading: journalLoading } = useGetCoupesDuJour()
  const { data: toutesCommandes } = useGetCommandes()

  const [recherche, setRecherche] = useState('')
  const [dialogOuverture, setDialogOuverture] = useState(false)
  const [commandeChoisie, setCommandeChoisie] = useState<number | null>(null)
  const router = useRouter()

  const commandes = useMemo<CoupeDashboardCommande[]>(
    () => dashboard?.commandes ?? [],
    [dashboard],
  )

  // Filtre texte sur numéro / titre / client / plateforme.
  const commandesFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    if (!q) return commandes
    return commandes.filter((c) =>
      [c.numeroCommande, c.titreCommande, c.clientNom, c.plateformeNom]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    )
  }, [commandes, recherche])

  // Commandes proposées par le sélecteur d'entrée : toutes les commandes non annulées.
  const commandesSelectables = useMemo(
    () => (toutesCommandes ?? []).filter((c) => c.statut !== 4),
    [toutesCommandes],
  )

  function ouvrirOrdreDeCoupe(commandeId: number) {
    setDialogOuverture(false)
    setCommandeChoisie(null)
    setRecherche('')
    router.push(`/coupe/${commandeId}`)
  }

  const accesRefuse =
    (error as unknown as { status?: number } | null | undefined)?.status === 403

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Module Coupe"
          description="Tableau de bord transversal : avancement de la coupe et journal du jour, toutes commandes confondues."
        />
        <Button size="sm" className="mt-6" onClick={() => setDialogOuverture(true)}>
          <Plus className="size-3.5" />
          Nouvel ordre de coupe
        </Button>
      </div>

      {/* Point d'entrée : choisir une commande (recherche par nom) sans passer par le tableau. */}
      <Dialog open={dialogOuverture} onOpenChange={setDialogOuverture}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvel ordre de coupe</DialogTitle>
            <DialogDescription>
              Recherchez la commande à planifier (par nom, client ou numéro) : vous arrivez
              directement sur son ordre de coupe, qu&apos;elle ait déjà des matelas ou non.
            </DialogDescription>
          </DialogHeader>
          <CommandeSelect
            value={commandeChoisie}
            onChange={setCommandeChoisie}
            commandes={commandesSelectables}
            placeholder="Rechercher une commande à planifier…"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOuverture(false)
                setCommandeChoisie(null)
              }}
            >
              Annuler
            </Button>
            <Button
              disabled={commandeChoisie === null}
              onClick={() => commandeChoisie !== null && ouvrirOrdreDeCoupe(commandeChoisie)}
            >
              Ouvrir l&apos;ordre de coupe
              <ArrowRight className="size-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PermissionGate module="coupe" mode="read" fallback={<ForbiddenState moduleLabel="coupe" />}>
        {accesRefuse || isError ? (
          <ForbiddenState moduleLabel="coupe" />
        ) : isLoading ? (
          <div className="grid gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="grid gap-4">
            {/* ─── KPI ─── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Kpi label="Pièces commandées" value={stats?.totalPiecesCommandees ?? 0} />
              <Kpi label="Pièces coupées" value={stats?.totalPiecesCoupees ?? 0} />
              <Kpi label="Pièces exportées" value={stats?.totalPiecesExportees ?? 0} />
              <Kpi label="Restant à couper" value={dashboard?.resteACouper ?? 0} suffixe="pièces" />
              <Kpi label="Restant à planifier" value={dashboard?.resteAPlanifier ?? 0} suffixe="pièces" />
            </div>

            {/* ─── Avancement par commande ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <Scissors className="size-4" />
                  Avancement de la coupe par commande
                  <span className="text-xs font-normal text-muted-foreground">
                    {commandes.length} commande(s) · reste à planifier = demande − Σ plans · reste à couper = Σ plans − Σ
                    coups
                  </span>
                </CardTitle>
                {/* Recherche par nom de commande : le tableau liste des commandes, il doit
                    être filtrable (numéro, titre, client, plateforme). */}
                <div className="relative mt-2 max-w-xs">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Rechercher une commande…"
                    aria-label="Rechercher une commande"
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3">Commande</th>
                        <th className="py-2 pr-3">Client</th>
                        <th className="py-2 pr-3">Statut</th>
                        <th className="py-2 pr-3 text-right">Matelas</th>
                        <th className="py-2 pr-3 text-right">Demandées</th>
                        <th className="py-2 pr-3 text-right">Plan</th>
                        <th className="py-2 pr-3 text-right">Coupées</th>
                        <th className="py-2 pr-3 text-right">À planifier</th>
                        <th className="py-2 pr-3 text-right">À couper</th>
                        <th className="py-2 pr-3 text-right">Avancement</th>
                        <th className="py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commandesFiltrees.map((p) => (
                        <tr key={p.commandeId} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">
                            <span className="block">{p.numeroCommande}</span>
                            {p.titreCommande && (
                              <span className="block text-xs font-normal text-muted-foreground">
                                {p.titreCommande}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {p.clientNom ?? '—'}
                            {p.plateformeNom && (
                              <span className="block text-xs">{p.plateformeNom}</span>
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge
                              variant="outline"
                              className={
                                STATUTS[p.statut] ?? 'border-slate-300 text-slate-700'
                              }
                            >
                              {p.statut}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {p.nombreMatelas === 0 ? (
                              <Badge
                                variant="outline"
                                className="border-dashed border-amber-400 bg-amber-50 text-amber-800"
                                title="Aucun matelas créé : rien n'est encore planifié"
                              >
                                <Layers2 className="size-3" /> 0
                              </Badge>
                            ) : (
                              p.nombreMatelas
                            )}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono">{fmt(p.piecesDemandees)}</td>
                          <td className="py-2 pr-3 text-right font-mono">{fmt(p.piecesPlanifiees)}</td>
                          <td className="py-2 pr-3 text-right font-mono">{fmt(p.piecesCoupees)}</td>
                          <td className="py-2 pr-3 text-right">
                            {p.resteAPlanifier > 0 ? (
                              <Badge
                                variant="outline"
                                className="border-amber-300 bg-amber-50 text-amber-800"
                              >
                                <TriangleAlert className="size-3" /> {fmt(p.resteAPlanifier)}
                              </Badge>
                            ) : (
                              <span className="font-mono text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono font-medium">
                            {fmt(p.resteACouper)}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            <span className="flex items-center justify-end gap-1.5">
                              {p.coupesSansMatelas > 0 && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-300 bg-amber-50 text-amber-800"
                                  title={`${p.coupesSansMatelas} coupe(s) enregistrée(s) sans matelas rattaché`}
                                >
                                  sans matelas
                                </Badge>
                              )}
                              {p.avancement}%
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            {/* Point d'entrée prioritaire : une commande à 0 matelas doit
                                s'ouvrir en un clic, sinon l'utilisateur est bloqué. */}
                            <Button
                              size="sm"
                              variant={p.nombreMatelas === 0 ? 'default' : 'outline'}
                              asChild
                              title={
                                p.nombreMatelas === 0
                                  ? `Planifier ${p.numeroCommande} — aucun matelas créé`
                                  : `Ouvrir l'ordre de coupe de ${p.numeroCommande}`
                              }
                            >
                              <Link href={`/coupe/${p.commandeId}`}>
                                <ClipboardList className="size-3.5" />
                                Planifier
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {commandesFiltrees.length === 0 && (
                        <tr>
                          <td colSpan={11} className="py-6 text-center text-muted-foreground">
                            {commandes.length === 0 ? (
                              <span className="flex flex-col items-center gap-2">
                                <span>Aucune commande active à afficher.</span>
                                <Button size="sm" variant="outline" onClick={() => setDialogOuverture(true)}>
                                  <Plus className="size-3.5" />
                                  Créer un ordre de coupe
                                </Button>
                              </span>
                            ) : (
                              <span className="flex flex-col items-center gap-2">
                                <span>
                                  Aucune commande ne correspond à « {recherche} ».
                                </span>
                                <Button size="sm" variant="ghost" onClick={() => setRecherche('')}>
                                  Réinitialiser la recherche
                                </Button>
                              </span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ─── Journal du jour ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <CalendarDays className="size-4" />
                  Journal du jour
                  {journal && (
                    <Badge variant="outline" className="ml-auto">
                      {journal.nombreLignes} coupe(s) ·{' '}
                      <span className="font-mono">{fmt(journal.totalQuantite)}</span> pièce(s) ·{' '}
                      {new Date(journal.date).toLocaleDateString('fr-FR')}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {journalLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : !journal || journal.lignes.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Aucune coupe enregistrée aujourd&apos;hui.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="py-2 pr-3">Heure</th>
                          <th className="py-2 pr-3">Commande</th>
                          <th className="py-2 pr-3">Matelas</th>
                          <th className="py-2 pr-3">Taille</th>
                          <th className="py-2 pr-3 text-right">Quantité</th>
                          <th className="py-2 pr-3">Par</th>
                          <th className="py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {journal.lignes.map((l) => (
                          <tr key={l.id} className="border-b last:border-0">
                            <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                              {new Date(l.dateCoupe).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-2 pr-3 font-medium">{l.numeroCommande || '—'}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{l.matelasNumero ?? '—'}</td>
                            <td className="py-2 pr-3 font-medium">{l.taille}</td>
                            <td className="py-2 pr-3 text-right font-mono">{fmt(l.quantiteCoupee)}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{l.effectuePar ?? '—'}</td>
                            <td className="py-2 text-right">
                              {l.forcerDepassement && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-300 bg-amber-50 text-amber-800"
                                >
                                  <TriangleAlert className="size-3" /> dépassement forcé
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </PermissionGate>
    </div>
  )
}
