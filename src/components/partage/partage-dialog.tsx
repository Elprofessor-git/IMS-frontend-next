'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetPlateformes } from '@/hooks/use-plateformes'
import { useGetClients } from '@/hooks/use-clients'
import { useGetCommandes } from '@/hooks/use-commandes'
import { useCreatePartage } from '@/hooks/use-partage'
import {
  SHARE_SCOPE_TYPE,
  SHARE_SCOPE_LABEL,
  SHARE_SECTION,
  SHARE_SECTION_OPTIONS,
  type CreateShareLinkResponse,
  type ShareLinkFilters,
} from '@/types/partage'

export type PartageScopePreset = {
  type: number
  id: number
  libelle: string
}

const DUREES = [
  { value: 1, label: '1 heure' },
  { value: 6, label: '6 heures' },
  { value: 24, label: '24 heures' },
  { value: 72, label: '3 jours' },
  { value: 168, label: '7 jours (max)' },
]

function toggleSection(mask: number, bit: number): number {
  return (mask & bit) === bit ? mask & ~bit : mask | bit
}

export function PartageDialog({
  open,
  onClose,
  preset,
}: {
  open: boolean
  onClose: () => void
  preset?: PartageScopePreset | null
}) {
  const createMutation = useCreatePartage()

  const { data: plateformes } = useGetPlateformes()
  const { data: clients } = useGetClients()
  const { data: commandes } = useGetCommandes()

  const [scopeType, setScopeType] = useState<number>(
    preset ? preset.type : SHARE_SCOPE_TYPE.Plateforme,
  )
  const [scopeId, setScopeId] = useState<number>(preset ? preset.id : 0)
  const [sections, setSections] = useState<number>(
    SHARE_SECTION.Stock | SHARE_SECTION.Commandes | SHARE_SECTION.Importations,
  )
  const [dureeHeures, setDureeHeures] = useState<number>(24)
  const [maxUses, setMaxUses] = useState<string>('')
  const [stockLibre, setStockLibre] = useState(false)
  const [label, setLabel] = useState('')
  const [article, setArticle] = useState('')
  const [couleur, setCouleur] = useState('')
  const [taille, setTaille] = useState('')
  const [statut, setStatut] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  const [resultat, setResultat] = useState<CreateShareLinkResponse | null>(null)

  const scopeOptions = useMemo(() => {
    if (scopeType === SHARE_SCOPE_TYPE.Plateforme)
      return (plateformes ?? []).map((p) => ({ id: p.id, libelle: p.nom }))
    if (scopeType === SHARE_SCOPE_TYPE.Marque)
      return (clients ?? []).map((c) => ({ id: c.id, libelle: c.nom }))
    return (commandes ?? []).map((c) => ({
      id: c.id,
      libelle: c.titreCommande ? `${c.numeroCommande} — ${c.titreCommande}` : c.numeroCommande,
    }))
  }, [scopeType, plateformes, clients, commandes])

  const lienComplet = resultat
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/partage#${resultat.token}`
    : ''

  const peutSoumettre = (scopeId > 0 || !!preset) && sections !== 0 && !createMutation.isPending

  const onScopeTypeChange = (value: string) => {
    setScopeType(Number(value))
    if (!preset) setScopeId(0)
  }

  const onSubmit = async () => {
    const filters: ShareLinkFilters = {
      article: article.trim() || null,
      couleur: couleur.trim() || null,
      taille: taille.trim() || null,
      statut: statut.trim() || null,
      dateDebut: dateDebut ? new Date(dateDebut).toISOString() : null,
      dateFin: dateFin ? new Date(dateFin).toISOString() : null,
    }
    const filtersVides = Object.values(filters).every((v) => v == null)

    const parsedMax = maxUses.trim() === '' ? null : Number(maxUses)
    if (parsedMax != null && (!Number.isInteger(parsedMax) || parsedMax <= 0)) {
      toast.error("Le nombre d'ouvertures doit être un entier positif.")
      return
    }

    try {
      const res = await createMutation.mutateAsync({
        scopeType: preset ? preset.type : scopeType,
        scopeId: preset ? preset.id : scopeId,
        sections,
        dureeHeures,
        maxUses: parsedMax,
        isStockLibreAllowed: stockLibre,
        filters: filtersVides ? null : filters,
        label: label.trim() || null,
      })
      setResultat(res)
    } catch {
      // erreur déjà signalée par le hook
    }
  }

  const copier = async () => {
    if (!lienComplet) return
    try {
      await navigator.clipboard.writeText(lienComplet)
      toast.success('Lien copié')
    } catch {
      toast.error('Copie impossible — sélectionnez le lien manuellement.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4" />
            {resultat ? 'Lien de partage créé' : 'Créer un lien de partage'}
          </DialogTitle>
        </DialogHeader>

        {resultat ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ce lien donne un accès en <strong>lecture seule</strong> à{' '}
              <strong>{resultat.link.scopeLibelle}</strong>. Il ne s&apos;affiche qu&apos;une
              seule fois — copiez-le maintenant.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={lienComplet} className="font-mono text-xs" />
              <Button type="button" size="icon-sm" variant="outline" onClick={copier} title="Copier">
                <Copy className="size-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expire le {new Date(resultat.link.expiresAtUtc).toLocaleString('fr-FR')}
              {resultat.link.maxUses != null
                ? ` — ${resultat.link.maxUses} ouverture(s) maximum.`
                : ' — ouvertures illimitées.'}
            </p>
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Terminer
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            {preset ? (
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Périmètre : </span>
                <span className="font-medium">
                  {SHARE_SCOPE_LABEL[preset.type] ?? '—'} · {preset.libelle}
                </span>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Type de périmètre</Label>
                  <Select value={String(scopeType)} onValueChange={onScopeTypeChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SHARE_SCOPE_LABEL).map(([value, libelle]) => (
                        <SelectItem key={value} value={value}>
                          {libelle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Élément</Label>
                  <Select
                    value={scopeId > 0 ? String(scopeId) : ''}
                    onValueChange={(v) => setScopeId(Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner…" />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.libelle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Sections exposées</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SHARE_SECTION_OPTIONS.map(({ value, label }) => (
                  <div key={value} className="flex items-center gap-2">
                    <Checkbox
                      id={`section-${value}`}
                      checked={(sections & value) === value}
                      onCheckedChange={() => setSections((m) => toggleSection(m, value))}
                    />
                    <Label htmlFor={`section-${value}`} className="font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Durée de validité</Label>
                <Select value={String(dureeHeures)} onValueChange={(v) => setDureeHeures(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DUREES.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxUses">Ouvertures max (vide = illimité)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Illimité"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="stockLibre"
                checked={stockLibre}
                onCheckedChange={(v) => setStockLibre(!!v)}
              />
              <Label htmlFor="stockLibre" className="font-normal cursor-pointer">
                Inclure aussi le stock non rattaché (« libre »)
              </Label>
            </div>

            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-medium">Filtres (optionnel)</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input placeholder="Article / désignation" value={article} onChange={(e) => setArticle(e.target.value)} />
                <Input placeholder="Couleur" value={couleur} onChange={(e) => setCouleur(e.target.value)} />
                <Input placeholder="Taille" value={taille} onChange={(e) => setTaille(e.target.value)} />
                <Input placeholder="Statut (nom exact)" value={statut} onChange={(e) => setStatut(e.target.value)} />
                <div className="grid gap-1">
                  <Label htmlFor="dateDebut" className="text-xs text-muted-foreground">Du</Label>
                  <Input id="dateDebut" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="dateFin" className="text-xs text-muted-foreground">Au</Label>
                  <Input id="dateFin" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
                </div>
              </div>
            </details>

            <div className="grid gap-2">
              <Label htmlFor="label">Libellé (optionnel)</Label>
              <Input
                id="label"
                value={label}
                maxLength={100}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex. : suivi client Dupont"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="button" onClick={onSubmit} disabled={!peutSoumettre}>
                {createMutation.isPending ? 'Création…' : (
                  <>
                    <Check className="mr-1.5 size-4" />
                    Créer le lien
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
