'use client'

import { useState, useCallback, useMemo } from 'react'
import { Copy, Check, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Switch } from '@/components/ui/switch'
import { PasswordInputField } from '@/components/password-input-field'
import { PasswordStrengthMeter } from '@/components/password-strength-meter'
import { encrypt, bytesToBase64Url } from '@/lib/crypto'
import { toast } from 'sonner'
import { useLocale } from '@/lib/locale-provider'

const TTL_VALUES = [0, 3600, 86400, 604800, 2592000] as const

type CreateNoteFormProps = Readonly<{
  onSuccess?: (id: string) => void
}>

export function getTtlLabel(
  ttl: number,
  ttlOptions: ReadonlyArray<{ value: number; label: string }>
): string {
  return ttlOptions.find((o) => o.value === ttl)?.label ?? ''
}

export function CreateNoteForm({ onSuccess }: CreateNoteFormProps) {
  const { t } = useLocale()
  const ttlOptions = useMemo(
    () =>
      TTL_VALUES.map((value) => ({
        value,
        label: t(`ttl.${value}`),
      })),
    [t]
  )

  const [content, setContent] = useState('')
  const [ttl, setTtl] = useState(0)
  const [isExpirationOpen, setIsExpirationOpen] = useState(false)

  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    id: string
    url: string
    hasPassword: boolean
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPasswordResult, setShowPasswordResult] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const handleCreate = useCallback(async () => {
    if (!content.trim()) {
      toast.error(t('form.emptyContent'))
      return
    }

    if (usePassword) {
      if (!password || !confirmPassword) {
        setPasswordError(t('form.passwordBoth'))
        return
      }
      if (password !== confirmPassword) {
        setPasswordError(t('form.passwordMismatch'))
        return
      }
      setPasswordError('')
    }

    setIsLoading(true)
    try {
      const key = await globalThis.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )

      const rawKey = await globalThis.crypto.subtle.exportKey('raw', key)
      const keyBase64 = bytesToBase64Url(rawKey)

      const encrypted = await encrypt(content, keyBase64)

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cipher: encrypted.cipher,
          iv: encrypted.iv,
          salt: encrypted.salt,
          ttl,
          password: usePassword ? password : undefined,
        }),
      })

      if (!res.ok) {
        throw new Error(t('form.createError'))
      }

      const data = await res.json()
      const url = `${globalThis.location.origin}/n/${data.id}#${keyBase64}`

      setResult({
        id: data.id,
        url,
        hasPassword: data.hasPassword || false,
      })

      if (onSuccess) {
        onSuccess(data.id)
      }

      toast.success(t('form.createSuccess'))
    } catch {
      toast.error(t('form.createError'))
    } finally {
      setIsLoading(false)
    }
  }, [content, ttl, usePassword, password, confirmPassword, onSuccess, t])

  const copyToClipboard = useCallback(
    async (text: string, type: 'url' | 'password') => {
      try {
        await navigator.clipboard.writeText(text)
        if (type === 'url') {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } else {
          setCopiedPassword(true)
          setTimeout(() => setCopiedPassword(false), 2000)
        }
        toast.success(
          type === 'url' ? t('form.linkCopied') : t('form.passwordCopied')
        )
      } catch {
        toast.error(t('form.copyError'))
      }
    },
    [t]
  )

  const reset = useCallback(() => {
    setContent('')
    setTtl(0)
    setUsePassword(false)
    setPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setResult(null)
    setCopied(false)
    setShowPasswordResult(false)
    setCopiedPassword(false)
    setIsExpirationOpen(false)
  }, [])

  const ttlLabelLower = getTtlLabel(ttl, ttlOptions)

  if (result) {
    return (
      <div className="space-y-4" data-doc="note-created-panel">
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-semibold">{t('form.resultTitle')}</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('form.noteLink')}</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="text"
                  readOnly
                  value={result.url}
                  className="min-h-11 flex-1 touch-manipulation rounded-md border bg-muted px-3 py-2 text-sm break-all"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-full shrink-0 touch-manipulation sm:h-9 sm:w-9"
                  onClick={() => copyToClipboard(result.url, 'url')}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            {result.hasPassword && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
                  {t('form.passwordReadTitle')}
                </h4>
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <input
                      type={showPasswordResult ? 'text' : 'password'}
                      readOnly
                      value={password}
                      className="min-h-11 flex-1 touch-manipulation rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <div className="flex shrink-0 gap-2 sm:contents">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 flex-1 touch-manipulation sm:h-9 sm:flex-none sm:w-9"
                      onClick={() => setShowPasswordResult(!showPasswordResult)}
                    >
                      {showPasswordResult ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 flex-1 touch-manipulation sm:h-9 sm:flex-none sm:w-9"
                      onClick={() => copyToClipboard(password, 'password')}
                    >
                      {copiedPassword ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {t('form.passwordReadHint')}
                  </p>
                </div>
              </div>
            )}

            {!isExpirationOpen && ttl > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('form.expiresAfterRead', { ttl: ttlLabelLower })}
              </p>
            )}

            {ttl === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('form.deletedAfterRead')}
              </p>
            )}
          </div>
        </div>

        <Button onClick={reset} className="h-11 w-full touch-manipulation sm:h-10">
          {t('form.createAnother')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-doc="create-note-editor">
      <div className="space-y-2">
        <Label htmlFor="content">{t('form.noteContent')}</Label>
        <Textarea
          id="content"
          placeholder={t('form.placeholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="min-h-[10rem] resize-none font-mono text-base touch-manipulation sm:min-h-0 sm:text-sm"
        />
      </div>

      <Collapsible open={isExpirationOpen} onOpenChange={setIsExpirationOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="h-11 w-full touch-manipulation sm:h-10">
            {t('form.expirationToggle')}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-2">
          <Label htmlFor="ttl">{t('form.ttlLabel')}</Label>
          <Select
            value={ttl.toString()}
            onValueChange={(v) => setTtl(Number(v))}
          >
            <SelectTrigger id="ttl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ttlOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {ttl === 0 ? t('form.ttlHint0') : t('form.ttlHintOther')}
          </p>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="use-password" className="cursor-pointer">
            {t('form.protectPassword')}
          </Label>
          <Switch
            id="use-password"
            checked={usePassword}
            onCheckedChange={(checked) => {
              setUsePassword(checked)
              if (!checked) {
                setPassword('')
                setConfirmPassword('')
                setPasswordError('')
              }
            }}
          />
        </div>

        {usePassword && (
          <div className="space-y-4">
            <PasswordInputField
              id="password"
              label={t('form.password')}
              value={password}
              onChange={setPassword}
              placeholder={t('form.passwordPlaceholder')}
              autoComplete="new-password"
            />

            {password && <PasswordStrengthMeter password={password} />}

            <PasswordInputField
              id="confirm-password"
              label={t('form.confirmPassword')}
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={passwordError}
              placeholder={t('form.confirmPlaceholder')}
              autoComplete="new-password"
            />
          </div>
        )}
      </div>

      <Button
        onClick={handleCreate}
        disabled={isLoading || !content.trim()}
        className="h-11 w-full touch-manipulation sm:h-10"
      >
        {isLoading ? t('form.creating') : t('form.createButton')}
      </Button>
    </div>
  )
}
