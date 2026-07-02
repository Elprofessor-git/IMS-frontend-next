'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ClipboardList, ShoppingCart, Package, AlertTriangle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetCommandes } from '@/hooks/use-commandes'
import { useGetAchats } from '@/hooks/use-achats'
import { useGetStocks, useGetStocksAlertes } from '@/hooks/use-stocks'
import { useGetMouvements } from '@/hooks/use-mouvements'
import { useGetTachesDashboard } from '@/hooks/use-taches'
import { STATUT_ACHAT } from '@/types/fournisseur'
import { TYPE_MOUVEMENT } from '@/types/mouvement'

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

// ── Style maps ─────────────────────────────────────────────────────────────────

const MOUVEMENT_COLORS: Record<number, string> = {
  0: 'bg-green-100 text-green-700',
  1: 'bg-red-100 text-red-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-amber-100 text-amber-700',
  4: 'bg-purple-100 text-purple-700',
  5: 'bg-slate-100 text-slate-600',
}

const ACHAT_BADGE_VARIANT: Record<
  number,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  0: 'secondary',
  1: 'outline',
  2: 'default',
  3: 'outline',
  4: 'destructive',
}

const ACHAT_BADGE_CLASS: Record<number, string> = {
  3: 'border-green-200 bg-green-100 text-green-800',
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  sub,
  icon,
  loading,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <p className="text-2xl font-bold leading-none">{value}</p>
          )}
          {sub && !loading && (
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Dashboard Page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: commandes, isLoading: loadingCommandes } = useGetCommandes()
  const { data: achats, isLoading: loadingAchats } = useGetAchats()
  const { data: stocks, isLoading: loadingStocks } = useGetStocks()
  const { data: alertes, isLoading: loadingAlertes } = useGetStocksAlertes()
  const { data: mouvements, isLoading: loadingMouvements } = useGetMouvements()
  const { data: dashboard } = useGetTachesDashboard()

  // Évite les erreurs d'hydratation avec recharts (ResizeObserver côté client uniquement)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // ── Mois courant ─────────────────────────────────────────────────────────────
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // ── KPI : commandes actives (Prête=1 + En production=2) ─────────────────────
  const commandesActives = useMemo(
    () => commandes?.filter((c) => c.statut === 1 || c.statut === 2).length ?? 0,
    [commandes],
  )

  // ── KPI : achats du mois courant ─────────────────────────────────────────────
  const achatsDuMois = useMemo(
    () => achats?.filter((a) => a.dateAchat?.startsWith(currentMonthKey)) ?? [],
    [achats, currentMonthKey],
  )
  const montantDuMois = useMemo(
    () => achatsDuMois.reduce((s, a) => s + (a.montantTotal ?? 0), 0),
    [achatsDuMois],
  )

  // ── KPI : stock valorisé (quantite × prixUnitaire par entrée) ────────────────
  const stockValorise = useMemo(
    () => stocks?.reduce((s, st) => s + st.quantite * st.prixUnitaire, 0) ?? 0,
    [stocks],
  )

  // ── KPI : alertes ─────────────────────────────────────────────────────────────
  const nbAlertes = alertes?.length ?? 0
  const nbCritiques = useMemo(
    () => alertes?.filter((a) => a.estCritique).length ?? 0,
    [alertes],
  )

  // ── Graphique : achats par mois (6 derniers mois) ────────────────────────────
  const chartData = useMemo(() => {
    const n = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(n.getFullYear(), n.getMonth() - 5 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      const total =
        achats
          ?.filter((a) => a.dateAchat?.startsWith(key))
          .reduce((s, a) => s + (a.montantTotal ?? 0), 0) ?? 0
      return { month: label, total }
    })
  }, [achats])

  // ── Activité récente ──────────────────────────────────────────────────────────
  const derniersMouvements = useMemo(() => mouvements?.slice(0, 10) ?? [], [mouvements])

  const derniersAchats = useMemo(
    () =>
      [...(achats ?? [])]
        .sort(
          (a, b) =>
            new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime(),
        )
        .slice(0, 5),
    [achats],
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          title="Commandes actives"
          value={commandesActives}
          sub="Prête + En production"
          icon={<ClipboardList className="size-5" />}
          loading={loadingCommandes}
        />
        <KpiCard
          title="Achats ce mois"
          value={fmtEur(montantDuMois)}
          sub={`${achatsDuMois.length} ordre(s)`}
          icon={<ShoppingCart className="size-5" />}
          loading={loadingAchats}
        />
        <KpiCard
          title="Stock valorisé"
          value={fmtEur(stockValorise)}
          sub={`${stocks?.length ?? 0} entrées`}
          icon={<Package className="size-5" />}
          loading={loadingStocks}
        />
        <KpiCard
          title="Alertes stock"
          value={nbAlertes}
          sub={nbCritiques > 0 ? `dont ${nbCritiques} critique(s)` : 'Aucun critique'}
          icon={<AlertTriangle className="size-5" />}
          loading={loadingAlertes}
        />
      </div>

      {/* ── Graphique + Widget tâches ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Graphique achats par mois */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Achats par mois — 6 derniers mois</CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted || loadingAchats ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                    tick={{ fontSize: 12 }}
                    width={42}
                  />
                  <Tooltip
                    formatter={(value) => [fmtEur(Number(value)), 'Montant total']}
                  />
                  <Bar dataKey="total" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Widget tâches de production */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Tâches de production</CardTitle>
            <Link
              href="/taches"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Voir tout <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {!dashboard ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { label: 'Total', value: dashboard.totalTaches },
                      { label: 'En cours', value: dashboard.enCours },
                      { label: 'Bloquées', value: dashboard.bloquees },
                      { label: 'Urgentes', value: dashboard.tachesUrgentes },
                    ] as const
                  ).map(({ label, value }) => (
                    <div key={label} className="rounded-md bg-muted px-3 py-2">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-lg font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Avancement moyen</span>
                    <span>{dashboard.avancementMoyen.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{
                        width: `${Math.min(100, dashboard.avancementMoyen)}%`,
                      }}
                    />
                  </div>
                </div>
                {dashboard.tachesEnRetard > 0 && (
                  <p className="text-xs text-destructive">
                    ⚠ {dashboard.tachesEnRetard} tâche(s) en retard
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Activité récente ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* 10 derniers mouvements de stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Derniers mouvements de stock</CardTitle>
            <Link
              href="/mouvements"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Voir tout <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingMouvements ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : derniersMouvements.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aucun mouvement enregistré.
              </p>
            ) : (
              <div className="divide-y">
                {derniersMouvements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${MOUVEMENT_COLORS[m.typeMouvement] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {TYPE_MOUVEMENT[m.typeMouvement]}
                      </span>
                      <span className="truncate text-sm">
                        {m.article?.designation ?? `Stock #${m.stockId}`}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          m.typeMouvement === 0
                            ? 'text-green-600'
                            : m.typeMouvement === 1
                              ? 'text-destructive'
                              : ''
                        }`}
                      >
                        {m.typeMouvement === 1 ? '-' : '+'}
                        {m.quantite}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(m.dateMouvement)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5 derniers achats créés */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Derniers achats</CardTitle>
            <Link
              href="/achats"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Voir tout <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingAchats ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : derniersAchats.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aucun achat enregistré.
              </p>
            ) : (
              <div className="divide-y">
                {derniersAchats.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-medium">
                        {a.numeroAchat}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.fournisseur?.nomEntreprise ?? `Fournisseur #${a.fournisseurId}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        {fmtEur(a.montantTotal)}
                      </span>
                      <Badge
                        variant={ACHAT_BADGE_VARIANT[a.statut] ?? 'secondary'}
                        className={ACHAT_BADGE_CLASS[a.statut] ?? ''}
                      >
                        {STATUT_ACHAT[a.statut] ?? String(a.statut)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
