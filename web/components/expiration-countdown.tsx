'use client'

import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useLocale } from '@/lib/locale-provider'

interface ExpirationCountdownProps {
  readonly expiresIn: number
  readonly noteLink: string
  readonly onExpired: () => void
}

export function ExpirationCountdown({
  expiresIn,
  noteLink,
  onExpired,
}: ExpirationCountdownProps) {
  const { t } = useLocale()
  const [secondsLeft, setSecondsLeft] = useState(expiresIn)

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpired()
      return
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onExpired()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft, onExpired])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const minutesLabel =
    minutes === 1 ? t('countdown.minute') : t('countdown.minutes')
  const secondsLabel =
    seconds === 1 ? t('countdown.second') : t('countdown.seconds')

  const line = t('countdown.line', {
    minutes,
    minutesLabel,
    seconds,
    secondsLabel,
  })

  return (
    <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 sm:p-4 dark:border-orange-900 dark:bg-orange-950">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-orange-600 dark:text-orange-400" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
            {line}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="block w-full break-all rounded bg-orange-100 px-2 py-1.5 text-xs leading-snug dark:bg-orange-900">
              {noteLink}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(noteLink)}
              className="h-10 shrink-0 touch-manipulation rounded-md bg-orange-200 px-3 text-xs font-medium text-orange-900 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-100 dark:hover:bg-orange-700 sm:h-auto sm:py-1"
            >
              {t('countdown.copy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
