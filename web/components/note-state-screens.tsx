'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/locale-provider'

interface NotFoundScreenProps {
  onClose: () => void
}

export function NotFoundScreen({ onClose }: Readonly<NotFoundScreenProps>) {
  const { t } = useLocale()

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center space-y-4 px-4 py-8 text-center sm:min-h-[400px]">
      <div className="rounded-full bg-muted p-4">
        <X className="size-8 text-muted-foreground" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-bold sm:text-2xl">{t('notFound.title')}</h2>
        <p className="text-muted-foreground">{t('notFound.body')}</p>
      </div>
      <Button className="h-11 min-w-[12rem] touch-manipulation" onClick={onClose}>
        {t('notFound.close')}
      </Button>
    </div>
  )
}

interface ExpiredScreenProps {
  noteId: string
  onClose: () => void
}

export function ExpiredScreen({ noteId, onClose }: Readonly<ExpiredScreenProps>) {
  const { t } = useLocale()

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center space-y-4 px-4 py-8 text-center sm:min-h-[400px]">
      <div className="rounded-full bg-orange-100 p-4 dark:bg-orange-950">
        <X className="size-8 text-orange-600 dark:text-orange-400" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-bold sm:text-2xl">{t('expired.title')}</h2>
        <p className="text-muted-foreground">
          {t('expired.body.before')}{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
            {noteId}
          </code>{' '}
          {t('expired.body.after')}
        </p>
      </div>
      <Button className="h-11 min-w-[12rem] touch-manipulation" onClick={onClose}>
        {t('expired.close')}
      </Button>
    </div>
  )
}

interface ConnectionErrorScreenProps {
  onRetry: () => void
}

export function ConnectionErrorScreen({
  onRetry,
}: Readonly<ConnectionErrorScreenProps>) {
  const { t } = useLocale()

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
      <div className="space-y-2">
        <p className="font-medium text-red-900 dark:text-red-100">
          {t('connection.title')}
        </p>
        <p className="text-sm text-red-700 dark:text-red-300">
          {t('connection.body')}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('connection.retry')}
        </Button>
      </div>
    </div>
  )
}
