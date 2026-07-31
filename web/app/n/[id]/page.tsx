'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ConfirmReadDialog } from '@/components/confirm-read-dialog'
import { ExpirationCountdown } from '@/components/expiration-countdown'
import { PasswordInputField } from '@/components/password-input-field'
import { NotFoundScreen, ExpiredScreen, ConnectionErrorScreen } from '@/components/note-state-screens'
import { decrypt } from '@/lib/crypto'
import { AlertCircle, Copy, Check, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useLocale } from '@/lib/locale-provider'

type ViewState =
  | 'loading-metadata'
  | 'confirm-read'
  | 'password-required'
  | 'loading-note'
  | 'displaying'
  | 'not-found'
  | 'expired'
  | 'connection-error'

interface NoteMetadata {
  id: string
  hasPassword: boolean
  expiresIn: number | null
  createdAt: number
}

export function resolveAttemptsRemaining(value: unknown): number {
  return typeof value === 'number' ? value : 2
}

export function getNoteOrigin(): string {
  return globalThis.window?.location.origin ?? ''
}

export default function NotePage() {
  const { t } = useLocale()
  const params = useParams()
  const router = useRouter()
  const noteId = params.id as string

  const [viewState, setViewState] = useState<ViewState>('loading-metadata')
  const [metadata, setMetadata] = useState<NoteMetadata | null>(null)
  const [decryptedContent, setDecryptedContent] = useState<string>('')
  const [error, setError] = useState<string>('')

  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [attemptsRemaining, setAttemptsRemaining] = useState(3)
  const [isLockedOut, setIsLockedOut] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/notes/${noteId}/metadata`)

        if (res.status === 404) {
          setViewState('not-found')
          return
        }

        if (!res.ok) {
          throw new Error(t('read.metadataError'))
        }

        const data: NoteMetadata = await res.json()
        setMetadata(data)
        setViewState('confirm-read')
        setConfirmDialogOpen(true)
      } catch {
        setViewState('connection-error')
      }
    }

    fetchMetadata()
  }, [noteId, t])

  useEffect(() => {
    if (!isLockedOut || retryAfter <= 0) return

    const timer = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) {
          setIsLockedOut(false)
          setPasswordError('')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isLockedOut, retryAfter])

  const fetchAndDecryptNote = useCallback(
    async (pwd?: string) => {
      setViewState('loading-note')
      setError('')

      try {
        const hash = globalThis.location.hash.slice(1)
        if (!hash) {
          throw new Error(t('read.keyMissing'))
        }

        const res = await fetch(`/api/notes/${noteId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pwd ? { password: pwd } : {}),
        })

        if (res.status === 404) {
          setViewState('not-found')
          return
        }

        if (res.status === 401) {
          const data = await res.json()
          setPasswordError(t('read.wrongPassword'))
          setAttemptsRemaining(resolveAttemptsRemaining(data.attemptsRemaining))
          setViewState('password-required')
          return
        }

        if (res.status === 429) {
          const data = await res.json()
          setIsLockedOut(true)
          setRetryAfter(data.retryAfter || 60)
          setPasswordError(
            t('read.lockout', { n: data.retryAfter || 60 })
          )
          setViewState('password-required')
          return
        }

        if (!res.ok) {
          throw new Error(t('read.fetchError'))
        }

        const encryptedData = await res.json()

        const plaintext = await decrypt(
          {
            cipher: encryptedData.cipher,
            iv: encryptedData.iv,
            salt: encryptedData.salt,
          },
          hash
        )

        setDecryptedContent(plaintext)
        setViewState('displaying')

        globalThis.history.replaceState(null, '', globalThis.location.pathname)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t('read.decryptError')
        )
        setViewState('connection-error')
      }
    },
    [noteId, t]
  )

  const handleConfirmRead = useCallback(() => {
    setConfirmDialogOpen(false)

    if (metadata?.hasPassword) {
      setViewState('password-required')
    } else {
      fetchAndDecryptNote()
    }
  }, [metadata, fetchAndDecryptNote])

  const handlePasswordSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!password) {
        setPasswordError(t('read.passwordRequired'))
        return
      }

      if (isLockedOut) {
        return
      }

      fetchAndDecryptNote(password)
    },
    [password, isLockedOut, fetchAndDecryptNote, t]
  )

  const handleExpired = useCallback(() => {
    setViewState('expired')
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(decryptedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success(t('read.contentCopied'))
    } catch {
      toast.error(t('read.copyFailed'))
    }
  }, [decryptedContent, t])

  const handleRetry = useCallback(() => {
    globalThis.location.reload()
  }, [])

  const handleClose = useCallback(() => {
    router.push('/')
  }, [router])

  if (viewState === 'loading-metadata') {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center px-4">
        <p className="text-muted-foreground">{t('read.loading')}</p>
      </div>
    )
  }

  if (viewState === 'not-found') {
    return <NotFoundScreen onClose={handleClose} />
  }

  if (viewState === 'expired') {
    return <ExpiredScreen noteId={noteId} onClose={handleClose} />
  }

  if (viewState === 'connection-error') {
    return (
      <div className="space-y-4 px-4 py-6">
        <ConnectionErrorScreen onRetry={handleRetry} />
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  if (viewState === 'confirm-read' && metadata) {
    return (
      <div className="flex min-h-[min(640px,85dvh)] items-center justify-center px-4 py-8">
        <ConfirmReadDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          noteId={noteId}
          hasPassword={metadata.hasPassword}
          onConfirm={handleConfirmRead}
        />
      </div>
    )
  }

  if (viewState === 'password-required') {
    return (
      <div className="flex min-h-[min(640px,85dvh)] items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-xl" data-doc="read-note-password">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Lock className="size-6" />
              {t('read.noteTitle')}
            </CardTitle>
            <Alert variant="default" className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
              <AlertCircle className="size-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-sm text-orange-900 dark:text-orange-100">
                {t('read.doNotReload')}
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <PasswordInputField
                id="note-password"
                label={t('read.passwordLabel')}
                value={password}
                onChange={setPassword}
                error={passwordError}
                placeholder={t('read.passwordPlaceholder')}
                autoComplete="off"
              />

              {!isLockedOut && attemptsRemaining < 3 && (
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  {t('read.attempts')} {attemptsRemaining}
                </p>
              )}

              {isLockedOut && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>
                    {t('read.locked')} {retryAfter}
                    {t('read.lockedSeconds')}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={!password || isLockedOut}
                className="h-11 w-full touch-manipulation"
                size="lg"
              >
                {isLockedOut
                  ? `${t('read.wait')} ${retryAfter}s`
                  : t('read.proceed')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (viewState === 'loading-note') {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center px-4">
        <p className="text-muted-foreground">{t('read.decrypting')}</p>
      </div>
    )
  }

  if (viewState === 'displaying') {
    const origin = getNoteOrigin()
    const noteUrl = `${origin}/n/${noteId}`

    return (
      <div className="w-full max-w-full space-y-6 px-3 py-6 sm:mx-auto sm:max-w-3xl sm:px-6 sm:py-8">
        {metadata?.expiresIn && metadata.expiresIn > 0 && (
          <ExpirationCountdown
            expiresIn={metadata.expiresIn}
            noteLink={noteUrl}
            onExpired={handleExpired}
          />
        )}

        {metadata?.expiresIn && metadata.expiresIn <= 0 && (
          <Alert variant="default" className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <AlertCircle className="size-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-sm text-red-900 dark:text-red-100">
              {t('read.warningDestroyed')}
            </AlertDescription>
          </Alert>
        )}

        <Card
          className="w-full gap-0 overflow-hidden py-0 shadow-lg"
          data-doc="read-note-display"
        >
          <div className="flex flex-col gap-4 border-b border-border/60 px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="min-w-0 space-y-2">
                <h2 className="text-balance text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                  {t('read.noteTitle')}
                </h2>
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t('read.destroyedDescription')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-11 w-full shrink-0 touch-manipulation sm:h-9 sm:w-fit sm:self-end"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 size-4" />
                    {t('read.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 size-4" />
                    {t('read.copy')}
                  </>
                )}
              </Button>
            </div>
          </div>
          <CardContent className="px-4 pb-6 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
            <div className="w-full rounded-lg border bg-muted/50 p-4 sm:p-6">
              <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed sm:text-base">
                {decryptedContent}
              </pre>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center px-1 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            size="lg"
            className="h-11 w-full max-w-md touch-manipulation sm:h-10 sm:w-auto"
          >
            {t('read.close')}
          </Button>
        </div>
      </div>
    )
  }

  return null
}
