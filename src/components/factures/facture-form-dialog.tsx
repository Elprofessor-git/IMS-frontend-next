'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, LoaderCircle, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { useGetClients } from '@/hooks/use-clients'
import { useGetCommandes } from '@/hooks/use-commandes'
import { useCreateFacture, useUpdateFacture } from '@/hooks/use-factures'
import type { CommandeClient } from '@/types/commande'
import type { FactureLigneInput } from '@/types/facture'

type LigneDraft = FactureLigneInput & { id: string }

const emptyLigne = (): LigneDraft => ({
  id: crypto.randomUUID(),
  commandeId: 0,
  quantite: 1,
  prixUnitaireFacon: 0,
})

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  factureId?: number
  detail?: {
    dateFacture: string
    clientId: number
    devise: string | null
    modePaiement: string | null
    rib: string | null
    iban: string | null
    modeLivraison: string | null
    nombreColis: number | null
    poidsNetKg: number | null
    poidsBrutKg: number | null
    volumeM3: number | null
    notes: string | null
    lignes: { commandeId: number; quantite: number; prixUnitaireFacon: number }[]
  }
}

export function FactureFormDialog({ open, onOpenChange, factureId, detail }: Props) {
  const { data: clients } = useGetClients()
  const { data: commandes } = useGetCommandes()
  const createMutation = useCreateFacture()
  const updateMutation = useUpdateFacture()

  const [clientId, setClientId] = useState(0)
  const [dateFacture, setDateFacture] = useState('')
  const [devise, setDevise] = useState('EUR')
  const [modePaiement, setModePaiement] = useState('')
  const [rib, setRib] = useState('')
  const [iban, setIban] = useState('')
  const [modeLivraison, setModeLivraison] = useState('')
  const [nombreColis, setNombreColis] = useState('')
  const [poidsNetKg, setPoidsNetKg] = useState('')
  const [poidsBrutKg, setPoidsBrutKg] = useState('')
  const [volumeM3, setVolumeM3] = useState('')
  const [notes, setNotes] = useState('')
  const [lignes, setLignes] = useState<LigneDraft[]>([emptyLigne()])

  const isEdit = !!factureId && detail != null

  // (Re)initialisation du formulaire à chaque ouverture.
  useEffect(() => {
    if (!open) return
    if (isEdit && detail) {
      setClientId(detail.clientId)
      setDateFacture(detail.dateFacture?.substring(0, 10) ?? new Date().toISOString().substring(0, 10))
      setDevise(detail.devise ?? 'EUR')
      setModePaiement(detail.modePaiement ?? '')
      setRib(detail.rib ?? '')
      setIban(detail.iban ?? '')
      setModeLivraison(detail.modeLivraison ?? '')
      setNombreColis(detail.nombreColis != null ? String(detail.nombreColis) : '')
      setPoidsNetKg(detail.poidsNetKg != null ? String(detail.poidsNetKg) : '')
      setPoidsBrutKg(detail.poidsBrutKg != null ? String(detail.poidsBrutKg) : '')
      setVolumeM3(detail.volumeM3 != null ? String(detail.volumeM3) : '')
      setNotes(detail.notes ?? '')
      setLignes(
        (detail.lignes.length > 0
          ? detail.lignes
          : [{ commandeId: 0, quantite: 1, prixUnitaireFacon: 0 }]
        ).map((l) => ({
          id: crypto.randomUUID(),
          commandeId: l.commandeId,
          quantite: l.quantite,
          prixUnitaireFacon: l.prixUnitaireFacon,
        })),
      )
    } else {
      setClientId(0)
      setDateFacture(new Date().toISOString().substring(0, 10))
      setDevise('EUR')
      setModePaiement('')
      setRib('')
      setIban('')
      setModeLivraison('')
      setNombreColis('')
      setPoidsNetKg('')
      setPoidsBrutKg('')
      setVolumeM3('')
      setNotes('')
      setLignes([emptyLigne()])
    }
  }, [open, isEdit, detail])

  const commandesDuClient = useMemo(
    () => (commandes ?? []).filter((c) => c.clientId === clientId),
    [commandes, clientId],
  )

  const commandeById = useMemo(() => {
    const map = new Map<number, CommandeClient>()
    for (const c of commandes ?? []) map.set(c.id, c)
    return map
  }, [commandes])

  const total = lignes.reduce((acc, l) => acc + l.quantite * l.prixUnitaireFacon, 0)

  function changeLigne(id: string, patch: Partial<LigneDraft>) {
    setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function onCommandeChange(ligne: LigneDraft, commandeId: number) {
    const commande = commandeById.get(commandeId)
    changeLigne(ligne.id, {
      commandeId,
      // Pré-rempli depuis la commande, reste librement modifiable.
      prixUnitaireFacon: commande?.prixFacon ?? ligne.prixUnitaireFacon,
    })
  }

  function onClientChange(id: number) {
    setClientId(id)
    setLignes((prev) => prev.map((l) => ({ ...l, commandeId: 0 })))
  }

  async function handleSave() {
    if (clientId <= 0) return
    const lignesValides = lignes.filter((l) => l.commandeId > 0 && l.quantite > 0)
    if (lignesValides.length === 0) return

    const base = {
      clientId,
      dateFacture: dateFacture ? new Date(dateFacture).toISOString() : null,
      devise: devise || 'EUR',
      modePaiement: modePaiement || null,
      rib: rib || null,
      iban: iban || null,
      modeLivraison: modeLivraison || null,
      nombreColis: nombreColis !== '' ? Number(nombreColis) : null,
      poidsNetKg: poidsNetKg !== '' ? Number(poidsNetKg) : null,
      poidsBrutKg: poidsBrutKg !== '' ? Number(poidsBrutKg) : null,
      volumeM3: volumeM3 !== '' ? Number(volumeM3) : null,
      notes: notes || null,
      lignes: lignesValides.map((l) => ({
        commandeId: l.commandeId,
        quantite: l.quantite,
        prixUnitaireFacon: l.prixUnitaireFacon,
      })),
    }

    if (isEdit && factureId) {
      await updateMutation.mutateAsync({ id: factureId, data: base })
    } else {
      await createMutation.mutateAsync(base)
    }
    onOpenChange(false)
  }

  const busy = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-4" />
            {isEdit ? 'Modifier la facture' : 'Nouvelle facture'}
          </DialogTitle>
          <DialogDescription>
            Une ligne de facture par commande — quantités façonnées et prix façon par pièce.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Client</Label>
            <Select
              value={clientId > 0 ? String(clientId) : ''}
              onValueChange={(v) => onClientChange(Number(v))}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nom} {c.prenom ? `— ${c.prenom}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {clientId > 0 && (
            <div className="grid gap-2">
              <Label>Date de facture</Label>
              <Input
                type="date"
                value={dateFacture}
                onChange={(e) => setDateFacture(e.target.value)}
                className="max-w-[200px]"
              />
            </div>
          )}

          {clientId > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-sm font-medium">Lignes (1 par commande)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLignes((prev) => [...prev, emptyLigne()])}
                  disabled={busy}
                >
                  <Plus className="size-3.5" />
                  Ajouter une commande
                </Button>
              </div>
              <div className="space-y-2">
                {lignes.map((l) => {
                  const commande = commandeById.get(l.commandeId)
                  return (
                    <div key={l.id} className="grid grid-cols-12 items-end gap-2">
                      <div className="col-span-6 grid gap-1">
                        <Label className="text-xs">Commande</Label>
                        <Select
                          value={l.commandeId > 0 ? String(l.commandeId) : ''}
                          onValueChange={(v) => onCommandeChange(l, Number(v))}
                          disabled={busy}
                        >
                          <SelectTrigger size="sm">
                            <SelectValue placeholder="Choisir la commande" />
                          </SelectTrigger>
                          <SelectContent>
                            {commandesDuClient.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.numeroCommande} — {c.titreCommande ?? 'sans titre'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 grid gap-1">
                        <Label className="text-xs">Qté (façon)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={String(l.quantite)}
                          onChange={(e) => changeLigne(l.id, { quantite: Number(e.target.value) })}
                          disabled={busy}
                        />
                      </div>
                      <div className="col-span-3 grid gap-1">
                        <Label className="text-xs">Prix façon / pièce</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={String(l.prixUnitaireFacon)}
                          onChange={(e) =>
                            changeLigne(l.id, { prixUnitaireFacon: Number(e.target.value) })
                          }
                          disabled={busy}
                        />
                      </div>
                      <div className="col-span-1 grid gap-1 place-items-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          onClick={() =>
                            setLignes((prev) => prev.filter((x) => x.id !== l.id))
                          }
                          disabled={busy}
                          title="Retirer"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      {commande && l.commandeId > 0 && (
                        <div className="col-span-12 text-xs text-muted-foreground">
                          {commande.numeroCommande} · prix façon enregistré :{' '}
                          {commande.prixFacon != null ? `${commande.prixFacon} ${devise || 'EUR'}` : 'non défini'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 text-right text-sm font-semibold">
                Total : {total.toFixed(2)} {devise || 'EUR'}
              </div>
            </div>
          )}

          {clientId > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="grid gap-1">
                <Label className="text-xs">Devise</Label>
                <Input
                  value={devise}
                  onChange={(e) => setDevise(e.target.value)}
                  maxLength={10}
                  disabled={busy}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Mode de paiement</Label>
                <Input
                  value={modePaiement}
                  onChange={(e) => setModePaiement(e.target.value)}
                  maxLength={50}
                  disabled={busy}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Mode de livraison</Label>
                <Input
                  value={modeLivraison}
                  onChange={(e) => setModeLivraison(e.target.value)}
                  maxLength={50}
                  disabled={busy}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">RIB</Label>
                <Input value={rib} onChange={(e) => setRib(e.target.value)} maxLength={100} disabled={busy} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">IBAN</Label>
                <Input value={iban} onChange={(e) => setIban(e.target.value)} maxLength={100} disabled={busy} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Nombre de colis</Label>
                <Input
                  type="number"
                  min={0}
                  value={nombreColis}
                  onChange={(e) => setNombreColis(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Poids net (kg)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={poidsNetKg}
                  onChange={(e) => setPoidsNetKg(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Poids brut (kg)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={poidsBrutKg}
                  onChange={(e) => setPoidsBrutKg(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Volume (m³)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={volumeM3}
                  onChange={(e) => setVolumeM3(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="grid gap-1 col-span-2 sm:col-span-3">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  disabled={busy}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={busy || clientId <= 0 || !lignes.some((l) => l.commandeId > 0 && l.quantite > 0)}
          >
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer la facture'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}