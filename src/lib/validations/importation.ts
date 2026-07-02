import { z } from 'zod'

export const importationSchema = z.object({
  fournisseurId: z.number().int().min(1, 'Fournisseur requis'),
  dateReceptionPrevue: z.string().nullable(),
  modeExpedition: z.number().int().min(0).max(4),
  devise: z.string().max(10).nullable(),
  notesImportation: z.string().max(1000).nullable(),
  creePar: z.string().max(100).nullable(),
})

export type ImportationSchema = z.infer<typeof importationSchema>

export function toImportationPayload(data: ImportationSchema) {
  return {
    ...data,
    dateReceptionPrevue: data.dateReceptionPrevue || null,
    devise: data.devise || null,
    notesImportation: data.notesImportation || null,
    creePar: data.creePar || null,
  }
}

// LigneImportation n'a PAS de champ taille (contrairement à LigneAchat)
export const ligneImportationSchema = z.object({
  articleId: z.number().int().min(1, 'Article requis'),
  quantite: z.number().min(0.01, 'La quantité doit être > 0'),
  prixUnitaire: z.number().min(0, 'Le prix doit être ≥ 0'),
  commandeClientId: z.number().int().nullable(),
  designation: z.string().max(200).nullable(),
  couleur: z.string().max(50).nullable(),
  codeCouleur: z.string().max(50).nullable(),
  dimension: z.string().max(100).nullable(),
  nature: z.string().max(100).nullable(),
  devise: z.string().max(10).nullable(),
  notes: z.string().max(1000).nullable(),
})

export type LigneImportationSchema = z.infer<typeof ligneImportationSchema>

export function toLigneImportationPayload(data: LigneImportationSchema) {
  return {
    ...data,
    commandeClientId: data.commandeClientId || null,
    designation: data.designation || null,
    couleur: data.couleur || null,
    codeCouleur: data.codeCouleur || null,
    dimension: data.dimension || null,
    nature: data.nature || null,
    devise: data.devise || null,
    notes: data.notes || null,
  }
}
