'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LoaderCircle, PackageSearch, Shirt } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ouvrirPartagePublic, PartageErreur } from '@/hooks/use-partage'
import type { PartagePublic } from '@/types/partage'

type Etat =
  | { phase: 'chargement' }
  | { phase: 'erreur'; message: string }
  | { phase: 'ok'; data: PartagePublic }

function lireTokenDepuisFragment(): string | null {
  // Le token est dans le FRAGMENT (#…) : il n'est jamais envoyé au serveur ni
  // inscrit dans les journaux d'accès. On le lit une fois puis on purge l'URL.
  const brut = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  if (!brut) return null
  // Nettoie un éventuel encodage de fragment sans altérer le base64url (-, _).
  try {
    return decodeURIComponent(brut)
  } catch {
    return brut
  }
}

export default function PartagePublicPage() {
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' })
  const dejaTente = useRef(false)

  useEffect(() => {
    if (dejaTente.current) return
    dejaTente.current = true

    const token = lireTokenDepuisFragment()
    // Purge le fragment AVANT tout rendu partageable : un copier-coller de l'URL
    // ou une capture d'historique ne doit pas redivulguer un lien déjà consulté.
    window.history.replaceState(null, '', window.location.pathname)

    if (!token) {
      setEtat({ phase: 'erreur', message: 'Aucun lien de partage fourni.' })
      return
    }

    ouvrirPartagePublic(token)
      .then((data) => {
        document.title = data.label
          ? `${data.label} — Partage`
          : `Partage — ${data.scopeLibelle}`
        setEtat({ phase: 'ok', data })
      })
      .catch((err: unknown) => {
        const message =
          err instanceof PartageErreur
            ? err.message
            : "Impossible d'ouvrir ce lien."
        setEtat({ phase: 'erreur', message })
      })
  }, [])

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-header text-header-foreground shadow-md">
            <Shirt className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Partage en lecture seule</h1>
            {etat.phase === 'ok' && (
              <p className="text-sm text-muted-foreground">
                {etat.data.label ? `${etat.data.label} · ` : ''}
                {etat.data.scopeLibelle}
              </p>
            )}
          </div>
        </header>

        {etat.phase === 'chargement' && (
          <div className="flex items-center justify-center gap-2 rounded-xl border bg-card p-12 text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Chargement…
          </div>
        )}

        {etat.phase === 'erreur' && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center text-destructive"
          >
            <PackageSearch className="mx-auto mb-3 size-8" />
            <p className="font-medium">Lien indisponible</p>
            <p className="mt-1 text-sm">{etat.message}</p>
          </div>
        )}

        {etat.phase === 'ok' && <ContenuPartage data={etat.data} />}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>
}

function ContenuPartage({ data }: { data: PartagePublic }) {
  const sections = data.sections ?? []
  if (sections.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Ce lien ne partage aucune section.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {data.stock != null && (
        <section>
          <SectionTitle>Stock</SectionTitle>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Couleur</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Réservée</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.stock.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Aucune ligne de stock.
                    </TableCell>
                  </TableRow>
                )}
                {data.stock.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.articleDesignation ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{s.articleReference ?? '—'}</TableCell>
                    <TableCell>{s.couleur ?? '—'}</TableCell>
                    <TableCell>{s.taille ?? '—'}</TableCell>
                    <TableCell>{s.emplacementPhysique ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.quantite}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.quantiteReservee}</TableCell>
                    <TableCell>{s.typeStock}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {data.commandes != null && (
        <section>
          <SectionTitle>Commandes</SectionTitle>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Livraison souhaitée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.commandes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Aucune commande.
                    </TableCell>
                  </TableRow>
                )}
                {data.commandes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.numeroCommande}</TableCell>
                    <TableCell>{c.titreCommande ?? '—'}</TableCell>
                    <TableCell>{c.clientNom ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.statut}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.dateLivraisonSouhaitee
                        ? new Date(c.dateLivraisonSouhaitee).toLocaleDateString('fr-FR')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {data.importations != null && (
        <section>
          <SectionTitle>Importations</SectionTitle>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Couleur</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Reçue</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.importations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Aucune ligne d&apos;importation.
                    </TableCell>
                  </TableRow>
                )}
                {data.importations.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono">{i.referenceImportation}</TableCell>
                    <TableCell className="font-medium">{i.articleDesignation ?? '—'}</TableCell>
                    <TableCell>{i.designation ?? '—'}</TableCell>
                    <TableCell>{i.couleur ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.quantite}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.quantiteRecue}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{i.statut}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Données au {new Date(data.donneesAu).toLocaleString('fr-FR')} — lien en lecture seule.
      </p>
    </div>
  )
}
