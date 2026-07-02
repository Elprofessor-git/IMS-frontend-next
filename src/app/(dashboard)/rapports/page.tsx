import Link from 'next/link'
import { BarChart3, ShoppingCart } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'

const CARDS = [
  {
    href: '/rapports/achats',
    icon: ShoppingCart,
    title: "Rapport d'achats",
    description: 'Analyse des achats par fournisseur, statut, marque et plateforme.',
  },
  {
    href: '/rapports/analytics',
    icon: BarChart3,
    title: 'Analytics',
    description: 'Indicateurs globaux de performance et tendances du stock.',
  },
]

export default function RapportsHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Rapports" />
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="h-full cursor-pointer transition-colors hover:bg-accent">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
