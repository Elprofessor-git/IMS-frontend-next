'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetDevises } from '@/hooks/use-devises'
import type { Devise } from '@/types/Devise'

export function deviseLabel(d: Devise): string {
  return d.symbole ? `${d.code} (${d.symbole})` : d.code
}

interface DeviseSelectProps {
  value: string | null | undefined
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function DeviseSelect({ value, onChange, placeholder, disabled }: DeviseSelectProps) {
  const { data: devises } = useGetDevises()

  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder ?? 'Sélectionner une devise…'} />
      </SelectTrigger>
      <SelectContent>
        {(devises ?? []).map((d) => (
          <SelectItem key={d.code} value={d.code}>
            {deviseLabel(d)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
