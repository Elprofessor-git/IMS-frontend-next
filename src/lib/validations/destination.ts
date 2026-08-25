// Destination de ligne d'achat/importation : 4 niveaux combinables et indépendants
// (GroupeCommandes / Commande / Client / Plateforme) + Stock libre (implicite si aucun niveau).
// L'exclusivité N'EST PAS imposée par le formulaire : plusieurs FK peuvent être renseignées.
// Le niveau "effectif" (celui compté dans ValiderRessources) est dérivé par priorité :
// GroupeCommandes > Commande > Client > Plateforme > StockLibre.

export type DestinationEnum = 'GroupeCommandes' | 'Commande' | 'Marque' | 'Plateforme' | 'StockLibre'

export type ScopeValues = {
  commandeClientIds: number[] | null
  commandeClientId: number | null
  clientId: number | null
  plateformeId: number | null
}

// Enum backend TypeDestinationAchat / TypeDestinationImportation (sérialisé en nombre)
export const TYPE_DESTINATION: Record<DestinationEnum, number> = {
  Commande: 0,
  Marque: 1,
  Plateforme: 2,
  StockLibre: 3,
  GroupeCommandes: 4,
}

export const DESTINATION_LABELS: Record<DestinationEnum, string> = {
  Commande: 'Commande',
  Marque: 'Client',
  Plateforme: 'Plateforme',
  StockLibre: 'Stock libre',
  GroupeCommandes: 'Groupe de commandes',
}

// Niveau effectif selon la priorité GroupeCommandes > Commande > Client > Plateforme > StockLibre.
// StockLibre = aucun niveau renseigné (reste exclusif des 4 autres par construction).
export function destinationEffectif(v: ScopeValues): DestinationEnum {
  if (v.commandeClientIds && v.commandeClientIds.length >= 2) return 'GroupeCommandes'
  if (v.commandeClientId != null) return 'Commande'
  if (v.clientId != null) return 'Marque'
  if (v.plateformeId != null) return 'Plateforme'
  return 'StockLibre'
}