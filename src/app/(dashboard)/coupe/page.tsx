'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Eye, Scissors, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { PermissionGate } from '@/components/auth/permission-gate'
import { useGetCoupesDuJour } from '@/hooks/use-fournitures'
import { apiClient } from '@/lib/api-client'
import type { MatelasGlobal, MatelasStats } from '@/types/matelas'

const KEY = ['matelas'] as const

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

type LigneCommande = {
  commandeId: number | null
  commande: string
  matelas: number
  /** Demande de la commande (Σ ConfigTaille.Quantite) — même valeur sur chaque matelas. */
  demande: number
  planTotal: number
  coupees: number
  /** Reste à planifier = demande − Σ plans. */
  resteAPlanifier: number
  /** Reste à couper = Σ plans − Σ coupes. */
  resteACouper: number
  avancement: number
}

/**
 * /coupe — tableau de bord transversal du module Coupe : KPI, avancement + reste à
 * planifier/couper par commande, et journal du jour (toutes commandes confondues).
 * Lecture seule : toute écriture se fait dans /coupe/{commandeId}.
 */
export default function CoupePage() {
  const { data: matelas = [], isLoading, isError, error } = useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<MatelasGlobal[]>('/api/Matelas'),
    retry: false,
  })
  const { data: stats } = useQuery<MatelasStats>({
    queryKey: [...KEY, 'stats'],
    queryFn: () => apiClient.get<MatelasStats>('/api/Matelas/Stats'),
    retry: false,
  })
  const { data: journal, isLoading: journalLoading } = useGetCoupesDuJour()

  const parCommande = useMemo<LigneCommande[]>(() => {
    const map = new Map<string, LigneCommande>()
    for (const m of matelas) {
      const cle = m.numeroCommande || 'Sans commande'
      const cur =
        map.get(cle) ??
        ({
          commandeId: m.commandeId,
          commande: cle,
          matelas: 0,
          demande: 0,
          planTotal: 0,
          coupees: 0,
          resteAPlanifier: 0,
          resteACouper: 0,
          avancement: 0,
        } satisfies LigneCommande)
      cur.matelas += 1
      // La demande est une propriété de la commande : on garde le max, jamais la somme
      // (MatelasGlobal la répète sur chaque matelas de la commande).
      cur.demande = Math.max(cur.demande, m.totalPiecesCommandees)
      cur.planTotal += m.totalPlanTheorique
      cur.coupees += m.nombreCoupes
      map.set(cle, cur)
    }
    return Array.from(map.values())
      .map((p) => ({
        ...p,
        resteAPlanifier: Math.max(0, p.demande - p.planTotal),
        resteACouper: Math.max(0, p.planTotal - p.coupees),
        avancement: p.demande > 0 ? Math.min(100, Math.round((p.coupees / p.demande) * 100)) : 0,
      }))
      .sort((a, b) => b.resteACouper + b.resteAPlanifier - (a.resteACouper + a.resteAPlanifier))
  }, [matelas])

  const totaux = useMemo(
    () =>
      parCommande.reduce(
        (acc, p) => ({
          matelas: acc.matelas + p.matelas,
          demande: acc.demande + p.demande,
          planTotal: acc.planTotal + p.planTotal,
          coupees: acc.coupees + p.coupees,
          resteAPlanifier: acc.resteAPlanifier + p.resteAPlanifier,
          resteACouper: acc.resteACouper + p.resteACouper,
        }),
        { matelas: 0, demande: 0, planTotal: 0, coupees: 0, resteAPlanifier: 0, resteACouper: 0 },
      ),
    [parCommande],
  )

  const accesRefuse =
    (error as unknown as { status?: number } | null | undefined)?.status === 403

  return (
    <div>
      <PageHeader
        title="Module Coupe"
        description="Tableau de bord transversal : avancement de la coupe et journal du jour, toutes commandes confondues."
      />

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
              <Kpi label="Pièces commandées" value={stats?.totalPiecesCommandees ?? totaux.demande} />
              <Kpi label="Pièces coupées" value={stats?.totalPiecesCoupees ?? totaux.coupees} />
              <Kpi label="Pièces exportées" value={stats?.totalPiecesExportees ?? 0} />
              <Kpi label="Restant à couper" value={totaux.resteACouper} suffixe="pièces" />
              <Kpi label="Restant à planifier" value={totaux.resteAPlanifier} suffixe="pièces" />
            </div>

            {/* ─── Avancement par commande ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <Scissors className="size-4" />
                  Avancement de la coupe par commande
                  <span className="text-xs font-normal text-muted-foreground">
                    reste à planifier = demande − Σ plans · reste à couper = Σ plans − Σ coups
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3">Commande</th>
                        <th className="py-2 pr-3 text-right">Matelas</th>
                        <th className="py-2 pr-3 text-right">Demandées</th>
                        <th className="py-2 pr-3 text-right">Plan</th>
                        <th className="py-2 pr-3 text-right">Coupées</th>
                        <th className="py-2 pr-3 text-right">À planifier</th>
                        <th className="py-2 pr-3 text-right">À couper</th>
                        <th className="py-2 pr-3 text-right">Avancement</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {parCommande.map((p) => (
                        <tr key={p.commande} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{p.commande}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{p.matelas}</td>
                          <td className="py-2 pr-3 text-right font-mono">{fmt(p.demande)}</td>
                          <td className="py-2 pr-3 text-right font-mono">{fmt(p.planTotal)}</td>
                          <td className="py-2 pr-3 text-right font-mono">{fmt(p.coupees)}</td>
                          <td className="py-2 pr-3 text-right">
                            {p.resteAPlanifier > 0 ? (
                              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                                <TriangleAlert className="size-3" /> {fmt(p.resteAPlanifier)}
                              </Badge>
                            ) : (
                              <span className="font-mono text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono font-medium">
                            {fmt(p.resteACouper)}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{p.avancement}%</td>
                          <td className="py-2 text-right">
                            {p.commandeId !== null && p.commandeId !== undefined && (
                              <Button variant="ghost" size="icon-sm" asChild title="Ouvrir l'ordre de coupe">
                                <Link href={`/coupe/${p.commandeId}`}>
                                  <Eye className="size-3.5" />
                                </Link>
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {parCommande.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-muted-foreground">
                            Aucun matelas planifié pour l&apos;instant.
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
