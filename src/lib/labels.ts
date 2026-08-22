import type { CommandeClient } from '@/types/commande'
import type { Client } from '@/types/client'

/**
 * Libellé d'une commande pour un id donné.
 * Les utilisateurs identifient une commande par son TITRE — le numéro reste en secours.
 * Partout où une commande est affichée (colonnes, exports CSV, badges, sélecteurs).
 */
export function libelleCommande(
  id: number | null | undefined,
  commandes: CommandeClient[] | undefined,
): string | null {
  const c = commandes?.find((c) => c.id === id)
  if (!c) return id ? `#${id}` : null
  const nom = c.titreCommande || c.client?.nom || null
  return nom ? `${nom} (${c.numeroCommande})` : c.numeroCommande
}

/**
 * Libellé court d'une commande — titre uniquement (sans numéro).
 * Utilisé dans les sélecteurs et tableaux où l'espace est restreint.
 * La date de création est retournée en secondaire pour distinguer les doublons.
 */
export function commandeLabelShort(c: CommandeClient): string {
  const title = c.titreCommande || c.client?.nom || c.numeroCommande
  const date = new Date(c.dateCommande).toLocaleDateString('fr-FR')
  return `${title} — ${date}`
}

/**
 * Libellé d'un client (résout par id depuis une liste).
 */
export function clientLabelById(
  id: number | null | undefined,
  clients: Client[] | undefined,
): string | null {
  if (!id) return null
  const c = clients?.find((c) => c.id === id)
  if (!c) return `Client #${id}`
  return c.nomEntreprise ?? `${c.nom} ${c.prenom ?? ''}`.trim()
}
