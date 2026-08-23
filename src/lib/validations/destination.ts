// Destination de ligne d'achat/importation : 3 niveaux combinables et indépendants
// (Plateforme / Client / Commande client) + Stock libre (implicite si aucun niveau).
// L'exclusivité N'EST PAS imposée par le formulaire : plusieurs FK peuvent être renseignées.
// Le niveau "effectif" (celui compté dans ValiderRessources/Calculer, seaux a1/a2/a3)
// est dérivé par priorité : Commande > Client > Plateforme > StockLibre.

export type DestinationEnum = 'Commande' | 'Marque' | 'Plateforme' | 'StockLibre'

export type ScopeValues = {
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
}

export const DESTINATION_LABELS: Record<DestinationEnum, string> = {
  Commande: 'Commande',
  Marque: 'Client',
  Plateforme: 'Plateforme',
  StockLibre: 'Stock libre',
}

// Niveau effectif selon la priorité Commande > Client > Plateforme > StockLibre.
// StockLibre = aucun niveau renseigné (reste exclusif des 3 autres par construction).
export function destinationEffectif(v: ScopeValues): DestinationEnum {
  if (v.commandeClientId != null) return 'Commande'
  if (v.clientId != null) return 'Marque'
  if (v.plateformeId != null) return 'Plateforme'
  return 'StockLibre'
}