'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, Quote, Send, Sparkles, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AttachmentBadge,
  AttachmentPicker,
  attachmentsSize,
} from '@/components/courriels/attachment-picker'
import {
  useComposeEmail,
  useComposePrefill,
  useEditDraft,
  useGenerateReply,
  type ComposeAttachment,
} from '@/hooks/use-gmail'
import { useCanWrite } from '@/hooks/use-permissions'
import {
  COMPOSE_MODE_LABELS,
  MAX_ATTACHMENT_BYTES,
  TRANSLATE_LANGUAGES,
  type ComposeMode,
} from '@/types/gmail'
import { toast } from 'sonner'

/** Découpe une saisie « a@x.fr, b@y.fr » en adresses. */
function splitAddresses(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0)
}

function joinAddresses(list: string[]): string {
  return list.join(', ')
}

type ModeAction = { key: ComposeMode; label: string }

/**
 * Composeur unique des quatre modes : nouveau message, répondre, répondre à tous,
 * transférer.
 *
 * Trois règles structurent ce composant, et chacune existe pour une raison concrète :
 *
 * 1. AUCUNE action n'appartient à un mode. La barre d'outils est identique partout ; seul
 *    « Générer par IA » change de nature, puisqu'il reçoit le fil en contexte hors mode
 *    « nouveau ». Une action qui n'existe que dans un mode oblige l'utilisateur à changer
 *    d'écran pour écrire, et disperse la règle « le texte affiché est envoyé ».
 *
 * 2. LA CITATION EST HORS DU CHAMP. Le serveur la renvoie à part (`quotedText`) et il la
 *    reconstruit à l'envoi. Elle n'entre jamais dans la zone éditable : sinon « Reformuler »
 *    ou « Traduire » réécriraient l'interlocuteur au lieu du message. C'est une garantie
 *    structurelle, pas une précaution d'interface.
 *
 * 3. L'IA N'ENVOIE JAMAIS SEULE. Elle propose un texte ; seul « Envoyer » expédie, et il
 *    expédie ce qui est affiché. Chaque action IA empile l'état précédent : « Annuler »
 *    revient en arrière, y compris pour une génération.
 */
