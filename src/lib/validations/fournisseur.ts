import { z } from 'zod'

const nullableStr = (max: number) => z.string().max(max).nullable()

export const fournisseurSchema = z.object({
  nomEntreprise: z.string().min(1, 'Le nom est requis').max(150),
  personneContact: nullableStr(100),
  email: z.string().min(1, 'Email requis').max(100).email('Format email invalide'),
  telephone: nullableStr(20),
  adresse: nullableStr(500),
  ville: nullableStr(100),
  codePostal: nullableStr(20),
  pays: nullableStr(100),
  specialitesProduits: nullableStr(1000),
  conditionsPaiement: nullableStr(500),
  // valueAsNumber dans register() convertit la string HTML en number
  delaiLivraisonJours: z.number().int().min(0, 'Délai minimum 0 jours'),
  notesContrat: nullableStr(1000),
})

export type FournisseurSchema = z.infer<typeof fournisseurSchema>

export function toFournisseurPayload(data: FournisseurSchema): FournisseurSchema {
  return {
    ...data,
    nomEntreprise: data.nomEntreprise.trim(),
    personneContact: data.personneContact?.trim() || null,
    email: data.email.trim(),
    telephone: data.telephone?.trim() || null,
    adresse: data.adresse?.trim() || null,
    ville: data.ville?.trim() || null,
    codePostal: data.codePostal?.trim() || null,
    pays: data.pays?.trim() || null,
    specialitesProduits: data.specialitesProduits?.trim() || null,
    conditionsPaiement: data.conditionsPaiement?.trim() || null,
    notesContrat: data.notesContrat?.trim() || null,
  }
}
