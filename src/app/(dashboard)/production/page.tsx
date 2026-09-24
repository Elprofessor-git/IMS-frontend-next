'use client'

import { useMemo, useState } from 'react'
import { ClipboardCheck, Layers, Plus, Scissors, Send } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PaginatedResponsiveTable } from '@/components/shared/paginated-table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useGetChainesProduction } from '@/hooks/use-production'
import type { ApiError } from '@/types/index'

const TYPES_ETAPE = ['Coupe', 'Production', 'ControleQualite', 'Expedition'] as const
const STATUTS = ['NonCommence', 'EnCours', 'Bloque', 'Termine', 'Annule'] as const

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

type OrdreFabricationEtape = {
  id: number
  ordreFabricationId: number
  numeroOF: string | null
  commandeId: number | null
  typeEtape: string
  statut: string
  chaineProductionId: number | null
  chaineProductionNom: string | null
  planningEntryId: number | null
  dateDebutPrevue: string | null
  dateFinPrevue: string | null
  dateDebutReelle: string | null
  dateFinReelle: string | null
  tempsTheoriqueHeures: number
  tempsReelHeures: number
  responsableAssigne: string | null
  notes: string | null
  dateCreation: string
}

type OrdreFabLite = { id: number; numeroOF: string }

type CreateEtapePayload = {
  ordreFabricationId: number
  typeEtape: string
  statut: string
  chaineProductionId: number | null
  responsableAssigne: string | null
  tempsTheoriqueHeures: number
  notes: string | null
}

const castEtape = (row: unknown) => row as OrdreFabricationEtape

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
    <Badge variant="outline" className={classe}>{statut}</Badge>
  )
}

