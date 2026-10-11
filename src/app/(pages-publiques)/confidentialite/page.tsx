import type { Metadata } from 'next'
import Link from 'next/link'
import {
  NOM_APPLICATION,
  CONTACT_EMAIL,
  ADRESSE_CONTACT,
  DATE_DERNIERE_MISE_A_JOUR_CONFIDENTIALITE,
} from '@/lib/site-info'

export const metadata: Metadata = {
  title: `Règles de confidentialité — ${NOM_APPLICATION}`,
}

const ContactDisplay = () =>
  CONTACT_EMAIL.length > 0 ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4 hover:text-header">
      {CONTACT_EMAIL}
    </a>
  ) : (
    <span>{ADRESSE_CONTACT}</span>
  )

export default function ConfidentialitePage() {
  return (
    <article className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Règles de confidentialité
        </h1>
        <p>
          Cette page décrit, pour {NOM_APPLICATION}, les données traitées, leur
          usage, leur hébergement et la façon de les supprimer. Elle ne décrit
          que ce que l&apos;application fait réellement.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Responsable du traitement et contact
        </h2>
        <p>
          Le responsable du traitement est l&apos;équipe qui exploite
          l&apos;instance de {NOM_APPLICATION} à laquelle vous accédez. Pour
          toute question, demande d&apos;information ou de suppression, écrivez
          à&nbsp;: <ContactDisplay />
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Données Google traitées
        </h2>
        <p>
          L&apos;espace « Courriels » de l&apos;application fonctionne avec
          l&apos;API Gmail, uniquement après que vous avez connecté votre compte
          et donné votre accord. Les autorisations réellement demandées sont
          les suivantes&nbsp;:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Lecture des messages</strong> (gmail.readonly)&nbsp;: liste,
            métadonnées (expéditeur, destinataires, objet, date) et corps des
            courriels de votre boîte, synchronisés dans la base de
            l&apos;application pour être affichés dans votre espace Courriels.
          </li>
          <li>
            <strong>Rédaction et envoi</strong> (gmail.compose)&nbsp;:
            enregistrement de brouillons et envoi de courriels, uniquement
            lorsque vous le déclenchez.
          </li>
          <li>
            <strong>Adresse du compte</strong> (userinfo.email)&nbsp;:
            identification de l&apos;adresse du compte connecté, affichée dans
            l&apos;interface.
          </li>
        </ul>
        <p>
          Les pièces jointes ne sont pas stockées&nbsp;: seul leur nom et leur
          type sont enregistrés, et leur contenu est relu depuis Gmail moment
          par moment lorsque vous ouvrez le message.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Autres données
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Compte</strong>&nbsp;: adresse e-mail, nom, rôle et
            permissions de votre profil utilisateur au sein de l&apos;atelier.
          </li>
          <li>
            <strong>Journaux techniques</strong> (logs serveur)&nbsp;: adresse
            IP, pages consultées, erreurs, utilisés pour la sécurité et le
            dépannage.
          </li>
          <li>
            <strong>Session</strong>&nbsp;: un cookie de session non accessible
            au JavaScript (httpOnly) conserve votre authentification.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Stockage et sécurité
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Votre <strong>jeton de rafraîchissement</strong> Gmail est chiffré
            (chiffrement AES-GCM, clé distincte gérée par l&apos;exploitant)
            avant stockage en base de données.
          </li>
          <li>
            Les échanges se font en <strong>HTTPS</strong>.
          </li>
          <li>
            Le cookie de session est <strong>httpOnly</strong> et n&apos;est
            jamais accessible au code exécuté dans le navigateur.
          </li>
          <li>
            Hébergement&nbsp;: l&apos;interface est servie par Vercel, l&apos;API
            (backend) par Render, et la base de données PostgreSQL est hébergée
            sur Neon.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Traitement par l&apos;intelligence artificielle (Groq)
        </h2>
        <p>
          L&apos;application propose des actions d&apos;assistance à la
          rédaction reposant sur un service IA externe (Groq). Chacune doit
          être déclenchée explicitement par vous. Selon l&apos;action
          choisie&nbsp;:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Analyse</strong> (suggestion de tâche)&nbsp;: l&apos;expéditeur,
            l&apos;objet et le corps du message sont envoyés au service IA pour
            décider si le courriel appelle une action.
          </li>
          <li>
            <strong>Rédaction d&apos;une réponse</strong> ou d&apos;une note de
            transfert&nbsp;: l&apos;expéditeur, l&apos;objet et le corps du
            message sont envoyés, ainsi que votre consigne éventuelle.
          </li>
          <li>
            <strong>Reformulation ou traduction</strong> d&apos;un brouillon&nbsp;:
            seul le texte que vous avez saisi est envoyé, avec la langue ou la
            consigne demandée — aucun courriel ne sort alors de votre
            application.
          </li>
        </ul>
        <p>
          Une réponse générée n&apos;est jamais envoyée sans votre validation.
          Les propositions et leurs versions envoyées sont conservées dans
          l&apos;historique du message.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Aucune vente, aucun partage publicitaire
        </h2>
        <p>
          Vos données ne sont ni vendues, ni partagées à des fins publicitaires,
          ni utilisées pour du profilage hors de l&apos;application.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Conservation et suppression
        </h2>
        <p>
          Les données (messages synchronisés, connexions, propositions IA) sont
          conservées tant que votre compte reste actif. Deux mécanismes vous
          permettent de les retirer&nbsp;:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Déconnexion</strong>&nbsp;: le bouton « Déconnecter » de
            l&apos;espace Courriels révoque l&apos;accès de l&apos;application
            auprès de Google et arrête toute utilisation de ce compte.
          </li>
          <li>
            <strong>Suppression des données</strong>&nbsp;: écrivez à{' '}
            <ContactDisplay /> en précisant les comptes ou données concernés
            pour que la suppression soit effectuée.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Révoquer l&apos;accès et demander la suppression
        </h2>
        <p>
          À tout moment, vous pouvez révoquer l&apos;autorisation donnée à
          l&apos;application sur votre compte Google depuis{' '}
          <a
            href="https://myaccount.google.com/permissions"
            className="underline underline-offset-4 hover:text-header"
          >
            myaccount.google.com/permissions
          </a>
          . Cet accès est également révocable depuis le bouton « Déconnecter »
          de l&apos;application.
        </p>
        <p>
          Pour la suppression des données déjà traitées par l&apos;application
          (messages synchronisés, historiques), adressez votre demande à{' '}
          <ContactDisplay />.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-xl font-semibold tracking-tight">
          Exigences d&apos;utilisation limitée (Google)
        </h2>
        <p>
          L&apos;utilisation et le transfert des informations reçues des API
          Google respectent la{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="underline underline-offset-4 hover:text-header"
          >
            Google API Services User Data Policy
          </a>
          , y compris les <strong>exigences d&apos;utilisation limitée</strong>&nbsp;:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            les données Google (messages, adresses, brouillons) ne servent
            qu&apos;à fournir les fonctions visibles par l&apos;utilisateur,
            c&apos;est-à-dire celles décrites ci-dessus&nbsp;;
          </li>
          <li>
            elles ne servent pas à entraîner des modèles d&apos;IA généralistes&nbsp;;
          </li>
          <li>
            aucune lecture humaine du contenu des courriels n&apos;a lieu, hors
            consentement explicite de l&apos;utilisateur, nécessité de sécurité
            ou obligation légale.
          </li>
        </ul>
        <p>
          Précisément, le contenu d&apos;un courriel n&apos;est transmis au
          service IA externe que lorsque vous déclenchez vous-même une action
          d&apos;assistance, et uniquement pour produire le texte demandé.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Contact et mise à jour</h2>
        <p>
          Pour toute question sur ces règles ou sur vos données&nbsp;:{' '}
          <ContactDisplay />.
        </p>
        <p className="text-sm text-muted-foreground">
          Dernière mise à jour&nbsp;: {DATE_DERNIERE_MISE_A_JOUR_CONFIDENTIALITE}
        </p>
        <p className="text-sm text-muted-foreground">
          Retour à la page <Link href="/a-propos" className="underline underline-offset-4">À propos</Link>.
        </p>
      </section>
    </article>
  )
}