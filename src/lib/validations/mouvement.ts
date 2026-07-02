import { z } from 'zod'

export const mouvementSchema = z.object({
  stockId: z.number().int().min(1, 'Article / stock requis'),
  typeMouvement: z.number().int().min(0).max(5),
  origineMouvement: z.number().int().min(0).max(7),
  // Ajustement = quantité finale souhaitée ; autres types = delta
  quantite: z.number().min(0, 'La quantité doit être ≥ 0'),
  motif: z.string().max(500).nullable(),
  numeroReference: z.string().max(100).nullable(),
  emplacementSource: z.string().max(200).nullable(),
  emplacementDestination: z.string().max(200).nullable(),
  effectuePar: z.string().min(1, 'Champ requis').max(100),
})

export type MouvementSchema = z.infer<typeof mouvementSchema>

export function toMouvementPayload(data: MouvementSchema) {
  return {
    ...data,
    motif: data.motif || null,
    numeroReference: data.numeroReference || null,
    emplacementSource: data.emplacementSource || null,
    emplacementDestination: data.emplacementDestination || null,
  }
}

export const transfertSchema = z.object({
  stockSourceId: z.number().int().min(1, 'Stock source requis'),
  stockDestinationId: z.number().int().min(1, 'Stock destination requis'),
  quantite: z.number().min(0.01, 'La quantité doit être > 0'),
  motif: z.string().min(1, 'Motif requis').max(500),
  effectuePar: z.string().min(1, 'Champ requis').max(100),
})

export type TransfertSchema = z.infer<typeof transfertSchema>