export default function ProductionPage() {
  const [commandeId, setCommandeId] = useState('')
  const [typeEtape, setTypeEtape] = useState('')

  const params = new URLSearchParams()
  if (commandeId) params.set('commandeId', commandeId)
  if (typeEtape) params.set('typeEtape', typeEtape)

  const { data: etapes = [], isLoading } = useQuery<OrdreFabricationEtape[]>({
    queryKey: ['production-etapes', commandeId, typeEtape],
    queryFn: () => apiClient.get<OrdreFabricationEtape[]>(`/api/OrdreFabricationEtape?${params.toString()}`),
    retry: false,
  })

  const stats = useMemo(() => {
    let aPlanner = 0, enCours = 0, bloquees = 0, terminees = 0
    for (const e of etapes) {
      if (e.statut === 'EnCours') enCours++
      else if (e.statut === 'Bloque') bloquees++
      else if (e.statut === 'Termine') terminees++
      else aPlanner++
    }
    return { total: etapes.length, aPlanner, enCours, bloquees, terminees }
  }, [etapes])

  return (
    <PermissionGate module="production" mode="read" fallback={<ForbiddenState moduleLabel="production" />}>
      <div className="grid gap-6">
        <PageHeader
          title="Module Production"
          description="Gamme opératoire des ordres de fabrication (document 5.3) : étapes Coupe / Production / Contrôle qualité / Expédition suivies par statut, chaîne, dates et temps réel."
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <KpiCard label="Étapes OF" value={stats.total} />
          <KpiCard label="À planifier" value={stats.aPlanner} />
          <KpiCard label="En cours" value={stats.enCours} className="text-emerald-600" />
          <KpiCard label="Terminées" value={stats.terminees} className="text-sky-600" />
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid w-40 gap-1.5">
                <Label className="text-xs">Commande (id)</Label>
                <Input
                  type="number" min={1}
                  value={commandeId}
                  onChange={(e) => setCommandeId(e.target.value)}
                  placeholder="ex. 3"
                />
              </div>
              <div className="grid w-52 gap-1.5">
                <Label className="text-xs">Type d&apos;étape</Label>
                <Select value={typeEtape} onValueChange={(v) => setTypeEtape(v === '__all__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous</SelectItem>
                    {TYPES_ETAPE.map((t) => (
                      <SelectItem key={t} value={t}>{ETAPE_LABELS[t] ?? t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto">
                <PermissionGate module="production" mode="write" fallback={null}>
                  <NouvelleEtapeDialog />
                </PermissionGate>
              </div>
            </div>

            <div className="mt-4">
              <PaginatedResponsiveTable
                label="etapes"
                columns={[
                  {
                    key: 'numeroOF',
                    header: 'OF',
                    cardPrimary: true,
                    cell: (row: unknown) => {
                      const e = castEtape(row)
                      return <span className="font-medium">{e.numeroOF ?? `#${e.ordreFabricationId}`}</span>
                    },
                  },
                  {
                    key: 'commande',
                    header: 'Commande',
                    cell: (row: unknown) => (
                      <span className="text-muted-foreground">{castEtape(row).commandeId ?? '—'}</span>
                    ),
                  },
                  {
                    key: 'typeEtape',
                    header: 'Type',
                    cell: (row: unknown) => {
                      const e = castEtape(row)
                      const Icon = ETAPE_ICONES[e.typeEtape]
                      return (
                        <Badge variant="outline">
                          {Icon ? <><Icon className="size-3.5" /> {ETAPE_LABELS[e.typeEtape] ?? e.typeEtape}</> : (ETAPE_LABELS[e.typeEtape] ?? e.typeEtape)}
                        </Badge>
                      )
                    },
                  },
                  {
                    key: 'statut',
                    header: 'Statut',
                    cell: (row: unknown) => <StatutBadge statut={castEtape(row).statut} />,
                  },
                  {
                    key: 'chaine',
                    header: 'Chaîne',
                    cell: (row: unknown) => (
                      <span className="text-muted-foreground">{castEtape(row).chaineProductionNom ?? '—'}</span>
                    ),
                  },
                  {
                    key: 'debutReel',
                    header: 'Début réel',
                    cell: (row: unknown) => {
                      const e = castEtape(row)
                      return (
                        <span className="text-muted-foreground">
                          {e.dateDebutReelle ? new Date(e.dateDebutReelle).toLocaleDateString('fr-FR') : '—'}
                        </span>
                      )
                    },
                  },
                  {
                    key: 'tempsReel',
                    header: 'Temps réel (h)',
                    cell: (row: unknown) => <span className="tabular-nums">{castEtape(row).tempsReelHeures}</span>,
                  },
                  {
                    key: 'responsable',
                    header: 'Responsable',
                    hideOnMobile: true,
                    cell: (row: unknown) => (
                      <span className="text-muted-foreground">{castEtape(row).responsableAssigne ?? '—'}</span>
                    ),
                  },
                ]}
                data={etapes}
                keyExtractor={(e: OrdreFabricationEtape) => e.id}
                emptyText="Aucune étape. Saisissez une commande ou créez une étape d'OF."
                isLoading={isLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

// ══ Dialog création d'étape de gamme opératoire (5.3) ══
function NouvelleEtapeDialog() {
  const qc = useQueryClient()
  const { data: chaines = [] } = useGetChainesProduction(false)
  const [commandeId, setCommandeId] = useState('')
  const [ofId, setOfId] = useState('')
  const [typeEtape, setTypeEtape] = useState('Production')
  const [statut, setStatut] = useState('NonCommence')
  const [chaineId, setChaineId] = useState('')
  const [responsable, setResponsable] = useState('')
  const [tempsTheorique, setTempsTheorique] = useState('')
  const [notes, setNotes] = useState('')

  const commande = Number(commandeId) || 0
  const { data: ordres = [] } = useQuery<OrdreFabLite[]>({
    queryKey: ['of', 'commande', commande],
    queryFn: () => apiClient.get<OrdreFabLite[]>(`/api/OrdreFabrication/CommandeClient/${commande}`),
    enabled: commande > 0,
    retry: false,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateEtapePayload) =>
      apiClient.post<{ message: string; id: number }>('/api/OrdreFabricationEtape', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['production-etapes'] })
      toast.success(res.message ?? 'Étape créée')
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? "Erreur lors de la création de l'étape"),
  })

  const reset = () => {
    setCommandeId('')
    setOfId('')
    setTypeEtape('Production')
    setStatut('NonCommence')
    setChaineId('')
    setResponsable('')
    setTempsTheorique('')
    setNotes('')
  }

  const submit = () => {
    const ordreFabricationId = Number(ofId)
    if (!ordreFabricationId) {
      toast.error("Choisissez d'abord une commande valide puis un ordre de fabrication.")
      return
    }
    mutate({
      ordreFabricationId,
      typeEtape,
      statut,
      chaineProductionId: chaineId ? Number(chaineId) : null,
      responsableAssigne: responsable.trim() || null,
      tempsTheoriqueHeures: Number(tempsTheorique) || 0,
      notes: notes.trim() || null,
    })
  }

  return (
    <Dialog onOpenChange={(v) => { if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-3.5" /> Nouvelle étape</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle étape d&apos;OF</DialogTitle>
          <DialogDescription>
            Gamme opératoire 5.3 : jalon (Coupe, Production, Contrôle qualité, Expédition) rattaché à un ordre de fabrication.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Commande (id)</Label>
              <Input type="number" min={1} value={commandeId} onChange={(e) => setCommandeId(e.target.value)} placeholder="ex. 3" />
            </div>
            <div className="grid gap-1.5">
              <Label>Ordre de fabrication</Label>
              <Select value={ofId} onValueChange={setOfId}>
                <SelectTrigger>
                  <SelectValue placeholder={commande > 0 ? (ordres.length > 0 ? 'Choisir un OF…' : 'Aucun OF pour cette commande') : "Choisissez d'abord une commande"} />
                </SelectTrigger>
                <SelectContent>
                  {ordres.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.numeroOF}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type d&apos;étape</Label>
              <Select value={typeEtape} onValueChange={setTypeEtape}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES_ETAPE.map((t) => (
                    <SelectItem key={t} value={t}>{ETAPE_LABELS[t] ?? t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Statut</Label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Chaîne</Label>
              <Select value={chaineId} onValueChange={setChaineId}>
                <SelectTrigger><SelectValue placeholder="Sans chaîne…" /></SelectTrigger>
                <SelectContent>
                  {chaines.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Temps théorique (h)</Label>
              <Input type="number" min={0} value={tempsTheorique} onChange={(e) => setTempsTheorique(e.target.value)} placeholder="0" />
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
          <Button onClick={submit} disabled={isPending}>
            {isPending ? 'Création…' : "Créer l'étape"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}