'use client'

import { useRef, useState } from 'react'
import { FileText, ImageIcon, Download, Trash2, Plus, Paperclip } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  useGetDocuments,
  useUploadDocument,
  useDeleteDocument,
} from '@/hooks/use-documents'
import type { TypeDocument } from '@/types/document'

const MAX_SIZE = 5 * 1024 * 1024

const TYPE_LABELS: Record<TypeDocument, string> = {
  Facture: 'Facture',
  BonLivraison: 'Bon de livraison',
  Autre: 'Autre',
}

const TYPE_BADGE_CLASS: Record<TypeDocument, string> = {
  Facture: 'border-blue-200 bg-blue-50 text-blue-800',
  BonLivraison: 'border-violet-200 bg-violet-50 text-violet-800',
  Autre: '',
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
  return `${Math.round(bytes / 1024)} Ko`
}

export function DocumentSection({
  scope,
  parentId,
}: {
  scope: 'achat' | 'importation'
  parentId: number
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<TypeDocument>('Facture')
  const [sizeError, setSizeError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: docs = [], isLoading } = useGetDocuments(scope, parentId)
  const uploadMutation = useUploadDocument(scope, parentId)
  const deleteMutation = useDeleteDocument(scope, parentId)

  const entitySegment = scope === 'achat' ? 'Achat' : 'Importation'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (!f) {
      setFile(null)
      setSizeError(null)
      return
    }
    if (f.size > MAX_SIZE) {
      setSizeError(
        `Fichier trop volumineux (${formatSize(f.size)}). Maximum autorisé : 5 Mo.`,
      )
      setFile(null)
      e.target.value = ''
      return
    }
    setSizeError(null)
    setFile(f)
  }

  async function handleUpload() {
    if (!file || sizeError) return
    try {
      await uploadMutation.mutateAsync({ file, type })
      closeDialog()
    } catch {
      // error toasted inside the hook
    }
  }

  function closeDialog() {
    setFile(null)
    setType('Facture')
    setSizeError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setDialogOpen(false)
  }

  function downloadDoc(docId: number) {
    const a = document.createElement('a')
    a.href = `/api/proxy/api/${entitySegment}/${parentId}/Documents/${docId}/Download`
    a.click()
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="size-4" />
            Documents joints
            {docs.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal tabular-nums">
                {docs.length}
              </span>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            Ajouter
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document joint.</p>
          ) : (
            <ul className="divide-y">
              {docs.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 py-2.5">
                  {/* File icon */}
                  <div className="shrink-0 text-muted-foreground">
                    {doc.contentType.startsWith('image/') ? (
                      <ImageIcon className="size-5" />
                    ) : (
                      <FileText className="size-5" />
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.nomFichier}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={`text-xs ${TYPE_BADGE_CLASS[doc.type]}`}
                      >
                        {TYPE_LABELS[doc.type]}
                      </Badge>
                      <span>{formatSize(doc.tailleOctets)}</span>
                      <span aria-hidden>·</span>
                      <span>{new Date(doc.dateAjout).toLocaleDateString('fr-FR')}</span>
                      {doc.ajoutePar && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{doc.ajoutePar}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      title="Télécharger"
                      onClick={() => downloadDoc(doc.id)}
                    >
                      <Download className="size-4" />
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:text-destructive"
                          title="Supprimer"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      }
                      title="Supprimer ce document ?"
                      description={`"${doc.nomFichier}" sera définitivement supprimé.`}
                      onConfirm={() => deleteMutation.mutate(doc.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeDialog() }}
        >
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold">Ajouter un document</h3>

            <div className="space-y-4">
              {/* File input */}
              <div className="grid gap-2">
                <Label htmlFor="doc-file">
                  Fichier <span className="text-destructive">*</span>
                </Label>
                <input
                  ref={fileInputRef}
                  id="doc-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="block w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  PDF, JPEG ou PNG · 5 Mo maximum
                </p>
                {sizeError && (
                  <p className="text-sm font-medium text-destructive">{sizeError}</p>
                )}
                {file && !sizeError && (
                  <p className="text-xs text-muted-foreground">
                    {file.name} · {formatSize(file.size)}
                  </p>
                )}
              </div>

              {/* Type select */}
              <div className="grid gap-2">
                <Label htmlFor="doc-type">Type de document</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as TypeDocument)}
                >
                  <SelectTrigger id="doc-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Facture">Facture</SelectItem>
                    <SelectItem value="BonLivraison">Bon de livraison</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={closeDialog}
                disabled={uploadMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={!file || !!sizeError || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Envoi en cours…' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
