'use client'

import { useState } from 'react'
import { useCreerMatelas, useModifierMatelas } from '@/hooks/use-fournitures'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Matelas } from '@/types/fourniture'
import type { MettreAJourMatelasPayload } from '@/types/matelas'

/**
 * Création / modification d'un matelas depuis l'onglet « Ordre de coupe »
 * (/coupe/{commandeId}). La commande est déjà portée par la page : pas de
 * sélecteur de commande ici.
 */
export function CreerMatelasDialog({
  commandeId,
  open,
  onOpenChange,
}: {
  commandeId: number
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const creer = useCreerMatelas(commandeId)
  const [numero, setNumero] = useState('')
  const [date, setDate] = useState('')
  const [pliage, setPliage] = useState('')
  const [estimee, setEstimee] = useState('')
  const [longueur, setLongueur] = useState('')
  const [laize, setLaize] = useState('')
  const [notes, setNotes] = useState('')

  const reset = () => {
    setNumero('')
    setDate('')
    setPliage('')
    setEstimee('')
    setLongueur('')
    setLaize('')
    setNotes('')
  }

  const submit = () => {
    if (!numero.trim()) {
      toast.error('Le numéro du matelas est requis.')
      return
    }
    creer.mutate(
      {
        numeroMatelas: numero.trim(),
        dateMatelas: date ? new Date(date + 'T12:00:00').toISOString() : null,
        piecePliage: Number(pliage) || 0,
        coupeEstimee: Number(estimee) || 0,
        longueur: longueur.trim() !== '' ? Number(longueur) : null,
        laize: laize.trim() !== '' ? Number(laize) : null,
        notes: notes.trim() || null,
      },
      { onSuccess: () => { reset(); onOpenChange(false) } },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau matelas</DialogTitle>
          <DialogDescription>
            Le matelas est rattaché à cette commande. Le plan de coupe se saisit juste après.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="creer-matelas-numero">N° matelas</Label>
            <Input
              id="creer-matelas-numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="ex. M-2026-001"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="creer-matelas-date">Date</Label>
              <Input id="creer-matelas-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="creer-matelas-plis">Plis</Label>
              <Input
                id="creer-matelas-plis"
                type="number"
                min="0"
                value={pliage}
                onChange={(e) => setPliage(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="creer-matelas-estimee">Coupe est.</Label>
              <Input
                id="creer-matelas-estimee"
                type="number"
                min="0"
                value={estimee}
                onChange={(e) => setEstimee(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="creer-matelas-longueur">Longueur (m)</Label>
              <Input
                id="creer-matelas-longueur"
                type="number"
                min="0"
                step="0.1"
                value={longueur}
                onChange={(e) => setLongueur(e.target.value)}
                placeholder="ex. 148,5"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="creer-matelas-laize">Laize (cm)</Label>
              <Input
                id="creer-matelas-laize"
                type="number"
                min="0"
                step="0.1"
                value={laize}
                onChange={(e) => setLaize(e.target.value)}
                placeholder="défaut : tissu"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="creer-matelas-notes">Notes</Label>
            <Textarea id="creer-matelas-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button disabled={creer.isPending || !numero.trim()} onClick={submit}>
            {creer.isPending ? 'Création…' : 'Créer le matelas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EditerMatelasDialog({
  matelas,
  onOpenChange,
}: {
  matelas: Matelas | null
  onOpenChange: (v: boolean) => void
}) {
  const modifier = useModifierMatelas(matelas?.commandeId)
  const [numero, setNumero] = useState(matelas?.numeroMatelas ?? '')
  const [date, setDate] = useState(matelas?.dateMatelas ? matelas.dateMatelas.slice(0, 10) : '')
  const [pliage, setPliage] = useState(String(matelas?.piecePliage ?? 0))
  const [estimee, setEstimee] = useState(String(matelas?.coupeEstimee ?? 0))
  const [longueur, setLongueur] = useState(matelas?.longueur != null ? String(matelas.longueur) : '')
  const [laize, setLaize] = useState(matelas?.laize != null ? String(matelas.laize) : '')
  const [notes, setNotes] = useState(matelas?.notes ?? '')
  const [estActif, setEstActif] = useState(matelas?.estActif ?? true)

  return (
    <Dialog open={matelas !== null} onOpenChange={(v) => { if (!v) onOpenChange(false) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le matelas</DialogTitle>
          <DialogDescription>
            Un matelas qui porte déjà des coupes est verrouillé (le plan et le matelas ne sont
            plus modifiables, l&apos;historique n&apos;est jamais réécrit).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="modifier-matelas-numero">N° matelas</Label>
            <Input
              id="modifier-matelas-numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="ex. M-2026-001"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="modifier-matelas-date">Date</Label>
              <Input id="modifier-matelas-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="modifier-matelas-plis">Plis</Label>
              <Input
                id="modifier-matelas-plis"
                type="number"
                min="0"
                value={pliage}
                onChange={(e) => setPliage(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="modifier-matelas-estimee">Coupe est.</Label>
              <Input
                id="modifier-matelas-estimee"
                type="number"
                min="0"
                value={estimee}
                onChange={(e) => setEstimee(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="modifier-matelas-longueur">Longueur (m)</Label>
              <Input
                id="modifier-matelas-longueur"
                type="number"
                min="0"
                step="0.1"
                value={longueur}
                onChange={(e) => setLongueur(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="modifier-matelas-laize">Laize (cm)</Label>
              <Input
                id="modifier-matelas-laize"
                type="number"
                min="0"
                step="0.1"
                value={laize}
                onChange={(e) => setLaize(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="modifier-matelas-notes">Notes</Label>
            <Textarea id="modifier-matelas-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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
                longueur: longueur.trim() !== '' ? Number(longueur) : null,
                laize: laize.trim() !== '' ? Number(laize) : null,
                notes: notes.trim() || null,
                estActif,
              }
              modifier.mutate({ id: matelas.id, ...payload }, { onSuccess: () => onOpenChange(false) })
            }}
          >
            {modifier.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
