'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { useGetOrdreDeCoupe, useCreerLignePlan, useModifierLignePlan, useSupprimerLignePlan } from '@/hooks/use-plan-de-coupe'
import { useGetCommande } from '@/hooks/use-commandes'
import { useGetMatelas, useSupprimerMatelas } from '@/hooks/use-fournitures'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PermissionGate } from '@/components/auth/permission-gate'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CreerMatelasDialog, EditerMatelasDialog } from '@/components/coupe/matelas-dialogs'
import type { OrdreCoupeMatelas } from '@/types/matelas'
import type { Matelas } from '@/types/fourniture'

function fmt(v: number) {
  return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
}

function fmtDim(v: number | null | undefined) {
  return v == null ? '—' : fmt(v)
}

/**
 * Onglet unique « Ordre de coupe » de /coupe/{commandeId} : fusion de l'ancien
 * « Plan de coupe » (lignes Occurrences × Plis, verrou après première coupe) et de
 * l'ancien « Ordre de coupe » (couverture par taille, seuil = demande × marge).
 *
 * Lecture + planification : c'est ici qu'on crée/modifie/supprime un matelas et son
 * plan. Cliquer une ligne de matelas ouvre l'écran « Saisie de coupe » de CE matelas
 * (le sélecteur de matelas y est inutile : il est déjà déterminé par la navigation).
 */
