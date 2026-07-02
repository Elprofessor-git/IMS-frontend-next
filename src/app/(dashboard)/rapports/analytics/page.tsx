'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Clock, RotateCcw, AlertTriangle, CheckSquare, ShoppingCart, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetAchats } from '@/hooks/use-achats'
import { useMouvementStatistiques } from '@/hooks/use-mouvements'
import { useGetStocks, useGetStocksAlertes } from '@/hooks/use-stocks'
import { useGetTachesDashboard } from '@/hooks/use-taches'

function formatCurrency(val: number) {
  return val.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  valueClass,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
  valueClass?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${valueClass ?? ''}`}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const date30j = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  }, [])

  const { data: achats, isLoading: loadingAchats } = useGetAchats()
  const { data: stats } = useMouvementStatistiques({ dateDebut: date30j })
  const { data: stocks, isLoading: loadingStocks } = useGetStocks()
  const { data: alertes, isLoading: loadingAlertes } = useGetStocksAlertes()
  const { data: taches, isLoading: loadingTaches } = useGetTachesDashboard()

  const loading = loadingAchats || loadingStocks || loadingAlertes || loadingTaches

  // 1. Montant moyen par achat (non annulés)
  const { montantMoyen, nbAchats } = useMemo(() => {
    const actifs = achats?.filter((a) => a.statut !== 4) ?? []
    if (!actifs.length) return { montantMoyen: 0, nbAchats: 0 }
    const total = actifs.reduce((s, a) => s + a.montantTotal, 0)
    return { montantMoyen: total / actifs.length, nbAchats: actifs.length }
  }, [achats])

  // 2. Délai moyen de livraison — achats livrés (statut 3, dateLivraisonReelle présente)
  const { delaiMoyen, nbLivres } = useMemo(() => {
    const livres = achats?.filter((a) => a.statut === 3 && a.dateLivraisonReelle != null) ?? []
    if (!livres.length) return { delaiMoyen: null, nbLivres: 0 }
    const totalJours = livres.reduce((s, a) => {
      const diff =
        (new Date(a.dateLivraisonReelle!).getTime() - new Date(a.dateAchat).getTime()) /
        86400000
      return s + diff
    }, 0)
    return { delaiMoyen: totalJours / livres.length, nbLivres: livres.length }
  }, [achats])

  // 3. Rotation de stock (jours de stock) = stockLibre / (sorties30j / 30)
  const { rotation, stockLibre } = useMemo(() => {
    const libre =
      stocks?.filter((s) => s.typeStock === 0).reduce((sum, s) => sum + s.quantite, 0) ?? 0
    const sorties30j = stats?.quantiteTotaleSortie ?? 0
    const rot = sorties30j > 0 ? Math.round(libre / (sorties30j / 30)) : null
    return { rotation: rot, stockLibre: libre }
  }, [stats, stocks])

  // 4. % articles en alerte (alertes.id = articleId côté AlerteStock)
  const { pctAlerte, nbAlertes, nbArticles } = useMemo(() => {
    const alerteIds = new Set(alertes?.map((a) => a.id) ?? [])
    const articleIds = new Set(stocks?.map((s) => s.articleId) ?? [])
    const pct =
      articleIds.size > 0 ? Math.round((alerteIds.size / articleIds.size) * 100) : 0
    return { pctAlerte: pct, nbAlertes: alerteIds.size, nbArticles: articleIds.size }
  }, [alertes, stocks])

  // 5. Ratio tâches en cours / (en cours + terminées)
  const ratioTaches = useMemo(() => {
    if (!taches) return null
    const denom = taches.enCours + taches.terminees
    if (!denom) return 0
    return Math.round((taches.enCours / denom) * 100)
  }, [taches])

  // 6. Graphique : montant achats par mois sur 6 mois (non annulés)
  const chartData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      const montant =
        achats
          ?.filter((a) => a.statut !== 4 && a.dateAchat?.startsWith(key))
          .reduce((s, a) => s + a.montantTotal, 0) ?? 0
      return { mois: label, montant }
    })
  }, [achats])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Indicateurs de performance — calculs temps réel sur toutes les données
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Montant moyen / achat"
          value={nbAchats > 0 ? formatCurrency(montantMoyen) : '—'}
          subtitle={`${nbAchats} achat${nbAchats > 1 ? 's' : ''} actifs`}
          icon={ShoppingCart}
        />

        <KpiCard
          title="Délai moyen de livraison"
          value={delaiMoyen != null ? `${delaiMoyen.toFixed(1)} j` : '—'}
          subtitle={
            nbLivres > 0
              ? `${nbLivres} livraison${nbLivres > 1 ? 's' : ''} enregistrée${nbLivres > 1 ? 's' : ''}`
              : 'Aucune livraison enregistrée'
          }
          icon={Clock}
          valueClass={
            delaiMoyen != null && delaiMoyen > 30 ? 'text-amber-500' : undefined
          }
        />

        <KpiCard
          title="Rotation de stock"
          value={rotation != null ? `${rotation} j` : '—'}
          subtitle={
            rotation != null
              ? `Stock libre : ${stockLibre} unités · base 30 j`
              : 'Aucune sortie sur 30 j'
          }
          icon={RotateCcw}
          valueClass={
            rotation != null && rotation < 15
              ? 'text-destructive'
              : rotation != null && rotation < 45
              ? 'text-amber-500'
              : undefined
          }
        />

        <KpiCard
          title="Articles en alerte"
          value={`${pctAlerte} %`}
          subtitle={`${nbAlertes} / ${nbArticles} articles`}
          icon={AlertTriangle}
          valueClass={
            pctAlerte > 30
              ? 'text-destructive'
              : pctAlerte > 10
              ? 'text-amber-500'
              : 'text-green-600'
          }
        />

        <KpiCard
          title="Tâches en cours / terminées"
          value={ratioTaches != null ? `${ratioTaches} %` : '—'}
          subtitle={
            taches
              ? `En cours : ${taches.enCours} · Terminées : ${taches.terminees}`
              : 'Aucune donnée'
          }
          icon={CheckSquare}
          valueClass={
            ratioTaches != null && ratioTaches > 70 ? 'text-amber-500' : undefined
          }
        />

        <KpiCard
          title="Achats (mois en cours)"
          value={
            chartData.at(-1)?.montant
              ? formatCurrency(chartData.at(-1)!.montant)
              : '—'
          }
          subtitle="Montant non annulé"
          icon={TrendingUp}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Montant des achats par mois</CardTitle>
          <p className="text-sm text-muted-foreground">6 derniers mois · hors achats annulés</p>
        </CardHeader>
        <CardContent>
          {mounted ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Montant']}
                />
                <Bar dataKey="montant" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-[240px] w-full" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
