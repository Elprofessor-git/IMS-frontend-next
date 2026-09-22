'use client'

import { useMemo } from 'react'
import { Boxes, CalendarDays, Scissors, TriangleAlert } from 'lucide-react'
import { useGetMatelas } from '@/hooks/use-fournitures'
import { useGetCoupes } from '@/hooks/use-rapport-coupe'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function fmt(v: number) {
  return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
}

export function OrdreDeCoupeSection({ commandeId }: { commandeId: number }) {
  const { data: matelas, isLoading: matelasLoading } = useGetMatelas(commandeId)
  const { data: coupes, isLoading: coupesLoading } = useGetCoupes(commandeId)

  // Répartition par taille de chaque matelas (cumul des LotCoupe) + coupes non rattachées.
  const { parMatelas, totalSansMatelas, parTailleSansMatelas } = useMemo(() => {
    const m = new Map<number, Map<string, number>>()
    let totalSansMatelas = 0
    const parTailleSansMatelas = new Map<string, number>()
    for (const c of coupes ?? []) {
      const q = Number(c.quantiteCoupee) || 0
      if (c.matelasId != null) {
        const tailles = m.get(c.matelasId) ?? new Map<string, number>()
        tailles.set(c.taille, (tailles.get(c.taille) ?? 0) + q)
        m.set(c.matelasId, tailles)
      } else {
        totalSansMatelas += q
        parTailleSansMatelas.set(c.taille, (parTailleSansMatelas.get(c.taille) ?? 0) + q)
      }
    }
    return { parMatelas: m, totalSansMatelas, parTailleSansMatelas }
  }, [coupes])

  // Ordre de coupe = chronologie de réalisation : date du matelas croissante.
  const ordres = useMemo(
    () =>
      (matelas ?? [])
        .slice()
        .sort((a, b) => new Date(a.dateMatelas).getTime() - new Date(b.dateMatelas).getTime()),
    [matelas],
  )

  if (matelasLoading || coupesLoading) return <Skeleton className="h-72 w-full" />

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Scissors className="size-4" /> Ordre de coupe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Matelas triés par date pour suivre l&apos;ordre de réalisation, avec le total coupé et la
            répartition par taille de chacun. Les coupes enregistrées sans matelas sont listées à part.
          </p>

          {ordres.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun matelas rattaché à cette commande.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° matelas</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Plis</TableHead>
                    <TableHead className="text-right">Coupé</TableHead>
                    <TableHead>Répartition par taille</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordres.map((m) => {
                    const tailles = parMatelas.get(m.id) ?? new Map<string, number>()
                    const total = [...tailles.values()].reduce((s, q) => s + q, 0)
                    const depassePlan = m.coupeEstimee > 0 && total > m.coupeEstimee
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Boxes className="mr-1.5 inline size-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-medium">{m.numeroMatelas}</span>
                          {!m.estActif && <Badge variant="outline" className="ml-2">inactif</Badge>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <CalendarDays className="mr-1.5 inline size-3.5" />
                          {fmtDate(m.dateMatelas)}
                        </TableCell>
                        <TableCell className="text-right font-mono">{fmt(m.piecePliage)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {fmt(total)}
                          {m.coupeEstimee > 0 && (
                            <p className="text-xs text-muted-foreground font-normal">
                              plan {fmt(m.coupeEstimee)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {depassePlan && (
                            <Badge
                              variant="outline"
                              className="mr-2 border-amber-300 bg-amber-50 text-amber-800"
                            >
                              <TriangleAlert className="size-3" /> dépasse le plan
                            </Badge>
                          )}
                          {tailles.size === 0 ? (
                            <span className="text-sm text-muted-foreground">Aucune coupe</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {[...tailles.entries()]
                                .sort((a, b) => a[0].localeCompare(b[0]))
                                .map(([taille, q]) => (
                                  <Badge key={taille} variant="secondary">
                                    {taille} × {fmt(q)}
                                  </Badge>
                                ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalSansMatelas > 0 && (
            <div className="rounded-md border border-dashed px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Coupes sans matelas rattaché</span>
                <span className="font-mono">{fmt(totalSansMatelas)} pièce(s)</span>
              </div>
              {parTailleSansMatelas.size > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[...parTailleSansMatelas.entries()]
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([taille, q]) => (
                      <Badge key={taille} variant="outline">
                        {taille} × {fmt(q)}
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}