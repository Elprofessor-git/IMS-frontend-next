import { z } from 'zod'

const nullableStr = (max: number) => z.string().max(max).nullable()

export const clientSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100),
  prenom: nullableStr(100),
  nomEntreprise: nullableStr(150),
  // Backend n'a que [Required] sur Email, pas [EmailAddress], mais on valide côté frontend
  email: z.string().min(1, 'Email requis').max(100).email('Format email invalide'),
  telephone: nullableStr(20),
  adresse: nullableStr(500),
  ville: nullableStr(100),
  codePostal: nullableStr(20),
  pays: nullableStr(100),
  preferencesTissus: nullableStr(1000),
  notesHistorique: nullableStr(1000),
  // Converti depuis string (Select shadcn) via Controller → Number()
  plateformeId: z.number().int().min(1, 'Veuillez sélectionner une plateforme'),
})

export type ClientSchema = z.infer<typeof clientSchema>

/** Convertit les chaînes vides en null avant envoi à l'API */
export function toClientPayload(data: ClientSchema): ClientSchema {
  return {
    ...data,
    nom: data.nom.trim(),
    prenom: data.prenom?.trim() || null,
    nomEntreprise: data.nomEntreprise?.trim() || null,
    email: data.email.trim(),
    telephone: data.telephone?.trim() || null,
    adresse: data.adresse?.trim() || null,
    ville: data.ville?.trim() || null,
    codePostal: data.codePostal?.trim() || null,
    pays: data.pays?.trim() || null,
    preferencesTissus: data.preferencesTissus?.trim() || null,
    notesHistorique: data.notesHistorique?.trim() || null,
  }
}
