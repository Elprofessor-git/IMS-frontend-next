'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, Paperclip, RefreshCw, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
import { useBackfillAttachments, useRequalifyAttachments } from '@/hooks/use-gmail'
import type { AttachmentMaintenanceReport } from '@/types/gmail'

/**
 * Maintenance des pièces jointes Gmail — écran d'administration (A2b).
 *
 * Réservé aux administrateurs : ces opérations relancent une boîte Gmail et consomment
 * son quota. Elles ne sont jamais déclenchées automatiquement — ni au démarrage, ni à la
 * synchronisation — et ne modifient QUE les lignes de pièces jointes : aucun message
 * n'est réécrit.
 */
const BUDGET_MIN = 1
const BUDGET_MAX = 250
const BUDGET_DEFAUT = 50

type Action = 'rattrapage' | 'requalification' | null

const LIBELLE_ACTION: Record<Exclude<Action, null>, { titre: string; description: string }> = {
  rattrapage: {
    titre: 'Rattraper les pièces jointes manquantes ?',
    description:
      'Les messages seront relus auprès de Gmail et leurs pièces enregistrées. Aucun message ne sera modifié.',
  },
  requalification: {
    titre: 'Requalifier les pièces jointes existantes ?',
    description:
      'Les pièces déjà enregistrées seront reclassées selon leur Content-Disposition. Aucun message ne sera modifié.',
  },
}

function Compteur({
  label,
  valeur,
  alerte,
}: {
  label: string
  valeur: number
  alerte?: boolean
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={alerte ? 'text-xl font-semibold text-amber-700' : 'text-xl font-semibold'}>
        {valeur}
      </p>
    </div>
  )
}

function CompteRendu({ rapport }: { rapport: AttachmentMaintenanceReport }) {
  const restants = rapport.restants ?? 0

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Compte-rendu du passage</h2>
        {restants > 0 ? (
          <p className="inline-flex items-center gap-1 text-xs text-amber-700">
            <AlertTriangle className="size-3.5" />
            {restants} message(s) restent à traiter : relancez pour reprendre où l&apos;on
            s&apos;est arrêté.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Plus aucun message en attente pour ce compte Gmail.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Compteur label="Messages examinés" valeur={rapport.examines} />
        <Compteur label="Pièces créées" valeur={rapport.creees ?? 0} />
        {rapport.reclasses !== undefined && (
          <Compteur label="Pièces requalifiées" valeur={rapport.reclasses} />
        )}
        <Compteur label="Erreurs" valeur={rapport.erreurs} alerte={rapport.erreurs > 0} />
      </div>

      {rapport.messages.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Détail par message ({rapport.messages.length})
          </summary>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs text-muted-foreground">
            {rapport.messages.map((ligne, index) => (
              <li key={`${index}-${ligne}`} className="rounded border px-2 py-1">
                {ligne}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

export default function MaintenanceCourrielsPage() {
  const { data: utilisateur, isLoading } = useAuth()
  const backfill = useBackfillAttachments()
  const requalify = useRequalifyAttachments()

  const [budget, setBudget] = useState(String(BUDGET_DEFAUT))
  const [confirmation, setConfirmation] = useState<Action>(null)
  const [rapport, setRapport] = useState<AttachmentMaintenanceReport | null>(null)

  const enCours = backfill.isPending || requalify.isPending

  // Garde d'affichage. La vraie barrière est côté serveur : ces endpoints exigent le rôle
  // administrateur, quel que soit ce que l'interface laisse voir.
  if (isLoading) return null

  if (!utilisateur?.estAdministrateur) {
    return (
      <div>
        <PageHeader title="Maintenance des pièces jointes" />
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
          <ShieldAlert className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Accès réservé aux administrateurs</p>
          <p className="text-xs text-muted-foreground">
            Ces opérations consomment le quota Gmail du compte connecté. Contactez un
            administrateur si un rattrapage est nécessaire.
          </p>
        </div>
      </div>
    )
  }

  const budgetSaisi = Number.parseInt(budget, 10)
  const budgetValide =
    Number.isInteger(budgetSaisi) && budgetSaisi >= BUDGET_MIN && budgetSaisi <= BUDGET_MAX
  // Hors limites, on n'invente rien : la valeur par défaut du serveur est demandée.
  const budgetEnvoye = budgetValide ? budgetSaisi : BUDGET_DEFAUT
  const params = { maxMessages: budgetEnvoye }

  return (
    <div>
      <PageHeader
        title="Maintenance des pièces jointes"
        description="Rattrape les pièces jointes des messages historiques et réapplique la qualification Content-Disposition / cid:."
      />

      <div className="space-y-5">
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Ce que font ces opérations</h2>
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Rattraper</span> : crée les lignes
              de pièces des messages synchronisés avant l&apos;import des pièces jointes.
              Leur trombone est absent, aucun message n&apos;ayant de ligne à lister.
            </li>
            <li>
              <span className="font-medium text-foreground">Requalifier</span> : réapplique la
              règle de qualification aux pièces déjà enregistrées — une pièce « attachment »
              reste une pièce jointe visible même si elle porte un Content-ID ; une image
              n&apos;est intégrée au corps que si le corps la référence par <code>cid:</code>.
            </li>
            <li>
              Les deux sont <span className="font-medium text-foreground">idempotentes</span> :
              relancer ne crée ni doublon ni modification inutile.
            </li>
            <li>
              Elles ne modifient que les pièces jointes — aucun message n&apos;est réécrit,
              déplacé ni marqué, et elles ne sont jamais lancées automatiquement.
            </li>
          </ul>
        </section>

        <section className="space-y-3 rounded-lg border bg-card p-4">
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="maintenance-budget">Messages par passage</Label>
            <Input
              id="maintenance-budget"
              type="number"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              disabled={enCours}
            />
            <p className="text-xs text-muted-foreground">
              {budgetValide
                ? `${budgetEnvoye} message(s) seront relus, à une lecture toutes les 400 ms.`
                : `Valeur hors limites : entre ${BUDGET_MIN} et ${BUDGET_MAX}. ${BUDGET_DEFAUT} messages seront relus.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={enCours} onClick={() => setConfirmation('rattrapage')}>
              {backfill.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
              Rattraper les pièces manquantes
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={enCours}
              onClick={() => setConfirmation('requalification')}
            >
              {requalify.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Requalifier les pièces existantes
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Chaque passage est borné et espacé pour tenir le plafond de l&apos;API Gmail
            (250 requêtes par utilisateur et par fenêtre glissante). Un passage interrompu se
            reprend au lancement suivant : les messages déjà traités quittent la liste des
            candidats.
          </p>
        </section>

        {rapport && <CompteRendu rapport={rapport} />}
      </div>

      {/* Confirmation explicite : l'action consomme du quota Gmail et ne s'annule pas. */}
      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => !open && setConfirmation(null)}
      >
        <DialogContent>
          {confirmation && (
            <>
              <DialogHeader>
                <DialogTitle>{LIBELLE_ACTION[confirmation].titre}</DialogTitle>
                <DialogDescription>
                  {LIBELLE_ACTION[confirmation].description}
                  {budgetEnvoye} message(s) seront relus.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmation(null)}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const action = confirmation
                    setConfirmation(null)
                    if (action === 'requalification') {
                      requalify.mutate(params, { onSuccess: setRapport })
                      return
                    }
                    backfill.mutate(params, { onSuccess: setRapport })
                  }}
                >
                  Lancer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
