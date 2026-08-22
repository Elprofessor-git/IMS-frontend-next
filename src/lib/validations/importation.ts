import { z } from 'zod'
import { destinationEffectif, TYPE_DESTINATION } from './destination'

// Origine du SHIPMENT ENTIER (en-tête, jamais par ligne) : soit un fournisseur direct,
// soit une plateforme qui a groupé les commandes de plusieurs fournisseurs et nous envoie
// tout en un seul envoi. Exclusif : au plus un des deux est renseigné — imposé par l'UI
// (choisir l'un vide l'autre), le backend refuse aussi si les deux sont fournis.
// (Pas de `.refine()` ici : ce schema est `.extend()` avec les lignes à la création, et
// `.refine()` renverrait un ZodEffects qui n'a plus `.extend()`.)
export const importationSchema = z.object({
  fournisseurId: z.number().int().min(0).nullable(),
  plateformeId: z.number().int().min(0).nullable(),
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
    plateformeId: data.plateformeId || null,
    dateReceptionPrevue: data.dateReceptionPrevue || null,
    devise: data.devise || null,
    notesImportation: data.notesImportation || null,
    creePar: data.creePar || null,
  }
}

// LigneImportation n'a PAS de champ taille (contrairement à LigneAchat) ni de champ
// origine : l'origine est portée par l'importation (en-tête), la ligne ne porte que la
// DESTINATION (qui entre dans le calcul BOM/besoins).
export const ligneImportationSchema = z.object({
  articleId: z.number().int().min(1, 'Article requis'),
  quantite: z.number().min(0.01, 'La quantité doit être > 0'),
  prixUnitaire: z.number().min(0, 'Le prix doit être ≥ 0'),
  commandeClientId: z.number().int().nullable(),
  clientId: z.number().int().nullable(),
  plateformeId: z.number().int().nullable(),
  designation: z.string().max(200).nullable(),
  couleur: z.string().max(50).nullable(),
  codeCouleur: z.string().max(50).nullable(),
  dimension: z.string().max(100).nullable(),
  nature: z.string().max(100).nullable(),
  unite: z.string().max(50).nullable(),
  devise: z.string().max(10).nullable(),
  notes: z.string().max(1000).nullable(),
})

export type LigneImportationSchema = z.infer<typeof ligneImportationSchema>

// Enum backend : TypeDestinationImportation (Commande=0, Marque=1, Plateforme=2, StockLibre=3).
// L'API sérialise les enums en NOMBRES → conversion ici, à la limite API.
export function toLigneImportationPayload(data: LigneImportationSchema) {
  return {
    ...data,
    typeDestination: TYPE_DESTINATION[destinationEffectif(data)],
    commandeClientId: data.commandeClientId || null,
    clientId: data.clientId || null,
    plateformeId: data.plateformeId || null,
    designation: data.designation || null,
    couleur: data.couleur || null,
    codeCouleur: data.codeCouleur || null,
    dimension: data.dimension || null,
    nature: data.nature || null,
    unite: data.unite || null,
    devise: data.devise || null,
    notes: data.notes || null,
  }
}
