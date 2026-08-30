'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Enum TypePaiement (backend, sérialisé en NOMBRES) :
// 0=Especes 1=Cheque 2=Virement 3=Autre
export const TYPE_PAIEMENT_LABELS: Record<number, string> = {
  0: 'Espèces',
  1: 'Chèque',
  2: 'Virement',
  3: 'Autre',
}

export const TYPE_PAIEMENT_VALUES: number[] = [0, 1, 2, 3]

interface TypePaiementSelectProps {
  value: number | null | undefined
  onChange: (value: number | null) => void
  placeholder?: string
  disabled?: boolean
}

export function TypePaiementSelect({
  value,
  onChange,
  placeholder,
  disabled,
}: TypePaiementSelectProps) {
  return (
    <Select
      value={value === null || value === undefined ? '' : String(value)}
      onValueChange={(v) => onChange(v === '' ? null : Number(v))}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder ?? 'Sélectionner un type de paiement…'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Non renseigné</SelectItem>
        {TYPE_PAIEMENT_VALUES.map((v) => (
          <SelectItem key={v} value={String(v)}>
            {TYPE_PAIEMENT_LABELS[v]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
