'use client'

import { useMemo, useState } from 'react'
import { ClipboardCheck, Send } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PaginatedResponsiveTable } from '@/components/shared/paginated-table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import {
  useGetControlesQualite,
  useGetReferenceQualite,
  useCreateControleQualite,
  useCreateEnvoiRetouche,
} from '@/hooks/use-qualite'
import { useGetChainesProduction } from '@/hooks/use-fournitures'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { ControleQualite } from '@/types/controle-qualite'

const TAILLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

const castControle = (row: unknown) => row as ControleQualite

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

export default function QualitePage() {
  const [commandeId, setCommandeId] = useState('')
  const [typeControle, setTypeControle] = useState<'Interne' | 'RetourSousTraitant'>('Interne')

  const commande = Number(commandeId) || 0
  const { data: controles = [], isLoading } = useGetControlesQualite(commande > 0 ? commande : undefined)
  const { data: chaines = [] } = useGetChainesProduction()
  const { data: reference } = useGetReferenceQualite({
    commandeId: commande,
    taille: 'M',
    typeControle: 'Interne',
    enabled: commande > 0,
  })

  const stats = useMemo(() => {
    let acceptees = 0, retouche = 0, rebut = 0
    for (const c of controles) {
      acceptees += c.quantiteAcceptee
      retouche += c.quantiteRetouche
      rebut += c.quantiteRebut
    }
    return { acceptees, retouche, rebut, nbEnvois: reference?.referenceDisponible ?? 0 }
  }, [controles, reference])

  return (
    <PermissionGate module="qualite" mode="read" fallback={<ForbiddenState moduleLabel="qualite" />}>
      <div className="grid gap-6">
        <PageHeader
          title="Contrôle qualité"
          description="LOT8 — cycle qualité : référence (plafond), contrôle Interne / RetourSousTraitant, envois en retouche (plafond strict)."
        />

        <div className="grid gap-3 sm:grid-cols-4">
          <KpiCard label="Contrôles" value={controles.length} />
          <KpiCard label="Acceptées" value={stats.acceptees} className="text-emerald-600" />
          <KpiCard label="En retouche" value={stats.retouche} className="text-amber-600" />
          <KpiCard label="Rebut" value={stats.rebut} className="text-rose-600" />
        </div>

        <Card>
          <CardContent className="p-4">
            <Tabs value={typeControle} onValueChange={(v) => setTypeControle(v as 'Interne' | 'RetourSousTraitant')}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="grid w-40 gap-1.5">
                  <Label className="text-xs">Commande (id)</Label>
                  <Input
                    type="number" min={1}
                    value={commandeId}
                    onChange={(e) => {
                      const v = e.target.value
                      setCommandeId(v)
                      if (Number(v) <= 0) toast.info('Saisissez un id de commande valide')
                    }}
                    placeholder="ex. 3"
                  />
                </div>
                <div className="flex gap-2">
                  <TabsList>
                    <TabsTrigger value="Interne">Interne</TabsTrigger>
                    <TabsTrigger value="RetourSousTraitant">Retour sous-traitant</TabsTrigger>
                  </TabsList>
                </div>
                <div className="ml-auto">
                  <NouveauControleDialog commandeId={commande} chaines={chaines} />
                </div>
              </div>
            </Tabs>

            {commande > 0 && reference && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/40">
                <span className="font-medium text-emerald-700">Référence disponible : </span>
                <span className="font-semibold tabular-nums text-emerald-800">
                  {reference.referenceDisponible} pièces
                </span>
                <span className="text-muted-foreground"> — plafond strict appliqué lors de l&apos;envoi en retouche.</span>
              </div>
            )}

            <div className="mt-4">
              <PaginatedResponsiveTable
                label="controles"
                columns={[
                  { key: 'id', header: '#', cell: (row: unknown) => String(castControle(row).id) },
                  { key: 'taille', header: 'Taille', cell: (row: unknown) => <span>{castControle(row).taille}</span> },
                  { key: 'chaineNom', header: 'Chaîne', cell: (row: unknown) => castControle(row).chaineNom ?? '—' },
                  { key: 'typeControle', header: 'Type', cell: (row: unknown) => (
                    <Badge variant={castControle(row).typeControle === 'Interne' ? 'default' : 'secondary'}>
                      {castControle(row).typeControle === 'Interne' ? 'Interne' : 'Retour ST'}
                    </Badge>
                  )},
                  { key: 'quantiteControlee', header: 'Contrôlée', cell: (row: unknown) => String(castControle(row).quantiteControlee) },
                  { key: 'quantiteAcceptee', header: 'Acceptée', cell: (row: unknown) => <span className="text-emerald-600">{castControle(row).quantiteAcceptee}</span> },
                  { key: 'quantiteRetouche', header: 'Retouche', cell: (row: unknown) => <span className="text-amber-600">{castControle(row).quantiteRetouche}</span> },
                  { key: 'quantiteRebut', header: 'Rebut', cell: (row: unknown) => <span className="text-rose-600">{castControle(row).quantiteRebut}</span> },
                  {
                    key: 'actions',
                    header: '',
                    cell: (row: unknown) => {
                      const c = castControle(row)
                      return c.quantiteRetouche > 0 ? (
                        <div className="flex items-center justify-end">
                          <EnvoiRetoucheDialog controleId={c.id} quantiteRetouche={c.quantiteRetouche} chaines={chaines} />
                        </div>
                      ) : null
                    },
                  },
                ]}
                data={controles}
                keyExtractor={(c: ControleQualite) => c.id}
                emptyText={commande > 0 ? 'Aucun contrôle pour cette commande.' : 'Sélectionnez une commande pour afficher ses contrôles.'}
                isLoading={isLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

// ══ Dialog création contrôle (Interne ou RetourSousTraitant) ══
type OrdreFabLite = { id: number; numeroOF: string }

function NouveauControleDialog({ commandeId, chaines }: { commandeId: number; chaines: { id: number; nom: string }[] }) {
  const [typeControle, setTypeControle] = useState<'Interne' | 'RetourSousTraitant'>('Interne')
  const [ofId, setOfId] = useState('')
  const [chaineId, setChaineId] = useState('')
  const [taille, setTaille] = useState('M')
  const [controlee, setControlee] = useState('')
  const [acceptee, setAcceptee] = useState('')
  const [retoucheQ, setRetoucheQ] = useState('')
  const [effectuePar, setEffectuePar] = useState('')
  const [notes, setNotes] = useState('')

  const { data: ordres = [] } = useQuery<OrdreFabLite[]>({
    queryKey: ['of', 'commande', commandeId],
    queryFn: () => apiClient.get<OrdreFabLite[]>(`/api/OrdreFabrication/CommandeClient/${commandeId}`),
    enabled: commandeId > 0,
    retry: false,
  })

  const { mutateAsync: creer, isPending } = useCreateControleQualite()

  const submit = async () => {
    const ordreFabricationId = Number(ofId)
    if (!ordreFabricationId) {
      toast.error('Choisissez une commande valide puis un ordre de fabrication.')
      return
    }
    if (!Number(controlee)) {
      toast.error('La quantité contrôlée est requise.')
      return
    }
    await creer({
      ordreFabricationId,
      chaineProductionId: chaineId ? Number(chaineId) : null,
      typeControle,
      taille,
      quantiteControlee: Number(controlee),
      quantiteAcceptee: Number(acceptee) || 0,
      quantiteRetouche: Number(retoucheQ) || 0,
      quantiteRebut: 0,
      effectuePar: effectuePar.trim() || null,
      notes: notes.trim() || null,
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm"><ClipboardCheck className="h-4 w-4" /> Nouveau contrôle</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Réception + Contrôle</DialogTitle>
          <DialogDescription>
            Tour du cycle qualité : la saisie réception + contrôle (Interne ou retour sous-traitant) se fait en une étape, avec plafond de référence appliqué côté serveur.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Ordre de fabrication</Label>
            <Select value={ofId} onValueChange={setOfId}>
              <SelectTrigger>
                <SelectValue placeholder={commandeId > 0 ? (ordres.length > 0 ? 'Choisir un OF…' : 'Aucun OF pour cette commande') : "Choisissez d'abord une commande"} />
              </SelectTrigger>
              <SelectContent>
                {ordres.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.numeroOF}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Type de contrôle</Label>
            <Select value={typeControle} onValueChange={(v) => setTypeControle(v as 'Interne' | 'RetourSousTraitant')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Interne">Interne</SelectItem>
                <SelectItem value="RetourSousTraitant">Retour sous-traitant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Chaîne</Label>
              <Select value={chaineId} onValueChange={setChaineId}>
                <SelectTrigger><SelectValue placeholder="Chaîne…" /></SelectTrigger>
                <SelectContent>
                  {chaines.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Taille</Label>
              <Select value={taille} onValueChange={setTaille}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAILLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Contrôlée</Label>
              <Input type="number" min={1} value={controlee} onChange={(e) => setControlee(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Acceptée</Label>
              <Input type="number" min={0} value={acceptee} onChange={(e) => setAcceptee(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Retouche</Label>
              <Input type="number" min={0} value={retoucheQ} onChange={(e) => setRetoucheQ(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Effectué par</Label>
            <Input value={effectuePar} onChange={(e) => setEffectuePar(e.target.value)} placeholder="Nom de l'opérateur" />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations…" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
          <Button onClick={submit} disabled={isPending}><ClipboardCheck className="h-4 w-4" /> Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ══ Dialog envoi en retouche (plafond strict : quantiteRetouche du contrôle) ══
function EnvoiRetoucheDialog({ controleId, quantiteRetouche, chaines }: {
  controleId: number
  quantiteRetouche: number
  chaines: { id: number; nom: string }[]
}) {
  const [chaineId, setChaineId] = useState('')
  const [quantite, setQuantite] = useState('')
  const { mutateAsync: envoyer, isPending } = useCreateEnvoiRetouche()

  const submit = async () => {
    if (!chaineId || !Number(quantite)) {
      toast.error('Chaîne et quantité renvoyée sont requises.')
      return
    }
    if (Number(quantite) > quantiteRetouche) {
      toast.error(`Quantité ${quantite} > retouche (${quantiteRetouche}). Plafond strict — envoi rejeté.`)
      return
    }
    await envoyer({
      controleQualiteId: controleId,
      chaineProductionId: Number(chaineId),
      quantiteRenvoyee: Number(quantite),
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Send className="h-4 w-4" /> Renvoyer</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renvoyer en retouche</DialogTitle>
          <DialogDescription>
            Nouveau tour du cycle : envoi à la chaîne sous-traitante — plafond strict : quantité retouche = {quantiteRetouche}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Chaîne cible</Label>
            <Select value={chaineId} onValueChange={setChaineId}>
              <SelectTrigger><SelectValue placeholder="Choisir une chaîne…" /></SelectTrigger>
              <SelectContent>
                {chaines.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Quantité renvoyée</Label>
            <Input type="number" min={1} value={quantite} onChange={(e) => setQuantite(e.target.value)} placeholder={`max ${quantiteRetouche}`} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
          <Button onClick={submit} disabled={isPending}><Send className="h-4 w-4" /> Envoyer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
