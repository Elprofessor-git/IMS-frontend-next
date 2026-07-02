import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-muted-foreground/30">404</p>
      <h2 className="text-xl font-semibold">Page introuvable</h2>
      <p className="text-sm text-muted-foreground">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Retour au dashboard</Link>
      </Button>
    </div>
  )
}
