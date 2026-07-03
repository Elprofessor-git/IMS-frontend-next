import { z } from 'zod'

export const importationSchema = z.object({
  fournisseurId: z.number().int().min(0).nullable(),
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
    fournisseurId: data.fournisseurId || null,
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
  typeOrigine: z.enum(['Fournisseur', 'ClientCMT']),
  typeDestination: z.enum(['Commande', 'Marque', 'Plateforme', 'StockLibre']),
  commandeClientId: z.number().int().nullable(),
  clientId: z.number().int().nullable(),
  plateformeId: z.number().int().nullable(),
  designation: z.string().max(200).nullable(),
  couleur: z.string().max(50).nullable(),
  codeCouleur: z.string().max(50).nullable(),
  dimension: z.string().max(100).nullable(),
  nature: z.string().max(100).nullable(),
  devise: z.string().max(10).nullable(),
  notes: z.string().max(1000).nullable(),
})
  .refine(
    (d) => d.typeOrigine !== 'ClientCMT' || d.commandeClientId != null,
    { message: 'Commande client requise pour une ligne CMT', path: ['commandeClientId'] }
  )
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

export type LigneImportationSchema = z.infer<typeof ligneImportationSchema>

export function toLigneImportationPayload(data: LigneImportationSchema) {
  return {
    ...data,
    typeOrigine: data.typeOrigine,
    typeDestination: data.typeDestination,
    commandeClientId: data.commandeClientId || null,
    clientId: data.clientId || null,
    plateformeId: data.plateformeId || null,
    designation: data.designation || null,
    couleur: data.couleur || null,
    codeCouleur: data.codeCouleur || null,
    dimension: data.dimension || null,
    nature: data.nature || null,
    devise: data.devise || null,
    notes: data.notes || null,
  }
}
