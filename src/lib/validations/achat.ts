import { z } from 'zod'

export const achatSchema = z.object({
  fournisseurId: z.number().int().min(1, 'Fournisseur requis'),
  commandeClientId: z.number().int().nullable(),
  dateLivraisonPrevue: z.string().nullable(),
  devise: z.string().max(10).nullable(),
  conditionsPaiement: z.string().max(500).nullable(),
  notesAchat: z.string().max(1000).nullable(),
  creePar: z.string().max(100).nullable(),
})

export type AchatSchema = z.infer<typeof achatSchema>

export function toAchatPayload(data: AchatSchema) {
  return {
    ...data,
    commandeClientId: data.commandeClientId || null,
    dateLivraisonPrevue: data.dateLivraisonPrevue || null,
    devise: data.devise || null,
    conditionsPaiement: data.conditionsPaiement || null,
    notesAchat: data.notesAchat || null,
    creePar: data.creePar || null,
  }
}

export const ligneAchatSchema = z.object({
  articleId: z.number().int().min(1, 'Article requis'),
  quantite: z.number().min(0.01, 'La quantité doit être > 0'),
  prixUnitaire: z.number().min(0, 'Le prix doit être ≥ 0'),
  typeDestination: z.enum(['Commande', 'Marque', 'Plateforme', 'StockLibre']),
  commandeClientId: z.number().int().nullable(),
  clientId: z.number().int().nullable(),
  plateformeId: z.number().int().nullable(),
  couleur: z.string().max(50).nullable(),
  codeCouleur: z.string().max(50).nullable(),
  taille: z.string().max(50).nullable(),
  dimension: z.string().max(100).nullable(),
  devise: z.string().max(10).nullable(),
  descriptionSpecifique: z.string().max(500).nullable(),
  notes: z.string().max(1000).nullable(),
})
  .refine(
    (d) => d.typeDestination !== 'Commande' || d.commandeClientId != null,
    { message: 'Commande client requise pour destination Commande', path: ['commandeClientId'] }
  )
  .refine(
    (d) => d.typeDestination !== 'Marque' || d.clientId != null,
    { message: 'Client requis pour destination Marque', path: ['clientId'] }
  )
  .refine(
    (d) => d.typeDestination !== 'Plateforme' || d.plateformeId != null,
    { message: 'Plateforme requise pour destination Plateforme', path: ['plateformeId'] }
  )

export type LigneAchatSchema = z.infer<typeof ligneAchatSchema>

export function toLigneAchatPayload(data: LigneAchatSchema) {
  return {
    ...data,
    typeDestination: data.typeDestination,
    commandeClientId: data.commandeClientId || null,
    clientId: data.clientId || null,
    plateformeId: data.plateformeId || null,
    couleur: data.couleur || null,
    codeCouleur: data.codeCouleur || null,
    taille: data.taille || null,
    dimension: data.dimension || null,
    devise: data.devise || null,
    descriptionSpecifique: data.descriptionSpecifique || null,
    notes: data.notes || null,
  }
}
