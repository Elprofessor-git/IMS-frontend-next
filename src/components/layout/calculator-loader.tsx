'use client'

import dynamic from 'next/dynamic'

const CalculatorWidget = dynamic(
  () => import('@/components/layout/calculator-widget').then((m) => m.CalculatorWidget),
  { ssr: false },
)

export function CalculatorLoader() {
  return <CalculatorWidget />
}
