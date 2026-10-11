import type { Metadata } from 'next'
import Link from 'next/link'
import { NOM_APPLICATION, ADRESSE_CONTACT } from '@/lib/site-info'

export const metadata: Metadata = {
  title: `Conditions d'utilisation — ${NOM_APPLICATION}`,
}

export default function ConditionsPage() {
  return (
    <article className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Conditions d&apos;utilisation
        </h1>
        <p>
          Les présentes conditions encadrent l&apos;utilisation de{' '}
          {NOM_APPLICATION}. Elles sont courtes car l&apos;application est un
          outil interne.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Objet</h2>
        <p>
          {NOM_APPLICATION} est un outil de gestion d&apos;atelier de confection
          textile&nbsp;: stock, achats, importations, commandes, coupe,
          production et courriels.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Accès</h2>
        <p>
          L&apos;accès se fait sur invitation d&apos;un administrateur de
          l&apos;application. Il est strictement limité aux personnes autorisées
          de l&apos;atelier et doit rester professionnel.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Responsabilité de l&apos;utilisateur
        </h2>
        <p>
          Vous êtes responsable des courriels envoyés depuis votre espace
          <em> Courriels</em>, y compris de ceux rédigés avec l&apos;aide de
          l&apos;intelligence artificielle&nbsp;: relisez-les avant envoi.
          Les données saisies et les comptes connectés n&apos;engagent que vous.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Disponibilité</h2>
        <p>
          L&apos;application est hébergée sur une infrastructure à usage
          gratuit&nbsp;: sa disponibilité n&apos;est pas garantie et des
          interruptions de service peuvent survenir sans préavis.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Contact</h2>
        <p>
          Pour toute question relative à ces conditions&nbsp;: {ADRESSE_CONTACT}
          . Consultez également nos{' '}
          <Link href="/confidentialite" className="underline underline-offset-4 hover:text-header">
            règles de confidentialité
          </Link>
          .
        </p>
      </section>
    </article>
  )
}