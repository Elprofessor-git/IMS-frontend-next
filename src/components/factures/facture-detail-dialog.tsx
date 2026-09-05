'use client'

import { useState } from 'react'
import { LoaderCircle, Pencil, Receipt, Send, CheckCircle2, Ban, Trash2, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'
import { downloadViaProxy } from '@/lib/download'
import { useGetFacture, useEmettreFacture, useReglerFacture, useDeleteFacture } from '@/hooks/use-factures'
import { STATUT_FACTURE_LABELS } from '@/types/facture'

const STATUT_CFG: Record<number, { className: string }> = {
  0: { className: 'border-amber-200 bg-amber-100 text-amber-800' },
  1: { className: 'border-blue-200 bg-blue-100 text-blue-800' },
  2: { className: 'border-green-200 bg-green-100 text-green-800' },
  3: { className: 'border-destructive/30 bg-destructive/10 text-destructive' },
}

function money(n: number, devise: string | null) {
  return (
    <span className="tabular-nums">
      {n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{' '}
      {devise ?? 'EUR'}
    </span>
  )
}

type Props = {
  factureId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

export function FactureDetailDialog({ factureId, open, onOpenChange, onEdit }: Props) {
  const { data: facture, isLoading, refetch } = useGetFacture(factureId)
  const emettreMutation = useEmettreFacture()
  const reglerMutation = useReglerFacture()
  const deleteMutation = useDeleteFacture()
  const [exportEnCours, setExportEnCours] = useState(false)

  const telecharger = () => {
    setExportEnCours(true)
    downloadViaProxy(
      `/api/proxy/api/Facture/${factureId}/Export`,
      `Facture_${facture?.numeroFacture ?? factureId}.xlsx`,
    )
      .then(() => toast.success('Facture téléchargée'))
      .catch((e: Error) => toast.error(e.message ?? 'Téléchargement impossible'))
      .finally(() => setExportEnCours(false))
  }

  if (!facture) return null

  const statut = facture.statut
  const cfg = STATUT_CFG[statut] ?? { className: '' }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-4" />
            Facture {facture.numeroFacture}
          </DialogTitle>
          <DialogDescription>
            Client : {facture.clientNom ?? `#${facture.clientId}`} · créée le{' '}
            {new Date(facture.dateCreation).toLocaleDateString('fr-FR')}
            {facture.creePar ? ` · par ${facture.creePar}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Badge variant="outline" className={cfg.className}>
            {STATUT_FACTURE_LABELS[statut] ?? String(statut)}
          </Badge>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Commande</th>
                      <th className="px-3 py-2 text-right">Qté (façon)</th>
                      <th className="px-3 py-2 text-right">Prix façon / pièce</th>
                      <th className="px-3 py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {facture.lignes.map((l) => (
                      <tr key={l.id}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{l.modele ?? '—'}</p>
                          <p className="font-mono text-xs text-muted-foreground">{l.numeroCommande}</p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.quantite}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.prixUnitaireFacon.toLocaleString('fr-FR')}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {money(l.montantLigne, facture.devise)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40">
                      <td className="px-3 py-2 text-right font-semibold" colSpan={3}>
                        Total
                      </td>
                      <td className="px-3 py-2 text-right text-base font-bold tabular-nums">
                        {money(facture.montantTotal, facture.devise)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {(facture.modePaiement ||
                facture.modeLivraison ||
                facture.nombreColis != null ||
                facture.poidsNetKg != null ||
                facture.poidsBrutKg != null ||
                facture.volumeM3 != null ||
                facture.notes ||
                facture.rib ||
                facture.iban) && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  {facture.modePaiement && (
                    <>
                      <dt className="text-muted-foreground">Paiement</dt>
                      <dd>{facture.modePaiement}</dd>
                    </>
                  )}
                  {facture.modeLivraison && (
                    <>
                      <dt className="text-muted-foreground">Livraison</dt>
                      <dd>{facture.modeLivraison}</dd>
                    </>
                  )}
                  {facture.nombreColis != null && (
                    <>
                      <dt className="text-muted-foreground">Colis</dt>
                      <dd>{facture.nombreColis}</dd>
                    </>
                  )}
                  {facture.poidsNetKg != null && (
                    <>
                      <dt className="text-muted-foreground">Poids net</dt>
                      <dd>{facture.poidsNetKg} kg</dd>
                    </>
                  )}
                  {facture.poidsBrutKg != null && (
                    <>
                      <dt className="text-muted-foreground">Poids brut</dt>
                      <dd>{facture.poidsBrutKg} kg</dd>
                    </>
                  )}
                  {facture.volumeM3 != null && (
                    <>
                      <dt className="text-muted-foreground">Volume</dt>
                      <dd>{facture.volumeM3} m³</dd>
                    </>
                  )}
                  {facture.rib && (
                    <>
                      <dt className="text-muted-foreground">RIB</dt>
                      <dd className="break-all">{facture.rib}</dd>
                    </>
                  )}
                  {facture.iban && (
                    <>
                      <dt className="text-muted-foreground">IBAN</dt>
                      <dd className="break-all">{facture.iban}</dd>
                    </>
                  )}
                  {facture.notes && (
                    <>
                      <dt className="text-muted-foreground">Notes</dt>
                      <dd className="whitespace-pre-line col-span-2 sm:col-span-3">{facture.notes}</dd>
                    </>
                  )}
                </dl>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={telecharger}
            disabled={isLoading || exportEnCours}
          >
            <FileDown className="size-3.5" />
            {exportEnCours ? 'Génération…' : 'Télécharger'}
          </Button>
          <PermissionGate module="factures" mode="write">
            {statut === 0 && (
              <>
                <Button variant="outline" size="sm" onClick={onEdit} disabled={isLoading}>
                  <Pencil className="size-3.5" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={emettreMutation.isPending || isLoading}
                  onClick={() =>
                    emettreMutation.mutate(facture.id, { onSuccess: () => refetch() })
                  }
                >
                  <Send className="size-3.5" />
                  Émettre
                </Button>
              </>
            )}
            {statut === 1 && (
              <Button
                variant="outline"
                size="sm"
                disabled={reglerMutation.isPending || isLoading}
                onClick={() => reglerMutation.mutate(facture.id, { onSuccess: () => refetch() })}
              >
                <CheckCircle2 className="size-3.5" />
                Marquer réglée
              </Button>
            )}
            {statut !== 2 && (
              <ConfirmDialog
                trigger={
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteMutation.isPending || isLoading}
                  >
                    <Trash2 className="size-3.5" />
                    Supprimer
                  </Button>
                }
                title="Supprimer cette facture ?"
                description={`La facture ${facture.numeroFacture} sera définitivement supprimée.`}
                onConfirm={() =>
                  deleteMutation.mutate(facture.id, { onSuccess: () => onOpenChange(false) })
                }
              />
            )}
          </PermissionGate>
          <Button variant="ghost" size="sm" disabled={isLoading} onClick={() => onOpenChange(false)}>
            <Ban className="size-3.5" />
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}