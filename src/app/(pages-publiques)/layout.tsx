import Link from 'next/link'
import { Shirt } from 'lucide-react'
import { NOM_APPLICATION } from '@/lib/site-info'

export default function PagesPubliquesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
          <Link
            href="/a-propos"
            className="flex min-w-0 items-center gap-2 text-sm font-bold tracking-tight sm:text-base"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-header text-header-foreground shadow-sm">
              <Shirt className="size-4" />
            </span>
            <span className="min-w-0 truncate">{NOM_APPLICATION}</span>
          </Link>
          <Link
            href="/login"
            className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground sm:text-sm"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
        {children}
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <span>{NOM_APPLICATION} — outil interne</span>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/a-propos" className="underline underline-offset-4 hover:text-foreground">
              À propos
            </Link>
            <Link
              href="/confidentialite"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Confidentialité
            </Link>
            <Link href="/conditions" className="underline underline-offset-4 hover:text-foreground">
              Conditions d&apos;utilisation
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}