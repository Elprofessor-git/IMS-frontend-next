'use client'

import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { useGetOrdreDeCoupe } from '@/hooks/use-plan-de-coupe'
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
  const { data: doc, isLoading } = useGetOrdreDeCoupe(commandeId)

  if (isLoading) return <Skeleton className="h-72 w-full" />
  if (!doc) return null

  return (
    <div className="grid gap-4">
      {/* ─── Couverture par taille : Σ plans vs demande (avec marge) ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            Couverture par taille
            {doc.totalPlanTheorique > 0 && (
              <Badge variant="outline" className="ml-auto">
                Plan total <span className="font-mono">{fmt(doc.totalPlanTheorique)}</span> · Coupé{' '}
                <span className="font-mono">{fmt(doc.totalCoupeReelle)}</span>
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Cumul des plans des matelas (Σ Occurrences × Plis) comparé à la demande de la commande,
            avec la marge de sécurité ({fmt(doc.margeSecuriteDefaut)} %) comme seuil de dépassement.
            Le plan est la référence atelier ; le garde-fou administratif reste la demande × marge.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Taille</TableHead>
                  <TableHead className="text-right">Demande</TableHead>
                  <TableHead className="text-right">Seuil (+ marge)</TableHead>
                  <TableHead className="text-right">Plan théorique</TableHead>
                  <TableHead className="text-right">Coupé réel</TableHead>
                  <TableHead>Couverture</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doc.tailles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      Aucune taille configurée pour cette commande.
                    </TableCell>
                  </TableRow>
                ) : (
                  doc.tailles.map((t) => (
                    <TableRow key={t.taille}>
                      <TableCell className="font-medium">{t.taille}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(t.quantiteCommande)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {fmt(t.seuil)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {fmt(t.planTheorique)}
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmt(t.coupeReelle)}</TableCell>
                      <TableCell>
                        {t.planTheorique === 0 ? (
                          <Badge variant="outline">plan vide</Badge>
                        ) : t.depassePlan ? (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                            <TriangleAlert className="size-3" /> plan &gt; seuil
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-green-300 bg-green-50 text-green-800"
                          >
                            <CheckCircle2 className="size-3" /> dans la marge
                          </Badge>
                        )}
                        {t.depasseCoupe && (
                          <Badge variant="outline" className="ml-1.5 border-red-300 bg-red-50 text-red-800">
                            réel &gt; seuil
                          </Badge>
                        )}
                        {t.coupesSansMatelas > 0 && (
                          <Badge variant="outline" className="ml-1.5">
                            +{fmt(t.coupesSansMatelas)} sans matelas
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Plans par matelas ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">Plans par matelas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordre</TableHead>
                  <TableHead>N° matelas</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Plis</TableHead>
                  <TableHead className="text-right">Longueur (m)</TableHead>
                  <TableHead className="text-right">Plan</TableHead>
                  <TableHead className="text-right">Coupé</TableHead>
                  <TableHead>Répartition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doc.matelas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                      Aucun matelas rattaché à cette commande.
                    </TableCell>
                  </TableRow>
                ) : (
                  doc.matelas.map((m) => (
                    <TableRow key={m.matelasId}>
                      <TableCell className="text-muted-foreground">#{m.ordreDeCoupe}</TableCell>
                      <TableCell className="font-medium">{m.numeroMatelas}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(m.dateMatelas)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(m.piecePliage)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {m.longueur == null ? '—' : fmt(m.longueur)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {fmt(m.totalTheorique)}
                        {m.longueur != null && (
                          <p className="text-xs font-normal text-muted-foreground">
                            tissu ≈ {fmt(m.longueur * m.piecePliage)} m
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(m.totalCoupeReelle)}
                        {m.totalCoupeReelle > m.totalTheorique && m.totalTheorique > 0 && (
                          <Badge
                            variant="outline"
                            className="ml-1.5 border-amber-300 bg-amber-50 text-amber-800"
                          >
                            dépasse le plan
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.lignes.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Aucune ligne de plan</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {m.lignes
                              .slice()
                              .sort((a, b) => a.taille.localeCompare(b.taille))
                              .map((l) => (
                                <Badge key={l.taille} variant="secondary" title={`Occurrences ${fmt(l.occurrences)}`}>
                                  {l.taille} · {fmt(l.theorique)}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {doc.totalCoupesSansMatelas > 0 && (
            <div className="rounded-md border border-dashed border-amber-300 bg-amber-50/50 px-3 py-2 text-sm">
              <span className="font-medium">
                <TriangleAlert className="mr-1.5 inline size-3.5 text-amber-700" />
                {fmt(doc.totalCoupesSansMatelas)} pièce(s) coupées sans matelas rattaché
              </span>
              {doc.tailles.some((t) => t.coupesSansMatelas > 0) && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {doc.tailles
                    .filter((t) => t.coupesSansMatelas > 0)
                    .map((t) => (
                      <Badge key={t.taille} variant="outline">
                        {t.taille} × {fmt(t.coupesSansMatelas)}
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