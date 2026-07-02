import { z } from 'zod'

export const achatSchema = z.object({
  fournisseurId: z.number().int().min(1, 'Fournisseur requis'),
  commandeClientId: z.number().int().min(1, 'Commande client requise'),
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
  couleur: z.string().max(50).nullable(),
  codeCouleur: z.string().max(50).nullable(),
  taille: z.string().max(50).nullable(),
  dimension: z.string().max(100).nullable(),
  devise: z.string().max(10).nullable(),
  descriptionSpecifique: z.string().max(500).nullable(),
  notes: z.string().max(1000).nullable(),
})

export type LigneAchatSchema = z.infer<typeof ligneAchatSchema>

export function toLigneAchatPayload(data: LigneAchatSchema) {
  return {
    ...data,
    couleur: data.couleur || null,
    codeCouleur: data.codeCouleur || null,
    taille: data.taille || null,
    dimension: data.dimension || null,
    devise: data.devise || null,
    descriptionSpecifique: data.descriptionSpecifique || null,
    notes: data.notes || null,
  }
}
