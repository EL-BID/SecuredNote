"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useLocale } from "@/lib/locale-provider"
import { useBranding } from "@/lib/branding-provider"
import type { Locale } from "@/lib/dictionaries"

const STORAGE_KEY = "secured-note-disclaimer-remembered"

export function DisclaimerModal() {
  const { locale, setLocale, t } = useLocale()
  const { setupReady, setupComplete, branding } = useBranding()
  const [open, setOpen] = useState(false)
  const [remember, setRemember] = useState(false)

  useEffect(() => {
    if (globalThis.window === undefined || !setupReady) return
    if (!setupComplete) {
      setOpen(false)
      return
    }
    if (branding.disclaimer.mode === "hidden") {
      setOpen(false)
      return
    }
    const remembered = globalThis.localStorage?.getItem(STORAGE_KEY) === "1"
    if (remembered) {
      setOpen(false)
      return
    }
    setOpen(true)
  }, [setupReady, setupComplete, branding.disclaimer.mode])

  const handleAccept = () => {
    if (globalThis.window !== undefined) {
      if (remember) {
        globalThis.localStorage?.setItem(STORAGE_KEY, "1")
      } else {
        globalThis.localStorage?.removeItem(STORAGE_KEY)
      }
    }
    setOpen(false)
  }

  const handleReject = () => {
    if (globalThis.window !== undefined) {
      globalThis.localStorage?.removeItem(STORAGE_KEY)
      if (globalThis.history.length > 1) {
        globalThis.history.back()
        return
      }
    }
    setOpen(false)
  }

  const pill = (code: Locale) => (
    <button
      type="button"
      onClick={() => setLocale(code)}
      className={
        locale === code
          ? "rounded-md bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm"
          : "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      }
      aria-pressed={locale === code}
      aria-label={code === "en" ? t("nav.ariaEn") : t("nav.ariaEs")}
    >
      {code === "en" ? t("nav.en") : t("nav.es")}
    </button>
  )

  const { title, bodyText } = useMemo(() => {
    const d = branding.disclaimer
    if (d.mode === "custom") {
      const translation = d.content[locale]
      return { title: translation.title, bodyText: translation.body }
    }
    return { title: t("disclaimer.title"), bodyText: t("disclaimer.body") }
  }, [branding.disclaimer, locale, t])

  const paragraphs = bodyText.split("\n\n")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="z-[100] max-h-[min(90vh,32rem)] gap-0 overflow-hidden p-0 sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="max-h-[min(90vh,32rem)] overflow-y-auto p-6">
          <DialogHeader className="space-y-4 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <DialogTitle className="sm:pr-2">{title}</DialogTitle>
              <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("nav.language")}
                </span>
                <fieldset className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                  <legend className="sr-only">{t("nav.language")}</legend>
                  {pill("en")}
                  {pill("es")}
                </fieldset>
              </div>
            </div>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2 text-left text-sm text-muted-foreground">
                {paragraphs.map((p) => (
                  <p key={p.slice(0, 48)} className="leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-2 rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="disclaimer-remember"
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
                className="mt-0.5"
              />
              <Label
                htmlFor="disclaimer-remember"
                className="cursor-pointer text-sm font-medium leading-snug text-foreground"
              >
                {t("disclaimer.checkbox")}
              </Label>
            </div>
            <p className="pl-7 text-xs leading-snug text-muted-foreground">
              {t("disclaimer.rememberHint")}
            </p>
          </div>
        </div>
        <DialogFooter className="flex flex-col gap-2 border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={handleReject}
          >
            {t("disclaimer.reject")}
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={handleAccept}>
            {t("disclaimer.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
