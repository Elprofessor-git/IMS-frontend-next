import { z } from 'zod'

export const commandeSchema = z.object({
  clientId: z.number().int().min(1, 'Client requis'),
  marqueId: z.number().int().nullable(),
  titreCommande: z.string().max(200).nullable(),
  descriptionCommande: z.string().max(1000).nullable(),
  dateLivraisonSouhaitee: z.string().nullable(),
  devise: z.string().max(10).nullable(),
  notesSpeciales: z.string().max(1000).nullable(),
  specificationsClient: z.string().max(1000).nullable(),
  creePar: z.string().max(100).nullable(),
})

export type CommandeSchema = z.infer<typeof commandeSchema>

export function toCommandePayload(data: CommandeSchema) {
  return {
    ...data,
    marqueId: data.marqueId || null,
    titreCommande: data.titreCommande || null,
    descriptionCommande: data.descriptionCommande || null,
    dateLivraisonSouhaitee: data.dateLivraisonSouhaitee || null,
    devise: data.devise || null,
    notesSpeciales: data.notesSpeciales || null,
    specificationsClient: data.specificationsClient || null,
    creePar: data.creePar || null,
  }
}

// POST /Tailles — remplace TOUT — tableau de { taille, quantite }
export const tailleItemSchema = z.object({
  taille: z.string().min(1, 'Taille requise').max(50),
  quantite: z.number().int().min(1, 'Quantité ≥ 1'),
})

export const taillesSchema = z.array(tailleItemSchema)

export type TailleItem = z.infer<typeof tailleItemSchema>

// POST /Bom — remplace TOUT — tableau de { articleId, quantiteParPiece, unite? }
export const bomItemSchema = z.object({
  articleId: z.number().int().min(1, 'Article requis'),
  quantiteParPiece: z.number().min(0.001, 'Quantité > 0'),
  unite: z.string().max(50).nullable(),
})

export const bomSchema = z.array(bomItemSchema)

export type BomItem = z.infer<typeof bomItemSchema>

// POST /Besoins — un par un
export const besoinSchema = z.object({
  articleId: z.number().int().min(1, 'Article requis'),
  typeBesoin: z.number().int().min(0).max(3),
  quantiteUnitaire: z.number().min(0.001, 'Quantité unitaire > 0'),
  nombrePieces: z.number().int().min(1, 'Nombre de pièces ≥ 1'),
  couleur: z.string().max(50).nullable(),
  taille: z.string().max(50).nullable(),
  dimension: z.string().max(100).nullable(),
  notes: z.string().max(1000).nullable(),
})

export type BesoinSchema = z.infer<typeof besoinSchema>

export function toBesoinPayload(data: BesoinSchema) {
  return {
    ...data,
    couleur: data.couleur || null,
    taille: data.taille || null,
    dimension: data.dimension || null,
    notes: data.notes || null,
  }
}

// POST /Calculer — marge de sécurité (0-20%)
// ⚠️ NE s'applique PAS à ValiderRessources — uniquement au calcul BOM
export const calculerSchema = z.object({
  margeAppliquee: z.number().min(0, 'Marge ≥ 0%').max(20, 'Marge ≤ 20%'),
})

export type CalculerSchema = z.infer<typeof calculerSchema>
