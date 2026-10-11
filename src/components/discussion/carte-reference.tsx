'use client'

import Link from 'next/link'
import { ArrowUpRight, Building2, CalendarDays, CircleDollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dateObjet, lienReference, montantReference } from '@/lib/discussion'
import type { ReferenceDiscussion, TypeContexte } from '@/types/discussion'

// Libellé court du type, affiché dans la pastille de la carte.
const LIBELLE_TYPE: Record<TypeContexte, string> = {
  Commande: 'Commande',
  OrdreFabrication: 'OF',
  TacheProduction: 'Tâche',
  Achat: 'Achat',
}

/**
 * Carte d'une référence métier (#CMD-123, #OF-…, #TAC-…, #ACH-…).
 *
 * Ce composant est PUREMENT présentationnel : il n'affiche que ce que le serveur a
 * bien voulu émettre pour le lecteur courant. `montant`, `devise` et `tiers` sont
 * absents si le lecteur n'a pas le droit d'écriture du module — la carte est déjà
 * calculée selon ses droits, jamais masquée côté client.
 */
export function CarteReference({ reference }: { reference: ReferenceDiscussion }) {
  const montant = montantReference(reference)
  const lien = lienReference(reference)

  const contenu = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {LIBELLE_TYPE[reference.type] ?? reference.type}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {reference.reference}
        </span>
      </div>

      <p className="mt-1 line-clamp-2 text-xs font-medium text-foreground">
        {reference.libelle}
      </p>

      {(reference.statut || reference.date || montant || reference.tiers) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {reference.statut && <span>{reference.statut}</span>}
          {reference.date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" />
              {dateObjet(reference.date)}
            </span>
          )}
          {montant && (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <CircleDollarSign className="size-3" />
              {montant}
            </span>
          )}
          {reference.tiers && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" />
              {reference.tiers}
            </span>
          )}
        </div>
      )}
    </>
  )

  const classe = cn(
    'group relative block w-full max-w-sm rounded-lg border bg-muted/40 p-2 text-left transition-colors',
    lien && 'hover:border-primary/50 hover:bg-muted',
  )

  if (lien) {
    return (
      <Link
        href={lien}
        className={classe}
        data-testid={`reference-${reference.reference}`}
      >
        {contenu}
        <ArrowUpRight className="absolute right-2 top-2 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    )
  }

  return (
    <div className={classe} data-testid={`reference-${reference.reference}`}>
      {contenu}
    </div>
  )
}
