import { z } from 'zod'

const nullableStr = (max: number) => z.string().max(max).nullable()

export const articleSchema = z.object({
  designation: z.string().min(1, 'La désignation est requise').max(100),
  description: nullableStr(500),
  categorie: nullableStr(50),
  sousCategorie: nullableStr(50),
  unite: nullableStr(50),
  marque: nullableStr(100),
  reference: nullableStr(100),
  caracteristiques: nullableStr(1000),
  seuilAlerte: z.number().int().min(0, 'Minimum 0'),
  seuilCritique: z.number().int().min(0, 'Minimum 0'),
})

export type ArticleSchema = z.infer<typeof articleSchema>

export function toArticlePayload(data: ArticleSchema) {
  return {
    designation: data.designation.trim(),
    description: data.description?.trim() || null,
    categorie: data.categorie?.trim() || null,
    sousCategorie: data.sousCategorie?.trim() || null,
    unite: data.unite?.trim() || null,
    marque: data.marque?.trim() || null,
    reference: data.reference?.trim() || null,
    caracteristiques: data.caracteristiques?.trim() || null,
    seuilAlerte: data.seuilAlerte,
    seuilCritique: data.seuilCritique,
  }
}