export function MessageComposer({
  mode,
  replyToMessageId = null,
  aiAvailable = true,
  onSent,
  onCancel,
  onModeChange,
  availableModes = ['Reply', 'ReplyAll', 'Forward'],
}: {
  mode: ComposeMode
  /** Message de référence IMS ; obligatoire hors mode « nouveau ». */
  replyToMessageId?: number | null
  aiAvailable?: boolean
  onSent?: () => void
  onCancel?: () => void
  /** Changement de mode depuis la barre d'actions (Répondre / Répondre à tous / Transférer). */
  onModeChange?: (mode: ComposeMode) => void
  /** Modes proposés dans la barre. Vide pour un composeur déjà fixé à un mode. */
  availableModes?: readonly ComposeMode[]
}) {
  const compose = useComposeEmail()
  const editDraft = useEditDraft()
  const generate = useGenerateReply(replyToMessageId ?? 0)
  const canWrite = useCanWrite('courriels')
  const prefill = useComposePrefill(mode === 'New' ? null : replyToMessageId, mode)

  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [quotedText, setQuotedText] = useState('')
  const [instruction, setInstruction] = useState('')
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([])
  const [aiReplyId, setAiReplyId] = useState<number | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  // Historique d'annulation : seul le texte est empilé, car c'est le seul champ qu'une
  // action IA réécrit. La borne évite qu'une longue session occupe une mémoire inutile.
  const historique = useRef<string[]>([])
  const [peutAnnuler, setPeutAnnuler] = useState(false)

  const pushHistorique = useCallback(() => {
    historique.current = [...historique.current.slice(-19), body]
    setPeutAnnuler(historique.current.length > 0)
  }, [body])

  const appliquerTexte = useCallback(
    (suite: string) => {
      setBody(suite)
      setErreur(null)
    },
    [],
  )

  // Préremplissage : appliqué une seule fois par (mode, message). Le suivi continu ne suffit pas à
  // suivre `data` en continu, sinon la saisie de l'utilisateur serait écrasée à chaque
  // rendu que React Query déclenche.
  const clePrefill = `${mode}:${replyToMessageId ?? 0}`
  const cleAppliquee = useRef<string | null>(null)
  useEffect(() => {
    if (!prefill.data) return
    if (cleAppliquee.current === clePrefill) return
    cleAppliquee.current = clePrefill
    setTo(joinAddresses(prefill.data.to ?? []))
    setCc(joinAddresses(prefill.data.cc ?? []))
    setSubject(prefill.data.subject ?? '')
    setQuotedText(prefill.data.quotedText ?? '')
    setBody(prefill.data.bodyText ?? '')
    setAiReplyId(prefill.data.aiReplyId ?? null)
    historique.current = []
    setPeutAnnuler(false)
  }, [prefill.data, clePrefill])

  // Changement de mode ou de message : on repart d'un composeur vierge, sinon les
  // destinataires du fil précédent resteraient affichés dans le nouveau.
  useEffect(() => {
    setTo('')
    setCc('')
    setSubject('')
    setBody('')
    setQuotedText('')
    setAiReplyId(null)
    historique.current = []
    setPeutAnnuler(false)
    setErreur(null)
    cleAppliquee.current = null
  }, [clePrefill])

  const occupe = compose.isPending || editDraft.isPending || generate.isPending

  // ── Actions IA ────────────────────────────────────────────────────────────
  // Chacune empile l'état précédent AVANT d'appeler le modèle : si l'appel échoue, le
  // texte est déjà empilé dans l'historique, donc « Annuler » reste disponible et rien
  // n'est perdu. Le texte saisi n'est jamais effacé par une erreur.
  const lancerEdition = (action: 'Rewrite' | 'Translate', targetLanguage?: string) => {
    pushHistorique()
    setErreur(null)
    editDraft.mutate(
      {
        text: body,
        action,
        instruction: action === 'Rewrite' ? instruction.trim() || null : null,
        targetLanguage: targetLanguage ?? null,
      },
      {
        onSuccess: (result) => {
          appliquerTexte(result.text)
          toast.success(
            action === 'Translate'
              ? `Texte traduit en ${result.targetLanguage ?? ''}`
              : 'Texte reformulé',
          )
        },
        onError: (e: { message?: string }) => {
          // Le texte reste intact : une erreur réseau ne doit pas faire perdre une
          // rédaction entière.
          setErreur(e.message ?? "L'action IA a échoué. Votre texte est conservé.")
          historique.current.pop()
          setPeutAnnuler(historique.current.length > 0)
        },
      },
    )
  }

  const lancerGeneration = () => {
    if (mode === 'New') {
      // Sans fil, la consigne est le seul point de départ possible.
      if (!instruction.trim()) {
        setErreur("Indiquez ce que vous voulez écrire : sans consigne, il n'y a rien à générer.")
        return
      }
      pushHistorique()
      setErreur(null)
      editDraft.mutate(
        { text: '', action: 'Generate', instruction: instruction.trim(), targetLanguage: null },
        {
          onSuccess: (result) => {
            appliquerTexte(result.text)
            toast.success('Texte proposé — relisez-le avant envoi')
          },
          onError: (e: { message?: string }) => {
            setErreur(e.message ?? "La génération a échoué. Votre texte est conservé.")
            historique.current.pop()
            setPeutAnnuler(historique.current.length > 0)
          },
        },
      )
      return
    }

    // Hors mode « nouveau », le fil est transmis : c'est la seule action qui donne au
    // modèle autre chose que ce que l'utilisateur a écrit.
    generate.mutate(
      { instruction: instruction.trim() || undefined, mode },
      {
        onSuccess: (reply) => {
          pushHistorique()
          setSubject(reply.subject ?? subject)
          appliquerTexte(reply.body)
          setAiReplyId(reply.id)
          toast.success('Proposition générée — relisez-la avant envoi')
        },
        onError: (e: { message?: string }) => {
          setErreur(e.message ?? "La génération a échoué. Votre texte est conservé.")
        },
      },
    )
  }

  const annuler = () => {
    const precedent = historique.current.pop() ?? null
    setPeutAnnuler(historique.current.length > 0)
    if (precedent !== null) {
      setBody(precedent)
      setErreur(null)
      toast.success('Modification annulée')
    }
  }

  // ── Envoi ────────────────────────────────────────────────────────────────
  const toAddresses = splitAddresses(to)
  const overLimit = attachmentsSize(attachments) > MAX_ATTACHMENT_BYTES
  const canSend =
    canWrite &&
    toAddresses.length > 0 &&
    body.trim().length > 0 &&
    !overLimit &&
    !occupe

  const envoyer = () => {
    if (!canSend) return
    compose.mutate(
      {
        to: toAddresses,
        cc: splitAddresses(cc),
        subject: subject.trim() || '(sans objet)',
        // Le texte AFFICHÉ part, tel quel : c'est la garantie du produit, et elle tient
        // par construction puisque c'est exactement cette valeur qui est envoyée.
        bodyText: body,
        mode,
        replyToMessageId: mode === 'New' ? null : replyToMessageId,
        aiReplyId,
        attachments: attachments.length > 0 ? attachments : null,
      },
      {
        onSuccess: () => {
          historique.current = []
          setPeutAnnuler(false)
          setTo('')
          setCc('')
          setSubject('')
          setBody('')
          setQuotedText('')
          setAttachments([])
          setAiReplyId(null)
          onSent?.()
        },
      },
    )
  }

  const modesDisponibles: ModeAction[] = availableModes
    .filter((m) => m !== mode)
    .map((m) => ({ key: m, label: COMPOSE_MODE_LABELS[m] }))

  const texteVide = body.trim().length === 0
  const actionIABloquee = !canWrite || !aiAvailable || occupe

  return (
    <div className="flex h-full flex-col" data-testid="composeur" data-mode={mode}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">{COMPOSE_MODE_LABELS[mode]}</h3>
          {modesDisponibles.map((m) => (
            <Button
              key={m.key}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              data-testid={`basculer-${m.key}`}
              onClick={() => onModeChange?.(m.key)}
            >
              {m.label}
            </Button>
          ))}
        </div>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
            Annuler la rédaction
          </Button>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3">
        {prefill.isError && (
          <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            Préremplissage impossible ({prefill.error?.message ?? 'erreur inconnue'}). Renseignez les
            destinataires à la main : l&apos;envoi reste possible.
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="composeur-to">Destinataires</Label>
          <Input
            id="composeur-to"
            data-testid="composeur-destinataires"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="client@exemple.fr, autre@exemple.fr"
          />
        </div>

        {mode === 'ReplyAll' && (
          <div className="space-y-1.5">
            <Label htmlFor="composeur-cc">Copies</Label>
            <Input
              id="composeur-cc"
              data-testid="composeur-copies"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Les autres participants, modifiables"
            />
            <p className="text-[11px] text-muted-foreground">
              Les participants sont proposés par le serveur ; vous pouvez les retirer.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="composeur-objet">Objet</Label>
          <Input
            id="composeur-objet"
            data-testid="composeur-objet"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Objet du message"
          />
        </div>

        {/* Citation du message d'origine : affichée, jamais modifiable, et absente du
            champ de rédaction. Le serveur la reconstruit à l'envoi. */}
        {quotedText.trim().length > 0 && (
          <section className="space-y-1.5" data-testid="citation">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Quote className="size-3.5" />
              Message d&apos;origine (cité, non modifiable)
            </p>
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-3 font-sans text-[15px] leading-relaxed text-muted-foreground">
              {quotedText}
            </pre>
          </section>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="composeur-message">Message</Label>
          <Textarea
            id="composeur-message"
            data-testid="composeur-message"
            value={body}
            rows={12}
            onChange={(e) => setBody(e.target.value)}
            className="font-sans text-[15px] leading-relaxed"
          />
        </div>
      </div>

      {/* Barre d'outils COMMUNE : mêmes actions dans les quatre modes. */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={actionIABloquee}
            placeholder="Ex. : confirmer la disponibilité pour jeudi"
            aria-label="Consigne pour l'assistance"
            data-testid="composeur-consigne"
            className="h-8 w-full text-xs sm:w-64"
          />

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            data-testid="action-generer"
            disabled={actionIABloquee}
            onClick={lancerGeneration}
            title={
              mode === 'New'
                ? 'Rédige un message à partir de la consigne'
                : 'Rédige une proposition en tenant compte de la conversation'
            }
          >
            {generate.isPending || (editDraft.isPending && editDraft.variables?.action === 'Generate') ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Générer par IA
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            data-testid="action-reformuler"
            disabled={actionIABloquee || texteVide}
            onClick={() => lancerEdition('Rewrite')}
          >
            {editDraft.isPending && editDraft.variables?.action === 'Rewrite' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Reformuler
          </Button>

          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Traduire en
          </span>
          {TRANSLATE_LANGUAGES.map((lang) => (
            <Button
              key={lang.code}
              type="button"
              size="sm"
              variant="secondary"
              className="h-8"
              data-testid={`action-traduire-${lang.code}`}
              disabled={actionIABloquee || texteVide}
              onClick={() => lancerEdition('Translate', lang.code)}
            >
              {editDraft.isPending && editDraft.variables?.targetLanguage === lang.code ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {lang.label}
            </Button>
          ))}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground"
            data-testid="action-annuler-ia"
            disabled={!peutAnnuler || occupe}
            onClick={annuler}
            title="Revenir au texte d'avant la dernière action de l'assistance"
          >
            <Undo2 className="size-3.5" />
            Annuler
          </Button>
        </div>

        <AttachmentPicker
          attachments={attachments}
          onChange={setAttachments}
          disabled={occupe}
        />

        {erreur && (
          <p
            className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-2.5 text-xs text-red-900"
            data-testid="composeur-erreur"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            {erreur}
          </p>
        )}

        {!aiAvailable && (
          <p className="text-xs text-amber-700">
            Assistance IA désactivée sur ce serveur (GROQ_API_KEY absente) : la rédaction et
            l&apos;envoi restent disponibles.
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {quotedText.trim().length > 0
              ? 'La citation est ajoutée à l\'envoi par le serveur.'
              : 'Rien n\'est envoyé sans votre clic sur « Envoyer ».'}
          </span>
          <Button size="sm" disabled={!canSend} onClick={envoyer} data-testid="composeur-envoyer">
            {compose.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Envoyer
            <AttachmentBadge count={attachments.length} />
          </Button>
        </div>
      </div>
    </div>
  )
}
