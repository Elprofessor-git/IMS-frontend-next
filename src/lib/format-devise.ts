export function formatMontant(montant: number, devise?: string | null): string {
  const n = Number(montant ?? 0)
  const valeur = n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (devise === 'TND') return `${valeur} TND`
  if (devise === 'EUR') return `${valeur} €`
  return valeur
}