export function OrdreDeCoupeSection({ commandeId }: { commandeId: number }) {
  const { data: doc, isLoading } = useGetOrdreDeCoupe(commandeId)
  const { data: commande, isLoading: commandeLoading } = useGetCommande(commandeId)
  const { data: matelas, isLoading: matelasLoading } = useGetMatelas(commandeId)
  const supprimerMatelas = useSupprimerMatelas(commandeId)
  const [dialogCreation, setDialogCreation] = useState(false)
  const [matelasEdite, setMatelasEdite] = useState<Matelas | null>(null)
  const [ouvert, setOuvert] = useState<number | null>(null)

  if (isLoading || commandeLoading || matelasLoading) return <Skeleton className="h-72 w-full" />
  if (!doc) return null

  const taillesDeCommande = commande?.configTailles.map((c) => c.taille) ?? []
  const parId = new Map((matelas ?? []).map((m) => [m.id, m]))

  return (
    <div className="grid gap-4">
      {/* ─── Couverture par taille : Σ plans vs demande (avec marge) ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
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
                  <TableHead className="text-right">Reste à couper</TableHead>
                  <TableHead>Couverture</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doc.tailles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                      Aucune taille configurée pour cette commande.
                    </TableCell>
                  </TableRow>
                ) : (
                  doc.tailles.map((t) => (
                    <TableRow key={t.taille}>
                      <TableCell className="font-medium">{t.taille}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(t.quantiteCommande)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{fmt(t.seuil)}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{fmt(t.planTheorique)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(t.coupeReelle)}</TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {fmt(Math.max(0, t.planTheorique - t.coupeReelle))}
                      </TableCell>
                      <TableCell>
                        {t.planTheorique === 0 ? (
                          <Badge variant="outline">plan vide</Badge>
                        ) : t.depassePlan ? (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                            <TriangleAlert className="size-3" /> plan &gt; seuil
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-300 bg-green-50 text-green-800">
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

      {/* ─── Matelas planifiés : chaque ligne ouvre la saisie de coupe ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <Layers2 className="size-4" />
            Matelas planifiés
            <span className="text-xs font-normal text-muted-foreground">
              {doc.matelas.length} matelas · cliquez un matelas pour saisir ce qui a été coupé
            </span>
            <PermissionGate module="coupe" mode="write" fallback={null}>
              <Button size="sm" className="ml-auto" onClick={() => setDialogCreation(true)}>
                <Plus className="size-3.5" /> Nouveau matelas
              </Button>
            </PermissionGate>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {doc.matelas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun matelas rattaché à cette commande. Créez le premier matelas, puis saisissez son
              plan (une ligne par taille, quantité = Occurrences × Plis).
            </p>
          ) : (
            <div className="space-y-3">
              {doc.matelas.map((m) => {
                const detail = parId.get(m.matelasId)
                const deverrouille = ouvert === m.matelasId
                return (
                  <div key={m.matelasId} className="rounded-lg border">
                    <div className="flex items-stretch">
                      <Link
                        href={`/coupe/${commandeId}/matelas/${m.matelasId}`}
                        aria-label={`Saisie de coupe du matelas ${m.numeroMatelas}`}
                        className="flex flex-1 items-center gap-3 rounded-l-lg p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">#{m.ordreDeCoupe}</span>
                            <span className="font-medium">{m.numeroMatelas}</span>
                            <Badge variant="secondary" className="gap-1">
                              <Layers2 className="size-3" /> {fmt(m.piecePliage)} plis
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <Boxes className="size-3" /> Long. {fmtDim(m.longueur)} m · Laize{' '}
                              {fmtDim(m.laize)} cm
                            </Badge>
                            {detail && !detail.estActif && <Badge variant="outline">inactif</Badge>}
                            {m.totalCoupeReelle > 0 && (
                              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                                <Lock className="size-3" /> plan figé ({fmt(m.totalCoupeReelle)} pièce(s) coupée(s))
                              </Badge>
                            )}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>{fmtDate(m.dateMatelas)}</span>
                            <span>
                              Plan total{' '}
                              <span className="font-mono text-foreground">{fmt(m.totalTheorique)}</span>
                              {m.longueur != null && (
                                <> · tissu ≈ <span className="font-mono text-foreground">{fmt(m.longueur * m.piecePliage)}</span> m</>
                              )}
                            </span>
                            <span>
                              Coupé <span className="font-mono text-foreground">{fmt(m.totalCoupeReelle)}</span> · reste à
                              couper{' '}
                              <span
                                className={
                                  m.resteTotal < 0
                                    ? 'font-mono font-semibold text-red-600'
                                    : 'font-mono font-semibold text-foreground'
                                }
                              >
                                {fmt(m.resteTotal)}
                              </span>
                            </span>
                          </span>
                          {/* Répartition + reste à couper par taille, visibles sans ouvrir le détail */}
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {m.lignes.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Aucune ligne de plan</span>
                            ) : (
                              m.lignes.map((l) => (
                                <Badge
                                  key={l.ligneId}
                                  variant="secondary"
                                  className="gap-1"
                                  title={`Occurrences ${fmt(l.occurrences)} × ${fmt(m.piecePliage)} plis = ${fmt(l.theorique)}`}
                                >
                                  {l.taille} · {fmt(l.theorique)}
                                  {l.coupeReelle > 0 && (
                                    <span className="text-muted-foreground">− {fmt(l.coupeReelle)}</span>
                                  )}
                                  <span
                                    className={
                                      l.resteACouper < 0
                                        ? 'font-semibold text-red-600'
                                        : 'font-semibold text-foreground'
                                    }
                                  >
                                    = {fmt(l.resteACouper)}
                                  </span>
                                </Badge>
                              ))
                            )}
                          </span>
                        </span>
                      </Link>
                      <div className="flex items-center gap-1 border-l pr-2 pl-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Modifier le plan de ce matelas"
                          aria-expanded={deverrouille}
                          onClick={() => setOuvert(deverrouille ? null : m.matelasId)}
                        >
                          <ChevronDown
                            className={`size-3.5 transition-transform ${deverrouille ? '' : '-rotate-90'}`}
                          />
                        </Button>
                        <PermissionGate module="coupe" mode="write" fallback={null}>
                          {detail && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Modifier le matelas"
                              onClick={() => setMatelasEdite(detail)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          <ConfirmDialog
                            title="Supprimer le matelas ?"
                            description={`${m.numeroMatelas} sera retiré de l'ordre de coupe. Impossible s'il porte déjà des coupes.`}
                            onConfirm={() => supprimerMatelas.mutate(m.matelasId)}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                title="Supprimer le matelas"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            }
                          />
                        </PermissionGate>
                      </div>
                    </div>
                    {deverrouille && (
                      <PlanLignes
                        commandeId={commandeId}
                        matelas={m}
                        tailles={taillesDeCommande}
                        verrouille={m.totalCoupeReelle > 0}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

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

      <CreerMatelasDialog commandeId={commandeId} open={dialogCreation} onOpenChange={setDialogCreation} />
      <EditerMatelasDialog
        key={matelasEdite?.id ?? 'aucun'}
        matelas={matelasEdite}
        onOpenChange={() => setMatelasEdite(null)}
      />
    </div>
  )
}

/** Lignes du plan d'un matelas (Occurrences × Plis), figées dès la première coupe. */
function PlanLignes({
  commandeId,
  matelas,
  tailles,
  verrouille,
}: {
  commandeId: number
  matelas: OrdreCoupeMatelas
  tailles: string[]
  verrouille: boolean
}) {
  const creer = useCreerLignePlan(matelas.matelasId, commandeId)
  const modifier = useModifierLignePlan(matelas.matelasId, commandeId)
  const supprimer = useSupprimerLignePlan(matelas.matelasId, commandeId)

  const [taille, setTaille] = useState('')
  const [occ, setOcc] = useState('1')
  const [edition, setEdition] = useState<number | null>(null)
  const [occEdition, setOccEdition] = useState('1')

  const planifiees = new Set(matelas.lignes.map((l) => l.taille))
  const disponibles = tailles.filter((t) => !planifiees.has(t))

  const ajouter = () => {
    if (!taille || !(Number(occ) >= 1)) return
    creer.mutate(
      { taille, occurrences: Number(occ) },
      { onSuccess: () => { setTaille(''); setOcc('1') } },
    )
  }

  return (
    <div className="border-t bg-muted/20 p-3">
      {verrouille && (
        <p className="mb-2 text-xs text-muted-foreground">
          <Lock className="mr-1 inline size-3.5 text-amber-700" />
          Plan figé : ce matelas porte déjà des coupes enregistrées. Le plan se saisit désormais
          depuis l&apos;écran « Saisie de coupe » de ce matelas.
        </p>
      )}
      {matelas.lignes.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Aucune ligne de plan pour ce matelas.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Taille</TableHead>
                <TableHead className="text-right">Occurrences</TableHead>
                <TableHead className="text-right">Théorique (× plis)</TableHead>
                <TableHead className="text-right">Déjà coupé</TableHead>
                <TableHead className="text-right">Reste à couper</TableHead>
                <TableHead className="w-[88px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {matelas.lignes.map((l) => (
                <TableRow key={l.ligneId}>
                  <TableCell className="font-medium">{l.taille}</TableCell>
                  <TableCell className="text-right font-mono">
                    {edition === l.ligneId ? (
                      <Input
                        aria-label={`Occurrences pour la taille ${l.taille}`}
                        type="number"
                        min="1"
                        step="1"
                        value={occEdition}
                        onChange={(e) => setOccEdition(e.target.value)}
                        className="h-8 w-24 text-right"
                        disabled={verrouille}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && Number(occEdition) >= 1) {
                            modifier.mutate({ id: l.ligneId, occurrences: Number(occEdition) })
                            setEdition(null)
                          }
                          if (e.key === 'Escape') setEdition(null)
                        }}
                      />
                    ) : (
                      fmt(l.occurrences)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">{fmt(l.theorique)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(l.coupeReelle)}</TableCell>
                  <TableCell
                    className={`text-right font-mono font-semibold ${l.resteACouper < 0 ? 'text-red-600' : ''}`}
                  >
                    {fmt(l.resteACouper)}
                  </TableCell>
                  <TableCell className="text-right">
                    {verrouille ? null : (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Modifier les occurrences"
                          onClick={() => {
                            setEdition(l.ligneId)
                            setOccEdition(String(l.occurrences))
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <ConfirmDialog
                          title="Supprimer la ligne du plan ?"
                          description={`La taille ${l.taille} de ${matelas.numeroMatelas} sera retirée du plan.`}
                          onConfirm={() => supprimer.mutate(l.ligneId)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              title="Supprimer la ligne"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!verrouille && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground" htmlFor={`taille-plan-${matelas.matelasId}`}>
              Taille
            </label>
            <Select value={taille} onValueChange={setTaille} disabled={disponibles.length === 0}>
              <SelectTrigger id={`taille-plan-${matelas.matelasId}`} className="w-44">
                <SelectValue
                  placeholder={disponibles.length === 0 ? 'Tout est planifié' : 'Taille…'}
                />
              </SelectTrigger>
              <SelectContent>
                {disponibles.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground" htmlFor={`occ-plan-${matelas.matelasId}`}>
              Occurrences
            </label>
            <Input
              id={`occ-plan-${matelas.matelasId}`}
              type="number"
              min="1"
              step="1"
              value={occ}
              onChange={(e) => setOcc(e.target.value)}
              className="h-10 w-28"
            />
          </div>
          <Button onClick={ajouter} disabled={!taille || !(Number(occ) >= 1) || creer.isPending} className="h-10">
            <Plus className="size-4" /> Ajouter au plan
          </Button>
        </div>
      )}
    </div>
  )
}
