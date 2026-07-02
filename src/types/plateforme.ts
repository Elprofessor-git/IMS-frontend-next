export type Plateforme = {
  id: number
  nom: string
  description: string | null
  siteWeb: string | null
  contactEmail: string | null
  telephone: string | null
  dateCreation: string
  estActif: boolean
  // Inclus uniquement en GET liste/détail (IgnoreCycles brise la ref circulaire côté clients)
  clients: PlateformeClientSummary[]
  marques: never[]
}

// Sous-objet Client tel qu'il apparaît dans la réponse Plateforme
export type PlateformeClientSummary = {
  id: number
  nom: string
  prenom: string | null
  email: string
  estActif: boolean
  plateformeId: number
  plateforme: null // cycle brisé par IgnoreCycles
}

export type PlateformeFormData = {
  nom: string
  description: string | null
  siteWeb: string | null
  contactEmail: string | null
  telephone: string | null
}
