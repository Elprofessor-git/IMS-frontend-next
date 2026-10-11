import type { Metadata } from 'next'
import Link from 'next/link'
import {
  NOM_APPLICATION,
  CONTACT_EMAIL,
  ADRESSE_CONTACT,
} from '@/lib/site-info'

export const metadata: Metadata = {
  title: `À propos — ${NOM_APPLICATION}`,
}

export default function AProposPage() {
  return (
    <article className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {NOM_APPLICATION}
        </h1>
        <p>
          Le Système de Gestion Textile est un outil professionnel destiné à la
          gestion d&apos;un atelier de confection textile. Il sert au quotidien à
          suivre le stock et les articles, les achats, les importations, les
          commandes clients, la coupe et la production de l&apos;atelier.
        </p>
        <p>
          L&apos;application est réservée aux utilisateurs invités par un
          administrateur : elle n&apos;est ni un site marchand, ni un service
          public, ni accessible à l&apos;inscription libre.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Connexion Google (Gmail)
        </h2>
        <p>
          Pour certains utilisateurs, l&apos;application propose un espace
          « Courriels » permettant de retrouver et de traiter directement dans
          l&apos;outil les courriels liés à l&apos;activité de l&apos;atelier.
          Cet espace n&apos;est possible qu&apos;avec votre accord explicite.
        </p>
        <p>
          Lorsque vous connectez un compte Google, l&apos;application demande
          l&apos;autorisation de&nbsp;:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>lire</strong> vos messages (expéditeur, objet, corps) pour
            les afficher dans votre espace Courriels ;
          </li>
          <li>
            <strong>rédiger et envoyer</strong> des courriels en votre nom,
            uniquement lorsque vous validez l&apos;envoi ;
          </li>
          <li>
            <strong>connaître l&apos;adresse</strong> du compte connecté pour
            l&apos;afficher.
          </li>
        </ul>
        <p>
          Chaque action sur vos courriels (lecture, envoi, assistance à la
          rédaction) est initiée par vous, dans l&apos;interface. L&apos;accès
          peut être révoqué à tout moment depuis les paramètres du compte
          Google ou l&apos;application.
        </p>
      </section>

      <nav className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">Pour en savoir plus</p>
          <p className="text-sm text-muted-foreground">
            Consultez nos règles de confidentialité et nos conditions
            d&apos;utilisation avant d&apos;utiliser l&apos;application.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/confidentialite"
            className="rounded-lg bg-header px-4 py-2 text-sm font-medium text-header-foreground shadow-sm hover:opacity-90"
          >
            Règles de confidentialité
          </Link>
          <Link
            href="/conditions"
            className="rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted/40"
          >
            Conditions d&apos;utilisation
          </Link>
        </div>
      </nav>

      <p className="text-sm text-muted-foreground">
        Vous êtes déjà invité&nbsp;?{' '}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 hover:text-header"
        >
          Se connecter
        </Link>
      </p>

      {CONTACT_EMAIL.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Une question&nbsp;? {ADRESSE_CONTACT}
        </p>
      )}
    </article>
  )
}