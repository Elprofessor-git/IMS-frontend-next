export const NOM_APPLICATION = 'Système de Gestion Textile (SGT)'

export const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '').trim()

export const ADRESSE_CONTACT =
  CONTACT_EMAIL.length > 0 ? CONTACT_EMAIL : '[adresse de contact à renseigner]'

export const DATE_DERNIERE_MISE_A_JOUR_CONFIDENTIALITE = '11 octobre 2026'