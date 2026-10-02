'use client'

import { useRef, type ChangeEvent } from 'react'
import { FileText, Image as ImageIcon, Paperclip, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ComposeAttachment } from '@/hooks/use-gmail'
import { MAX_ATTACHMENT_BYTES } from '@/types/gmail'

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

/** Taille décodée d'une pièce : le Base64 gonfle de 4/3, la chaîne ne dit rien de l'octet. */
export function attachmentBytes(attachment: ComposeAttachment): number {
  const padding = attachment.contentBase64.endsWith('==') ? 2 : attachment.contentBase64.endsWith('=') ? 1 : 0
  return (attachment.contentBase64.length / 4) * 3 - padding
}

export function attachmentsSize(attachments: ComposeAttachment[]): number {
  return attachments.reduce((sum, a) => sum + attachmentBytes(a), 0)
}

/**
 * Conversion d'un champ multi-fichiers en pièces jointes Base64.
 * <para>
 * La conversion se fait par morceaux : <c>String.fromCharCode(...buffer)</c> déborde la
 * pile dès quelques centaines de kilo-octets, ce qui échouerait précisément sur un plan
 * de coupe. Le même code sert la composition et la réponse : les deux passent par le
 * même plafond, donc les mêmes fichiers sont acceptés partout.
 * </para>
 */
export async function readFiles(files: FileList): Promise<ComposeAttachment[]> {
  const attachments: ComposeAttachment[] = []
  for (const file of Array.from(files)) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    attachments.push({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      contentBase64: btoa(binary),
    })
  }
  return attachments
}

/**
 * Sélecteur de pièces jointes : bouton d'ajout, compteur, seuil de plafond, retrait.
 * <para>
 * Le contrôle est affiché mais pas décisif : le serveur applique le même plafond
 * (20 Mo) et renvoie 413. On le signale ici pour éviter un aller-retour inutile, pas
 * pour protéger le serveur — c'est le serveur qui décide.
 * </para>
 */
export function AttachmentPicker({
  attachments,
  onChange,
  disabled,
}: {
  attachments: ComposeAttachment[]
  onChange: (attachments: ComposeAttachment[]) => void
  disabled?: boolean
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const totalBytes = attachmentsSize(attachments)
  const overLimit = totalBytes > MAX_ATTACHMENT_BYTES

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    void readFiles(files).then((added) => onChange([...attachments, ...added]))
    // Le champ doit être vidé : sans cela, re-sélectionner le même fichier ne déclencherait
    // pas l'événement change et le retrait puis ré-ajout ne fonctionnerait pas.
    if (fileInput.current) fileInput.current.value = ''
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => addFiles(event.target.files)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => fileInput.current?.click()}
        >
          <Plus className="size-4" />
          Joindre un fichier
        </Button>
        <span className="text-xs text-muted-foreground">
          {attachments.length > 0
            ? `${attachments.length} pièce(s) · ${humanSize(totalBytes)}`
            : 'Aucune pièce jointe'}
        </span>
      </div>

      {overLimit && (
        <p className="text-xs font-medium text-destructive">
          La limite est de {humanSize(MAX_ATTACHMENT_BYTES)} au total : retirez des pièces
          avant d&apos;envoyer.
        </p>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((attachment, index) => (
            <li
              key={`${attachment.fileName}-${index}`}
              className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-sm"
            >
              {attachment.mimeType.startsWith('image/') ? (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">{attachment.fileName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {humanSize(attachmentBytes(attachment))}
              </span>
              <button
                type="button"
                aria-label={`Retirer ${attachment.fileName}`}
                disabled={disabled}
                onClick={() => onChange(attachments.filter((_, i) => i !== index))}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Pastille « n pièce(s) jointe(s) » affichée à côté d'un bouton d'envoi. */
export function AttachmentBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Paperclip className="size-3" />
      {count} pièce(s) jointe(s)
    </span>
  )
}
