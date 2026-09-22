'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, Plus, Pencil, Trash2, Scissors, Layers, ClipboardList } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PaginatedResponsiveTable } from '@/components/shared/paginated-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { PermissionGate } from '@/components/auth/permission-gate'
import { useGetCommandes } from '@/hooks/use-commandes'
import { useModifierMatelas, useSupprimerMatelas, useCreerMatelas } from '@/hooks/use-fournitures'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import type { MatelasGlobal, MatelasStats, MettreAJourMatelasPayload } from '@/types/matelas'

const KEY = ['matelas'] as const

type MatelasEnEdition = {
  id: number
  numeroMatelas: string
  dateMatelas: string
  piecePliage: number
  coupeEstimee: number
  notes: string
  estActif: boolean
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  )
}

// ───────────────────────────── Dialog création matelas ─────────────────────────────

function CreerMatelasDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: commandes = [] } = useGetCommandes()
  const [commandeId, setCommandeId] = useState('')
  const [numero, setNumero] = useState('')
  const [date, setDate] = useState('')
  const [pliage, setPliage] = useState('')
  const [estimee, setEstimee] = useState('')
  const [notes, setNotes] = useState('')

  const commandeSel = Number(commandeId) || 0
  const creer = useCreerMatelas(commandeSel)

  const reset = () => {
    setCommandeId('')
    setNumero('')
    setDate('')
    setPliage('')
    setEstimee('')
    setNotes('')
  }

  const submit = () => {
    if (!commandeSel || !numero.trim()) {
      toast.error('Commande et numéro de matelas requis.')
      return
    }
    creer.mutate(
      {
        numeroMatelas: numero.trim(),
        dateMatelas: date ? new Date(date + 'T12:00:00').toISOString() : null,
        piecePliage: Number(pliage) || 0,
        coupeEstimee: Number(estimee) || 0,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau matelas</DialogTitle>
          <DialogDescription>Créer un matelas dans le module Coupe (rattaché à une commande).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Commande</Label>
            <Select value={commandeId} onValueChange={setCommandeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner une commande…" />
              </SelectTrigger>
              <SelectContent>
                {(commandes ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.numeroCommande}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>N° matelas</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="ex. M-2026-001" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Plis</Label>
              <Input type="number" min="0" value={pliage} onChange={(e) => setPliage(e.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-1.5">
              <Label>Coupe est.</Label>
              <Input type="number" min="0" value={estimee} onChange={(e) => setEstimee(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button disabled={creer.isPending || !commandeSel || !numero.trim()} onClick={submit}>
            {creer.isPending ? 'Création…' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────── Dialog édition matelas ─────────────────────────────

function EditerMatelasDialog({
  matelas,
  onOpenChange,
}: {
  matelas: MatelasEnEdition | null
  onOpenChange: (v: boolean) => void
}) {
  const modifier = useModifierMatelas()
  const [numero, setNumero] = useState(matelas?.numeroMatelas ?? '')
  const [date, setDate] = useState(matelas?.dateMatelas ? matelas.dateMatelas.slice(0, 10) : '')
  const [pliage, setPliage] = useState(String(matelas?.piecePliage ?? 0))
  const [estimee, setEstimee] = useState(String(matelas?.coupeEstimee ?? 0))
  const [notes, setNotes] = useState(matelas?.notes ?? '')
  const [estActif, setEstActif] = useState(matelas?.estActif ?? true)

  return (
    <Dialog
      open={matelas !== null}
      onOpenChange={(v) => {
        if (!v) onOpenChange(false)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le matelas</DialogTitle>
          <DialogDescription>Le numéro doit rester unique. Un matelas qui a des coupes est verrouillé (409).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>N° matelas</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="ex. M-2026-001" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Plis</Label>
              <Input type="number" min="0" value={pliage} onChange={(e) => setPliage(e.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-1.5">
              <Label>Coupe est.</Label>
              <Input type="number" min="0" value={estimee} onChange={(e) => setEstimee(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={estActif} onCheckedChange={(v) => setEstActif(v === true)} />
            Matelas actif
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            disabled={modifier.isPending || !numero.trim()}
            onClick={() => {
              if (!matelas) return
              const payload: MettreAJourMatelasPayload = {
                numeroMatelas: numero.trim(),
                dateMatelas: date ? new Date(date + 'T12:00:00').toISOString() : null,
                piecePliage: Number(pliage) || 0,
                coupeEstimee: Number(estimee) || 0,
                notes: notes.trim() || null,
                estActif,
              }
              modifier.mutate({ id: matelas.id, ...payload }, {
                onSuccess: () => onOpenChange(false),
              })
            }}
          >
            {modifier.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────── Onglet Matelas ─────────────────────────────

function OngletMatelas({ matelas, isLoading }: { matelas: MatelasGlobal[]; isLoading: boolean }) {
  const supprimer = useSupprimerMatelas()
  const [recherche, setRecherche] = useState('')
  const [dialogCreation, setDialogCreation] = useState(false)
  const [matelasEdite, setMatelasEdite] = useState<MatelasEnEdition | null>(null)

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    if (!q) return matelas
    return matelas.filter(
      (m) =>
        m.numeroMatelas.toLowerCase().includes(q) ||
        m.numeroCommande.toLowerCase().includes(q),
    )
  }, [matelas, recherche])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Rechercher un matelas ou une commande…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">{filtres.length} matelas</span>
        <div className="ml-auto">
          <PermissionGate module="coupe" mode="write" fallback={null}>
            <Button size="sm" onClick={() => setDialogCreation(true)}>
              <Plus className="size-3.5" /> Nouveau matelas
            </Button>
          </PermissionGate>
        </div>
      </div>

      <PaginatedResponsiveTable
        label="matelas"
        data={filtres}
        isLoading={isLoading}
        emptyText="Aucun matelas pour l'instant."
        columns={[
          {
            key: 'NumeroMatelas',
            header: 'Matelas',
            cardPrimary: true,
            cell: (m: MatelasGlobal) => <span className="font-medium">{m.numeroMatelas}</span>,
          },
          {
            key: 'NumeroCommande',
            header: 'Commande',
            cell: (m: MatelasGlobal) => <span className="text-muted-foreground">{m.numeroCommande || '—'}</span>,
          },
          {
            key: 'DateMatelas',
            header: 'Date',
            cell: (m: MatelasGlobal) => (
              <span className="text-muted-foreground">{new Date(m.dateMatelas).toLocaleDateString('fr-FR')}</span>
            ),
          },
          {
            key: 'PiecePliage',
            header: 'Pliage',
            cell: (m: MatelasGlobal) => <span className="text-muted-foreground">{m.piecePliage}</span>,
          },
          {
            key: 'CoupeEstimee',
            header: 'Coupe est.',
            cell: (m: MatelasGlobal) => <span className="text-muted-foreground">{m.coupeEstimee}</span>,
          },
          {
            key: 'NombreCoupes',
            header: 'Coupes',
            cell: (m: MatelasGlobal) => <Badge variant="outline">{m.nombreCoupes}</Badge>,
          },
          {
            key: 'OrdreDeCoupe',
            header: 'Ordre',
            cell: (m: MatelasGlobal) => <span className="text-muted-foreground">#{m.ordreDeCoupe}</span>,
          },
          {
            key: 'actions',
            header: '',
            headerClassName: 'w-[160px]',
            cell: (m: MatelasGlobal) => (
              <div className="flex items-center justify-end">
                {m.commandeId !== null && m.commandeId !== undefined && (
                  <Button variant="ghost" size="icon-sm" asChild title="Gérer la coupe de cette commande">
                    <Link href={`/coupe/${m.commandeId}`}>
                      <Eye className="size-3.5" />
                    </Link>
                  </Button>
                )}
                <PermissionGate module="coupe" mode="write" fallback={null}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Modifier le matelas"
                    onClick={() =>
                      setMatelasEdite({
                        id: m.id,
                        numeroMatelas: m.numeroMatelas,
                        dateMatelas: m.dateMatelas,
                        piecePliage: m.piecePliage,
                        coupeEstimee: m.coupeEstimee,
                        notes: m.notes ?? '',
                        estActif: m.estActif,
                      })
                    }
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" title="Supprimer le matelas">
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                    onConfirm={() => supprimer.mutate(m.id)}
                  />
                </PermissionGate>
              </div>
            ),
          },
        ]}
        keyExtractor={(m: MatelasGlobal) => m.id}
      />

      <CreerMatelasDialog open={dialogCreation} onOpenChange={setDialogCreation} />
      <EditerMatelasDialog key={matelasEdite?.id ?? 'aucun'} matelas={matelasEdite} onOpenChange={() => setMatelasEdite(null)} />
    </div>
  )
}

// ───────────────────────────── Onglet Pièces coupées ─────────────────────────────

function OngletPieces({ matelas, stats }: { matelas: MatelasGlobal[]; stats?: MatelasStats }) {
  const parCommande = useMemo(() => {
    const map = new Map<string, { commande: string; matelas: number; commandees: number; coupees: number }>()
    for (const m of matelas) {
      const key = m.numeroCommande || 'Sans commande'
      const cur = map.get(key) ?? { commande: key, matelas: 0, commandees: 0, coupees: 0 }
      cur.matelas += 1
      cur.commandees += m.totalPiecesCommandees
      cur.coupees += m.nombreCoupes
      map.set(key, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.coupees - a.coupees)
  }, [matelas])

  const totals = useMemo(
    () =>
      parCommande.reduce(
        (acc, p) => ({ matelas: acc.matelas + p.matelas, commandees: acc.commandees + p.commandees, coupees: acc.coupees + p.coupees }),
        { matelas: 0, commandees: 0, coupees: 0 },
      ),
    [parCommande],
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Pièces commandées" value={stats?.totalPiecesCommandees ?? totals.commandees} />
        <Kpi label="Pièces coupées" value={stats?.totalPiecesCoupees ?? totals.coupees} />
        <Kpi label="Pièces exportées" value={stats?.totalPiecesExportees ?? 0} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 text-sm font-medium">Répartition par commande</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Commande</th>
                  <th className="py-2 pr-3 text-right">Matelas</th>
                  <th className="py-2 pr-3 text-right">Pièces commandées</th>
                  <th className="py-2 pr-3 text-right">Pièces coupées</th>
                  <th className="py-2 text-right">Avancement</th>
                </tr>
              </thead>
              <tbody>
                {parCommande.map((p) => {
                  const pct = p.commandees > 0 ? Math.min(100, Math.round((p.coupees / p.commandees) * 100)) : 0
                  return (
                    <tr key={p.commande} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{p.commande}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{p.matelas}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{p.commandees}</td>
                      <td className="py-2 pr-3 text-right font-mono">{p.coupees}</td>
                      <td className="py-2 text-right tabular-nums">{pct}%</td>
                    </tr>
                  )
                })}
                {parCommande.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      Aucune pièce coupée pour l&apos;instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ───────────────────────────── Onglet Ordre de coupe ─────────────────────────────

function OngletOrdre({ matelas }: { matelas: MatelasGlobal[] }) {
  const ordre = useMemo(() => [...matelas].sort((a, b) => a.ordreDeCoupe - b.ordreDeCoupe), [matelas])

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ordre de coupe calculé (vue, aucune table de planning) : séquence des matelas par (DateMatelas, NumeroMatelas)
        croissant. Le matelas n°1 est le premier à découper.
      </p>
      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Matelas</th>
                  <th className="py-2 pr-3">Commande</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3 text-right">Pliage</th>
                  <th className="py-2 pr-3 text-right">Pièces commandées</th>
                  <th className="py-2 pr-3 text-right">Coupées</th>
                  <th className="py-2 text-right">Progression</th>
                </tr>
              </thead>
              <tbody>
                {ordre.map((m) => {
                  const pct = m.totalPiecesCommandees > 0 ? Math.min(100, Math.round((m.nombreCoupes / m.totalPiecesCommandees) * 100)) : 0
                  return (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-muted-foreground">{m.ordreDeCoupe}</td>
                      <td className="py-2 pr-3 font-medium">{m.numeroMatelas}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{m.numeroCommande || '—'}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{new Date(m.dateMatelas).toLocaleDateString('fr-FR')}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{m.piecePliage}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{m.totalPiecesCommandees}</td>
                      <td className="py-2 pr-3 text-right font-mono">{m.nombreCoupes}</td>
                      <td className="py-2 text-right tabular-nums">{pct}%</td>
                    </tr>
                  )
                })}
                {ordre.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted-foreground">
Aucun matelas pour l&apos;instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ───────────────────────────── Page ─────────────────────────────

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

  const accesRefuse =
    (error as unknown as { status?: number } | null | undefined)?.status === 403

  return (
    <div>
      <PageHeader
        title="Module Coupe"
        description="Suivi transversal des matelas, pièces coupées et ordre de coupe calculé à travers toutes les commandes."
      />

      <PermissionGate module="coupe" mode="read" fallback={<ForbiddenState moduleLabel="coupe" />}>
        {accesRefuse || isError ? (
          <ForbiddenState moduleLabel="coupe" />
        ) : (
          <Tabs defaultValue="matelas">
            <TabsList>
              <TabsTrigger value="matelas">
                <Scissors className="size-4" /> Matelas
              </TabsTrigger>
              <TabsTrigger value="pieces">
                <Layers className="size-4" /> Pièces coupées
              </TabsTrigger>
              <TabsTrigger value="ordre">
                <ClipboardList className="size-4" /> Ordre de coupe
              </TabsTrigger>
            </TabsList>
            <TabsContent value="matelas" className="mt-4">
              <OngletMatelas matelas={matelas} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="pieces" className="mt-4">
              <OngletPieces matelas={matelas} stats={stats} />
            </TabsContent>
            <TabsContent value="ordre" className="mt-4">
              <OngletOrdre matelas={matelas} />
            </TabsContent>
          </Tabs>
        )}
      </PermissionGate>
    </div>
  )
}