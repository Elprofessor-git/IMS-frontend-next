'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, Bot, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useChatbotHealth, useSendChatMessage } from '@/hooks/use-chatbot'

type Role = 'user' | 'assistant'

type Message = {
  role: Role
  content: string
  timestamp: Date
}

type HealthStatus = 'checking' | 'available' | 'unavailable'

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [showThinkingHint, setShowThinkingHint] = useState(false)
  const [sessionId] = useState<string>(() => crypto.randomUUID())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: healthData, isLoading: healthLoading } = useChatbotHealth()
  const health: HealthStatus = healthLoading
    ? 'checking'
    : healthData?.status === 'available'
    ? 'available'
    : 'unavailable'

  const sendChatMutation = useSendChatMessage()

  // Scroll vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sendChatMutation.isPending])

  // Focus input à l'ouverture
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  // Hint "consulte les données" après 3 s d'attente (boucle agent multi-tours)
  useEffect(() => {
    if (!sendChatMutation.isPending) { setShowThinkingHint(false); return }
    const t = setTimeout(() => setShowThinkingHint(true), 3000)
    return () => clearTimeout(t)
  }, [sendChatMutation.isPending])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || sendChatMutation.isPending || health !== 'available') return

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const data = await sendChatMutation.mutateAsync({ message: text, sessionId, history })

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(data.timestamp),
        },
      ])
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Erreur de communication avec le service IA.'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${msg}`, timestamp: new Date() },
      ])
    }
  }, [input, sendChatMutation, health, messages, sessionId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isDisabled = health !== 'available' || sendChatMutation.isPending

  return (
    <>
      {/* ── Panneau chat ───────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-x-0 bottom-[72px] z-50 flex h-[65vh] flex-col overflow-hidden rounded-t-xl border bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 sm:inset-x-auto sm:bottom-20 sm:right-4 sm:h-[480px] sm:w-80 sm:rounded-xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="size-4" />
              <span className="text-sm font-semibold">Assistant IA</span>
              <span
                className={`size-2 rounded-full ${
                  health === 'available'
                    ? 'bg-green-400'
                    : health === 'checking'
                    ? 'bg-yellow-400 animate-pulse'
                    : 'bg-red-400'
                }`}
                title={
                  health === 'available'
                    ? 'Service disponible'
                    : health === 'checking'
                    ? 'Vérification…'
                    : 'Service indisponible'
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setIsOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {health === 'checking' && (
              <p className="mt-10 text-center text-sm text-muted-foreground">
                Vérification du service…
              </p>
            )}

            {health === 'unavailable' && messages.length === 0 && (
              <div className="mt-10 flex flex-col items-center gap-3 text-center">
                <AlertCircle className="size-10 text-destructive" />
                <p className="text-sm font-medium">Service indisponible</p>
                <p className="text-xs text-muted-foreground">
                  Le service Groq AI n&apos;est pas accessible pour le moment.
                  Vérifiez votre connexion ou réessayez plus tard.
                </p>
              </div>
            )}

            {health === 'available' && messages.length === 0 && (
              <div className="mt-10 flex flex-col items-center gap-3 text-center text-muted-foreground">
                <Bot className="size-10 opacity-20" />
                <p className="text-sm leading-relaxed">
                  Posez une question sur votre stock, vos commandes, vos
                  fournisseurs ou vos tâches…
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  <p
                    className={`mt-1 text-[10px] opacity-50 ${
                      m.role === 'user' ? 'text-right' : ''
                    }`}
                  >
                    {m.timestamp.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Indicateur de frappe + hint si attente > 3 s */}
            {sendChatMutation.isPending && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5">
                    <span
                      className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: '160ms' }}
                    />
                    <span
                      className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: '320ms' }}
                    />
                  </div>
                </div>
                {showThinkingHint && (
                  <p className="pl-1 text-[11px] italic text-muted-foreground">
                    L&apos;assistant consulte les données…
                  </p>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t p-3">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                className="min-h-0 flex-1 resize-none py-2 text-sm"
                placeholder={
                  health !== 'available'
                    ? 'Service indisponible'
                    : 'Votre question… (Entrée pour envoyer)'
                }
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isDisabled}
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!input.trim() || isDisabled}
                className="shrink-0"
                title="Envoyer"
              >
                {sendChatMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bouton flottant ─────────────────────────────────────────── */}
      <Button
        size="icon"
        className="fixed bottom-4 right-4 z-50 size-12 rounded-full shadow-lg"
        onClick={() => setIsOpen((o) => !o)}
        title={isOpen ? 'Fermer le chat' : "Ouvrir l'assistant IA"}
      >
        {isOpen ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </>
  )
}
