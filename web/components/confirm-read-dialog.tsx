'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useLocale } from '@/lib/locale-provider'

type ConfirmReadDialogProps = Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  noteId: string
  hasPassword: boolean
  onConfirm: () => void
}>

export function ConfirmReadDialog({
  open,
  onOpenChange,
  noteId,
  hasPassword,
  onConfirm,
}: ConfirmReadDialogProps) {
  const { t } = useLocale()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirm.title')}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {hasPassword ? (
              <>
                <p>
                  {t('confirm.withPassword.p1.before')}{' '}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                    {noteId}
                  </code>
                  {t('confirm.withPassword.p1.after')}
                </p>
                <p>{t('confirm.withPassword.p2')}</p>
                <p className="font-medium text-foreground">
                  {t('confirm.withPassword.p3')}
                </p>
              </>
            ) : (
              <p>
                {t('confirm.noPassword')}{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                  {noteId}
                </code>
                {t('confirm.noPassword.after')}
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={(e) => {
              e.preventDefault()
              globalThis.location.href = '/'
            }}
          >
            {t('confirm.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t('confirm.ok')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
