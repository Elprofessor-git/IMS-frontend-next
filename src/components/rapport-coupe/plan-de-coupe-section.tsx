'use client'

import { useState } from 'react'
import {
  Boxes,
  Layers2,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useGetMatelas } from '@/hooks/use-fournitures'
import { useGetCommande } from '@/hooks/use-commandes'
import {
  useGetPlanDeCoupe,
  useCreerLignePlan,
  useModifierLignePlan,
  useSupprimerLignePlan,
} from '@/hooks/use-plan-de-coupe'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function fmt(v: number) {
  return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

function fmtDim(v: number | null | undefined) {
  return v == null ? '—' : fmt(v)
}

export function PlanDeCoupeSection({ commandeId }: { commandeId: number }) {
  const { data: matelas, isLoading: matelasLoading } = useGetMatelas(commandeId)
  const { data: commande, isLoading: commandeLoading } = useGetCommande(commandeId)

  if (matelasLoading || commandeLoading) return <Skeleton className="h-72 w-full" />

  const taillesDeCommande = commande?.configTailles.map((c) => c.taille) ?? []

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Layers2 className="size-4" /> Plan de coupe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Le plan de coupe (marker) de chaque matelas : une ligne par gabarit/taille,
            quantité théorique = Occurrences × Plis. Le total théorique remplace le rôle de
            l&apos;estimation libre <span className="font-mono">CoupeEstimee</span>. Dès que des
            coupes réelles sont rattachées au matelas, son plan est figé.
          </p>

          {!matelas || matelas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun matelas rattaché à cette commande.
            </p>
          ) : (
            <div className="space-y-4">
              {[...(matelas ?? [])]
                .sort((a, b) => a.id - b.id)
                .map((m) => (
                  <MatelasPlanCard
                    key={m.id}
                    matelas={m}
                    commandeId={commandeId}
                    tailles={taillesDeCommande}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MatelasPlanCard({
  matelas: m,
  commandeId,
  tailles,
}: {
  matelas: { id: number; numeroMatelas: string; piecePliage: number; longueur: number | null; laize: number | null; estActif: boolean; nombreCoupes: number }
  commandeId: number
  tailles: string[]
}) {
  const { data: lignes, isLoading } = useGetPlanDeCoupe(m.id)
  const creer = useCreerLignePlan(m.id, commandeId)
  const modifier = useModifierLignePlan(m.id, commandeId)
  const supprimer = useSupprimerLignePlan(m.id, commandeId)

  const [taille, setTaille] = useState('')
  const [occ, setOcc] = useState('1')
  const [edition, setEdition] = useState<number | null>(null)
  const [occEdition, setOccEdition] = useState('1')

  const verrouille = m.nombreCoupes > 0
  const planifiees = new Set(lignes?.map((l) => l.taille) ?? [])
  const disponibles = tailles.filter((t) => !planifiees.has(t))
  const totalTheorique = (lignes ?? []).reduce((s, l) => s + l.theorique, 0)

  const ajouter = () => {
    if (!taille || !(Number(occ) >= 1)) return
    creer.mutate({ taille, occurrences: Number(occ) }, {
      onSuccess: () => {
        setTaille('')
        setOcc('1')
      },
    })
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Boxes className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium">{m.numeroMatelas}</span>
        <Badge variant="secondary" className="gap-1">
          <Layers2 className="size-3" /> {fmt(m.piecePliage)} plis
        </Badge>
        <Badge variant="outline" className="gap-1">
          Long. {fmtDim(m.longueur)} m · Laize {fmtDim(m.laize)} cm
        </Badge>
        <Badge variant="outline" className="gap-1">
          Total théorique <span className="font-mono">{fmt(totalTheorique)}</span>
        </Badge>
        {!m.estActif && <Badge variant="outline">inactif</Badge>}
        {verrouille && (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
            <Lock className="size-3" /> plan figé ({fmt(m.nombreCoupes)} pièce(s) coupée(s))
          </Badge>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : !lignes || lignes.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Aucune ligne de plan pour ce matelas.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Taille</th>
                <th className="px-3 py-2 text-right font-medium">Occurrences</th>
                <th className="px-3 py-2 text-right font-medium">Théorique (× plis)</th>
                <th className="px-3 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{l.taille}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {edition === l.id ? (
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={occEdition}
                        onChange={(e) => setOccEdition(e.target.value)}
                        className="h-8 w-24 text-right"
                        disabled={verrouille}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && Number(occEdition) >= 1) {
                            modifier.mutate({ id: l.id, occurrences: Number(occEdition) })
                            setEdition(null)
                          }
                          if (e.key === 'Escape') setEdition(null)
                        }}
                      />
                    ) : (
                      fmt(l.occurrences)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(l.theorique)}</td>
                  <td className="px-3 py-2 text-right">
                    {verrouille ? null : (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Modifier les occurrences"
                          onClick={() => {
                            setEdition(l.id)
                            setOccEdition(String(l.occurrences))
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <ConfirmDialog
                          title="Supprimer la ligne du plan ?"
                          description={`La taille ${l.taille} de ${m.numeroMatelas} sera retirée du plan.`}
                          onConfirm={() => supprimer.mutate(l.id)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!verrouille && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Taille</label>
            <Select value={taille} onValueChange={setTaille} disabled={disponibles.length === 0}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={disponibles.length === 0 ? 'Tout est planifié' : 'Taille…'} />
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
            <label className="text-xs text-muted-foreground">Occurrences</label>
            <Input
              type="number"
              min="1"
              step="1"
              value={occ}
              onChange={(e) => setOcc(e.target.value)}
              className="h-10 w-28"
            />
          </div>
          <Button onClick={ajouter} disabled={!taille || !(Number(occ) >= 1) || creer.isPending} className="h-10">
            <Plus className="size-4" /> Ajouter
          </Button>
        </div>
      )}
    </div>
  )
}