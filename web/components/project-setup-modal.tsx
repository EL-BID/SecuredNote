"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale } from "@/lib/locale-provider"
import type { Locale } from "@/lib/dictionaries"
import {
  DEFAULT_PROJECT_BRANDING,
  type DisclaimerConfig,
  type DisclaimerLocale,
  type DisclaimerTranslation,
  type LocalizedDisclaimerContent,
  type ProjectBranding,
  normalizeHex,
} from "@/lib/project-branding"
import {
  SetupWizardStepper,
  type SetupStep,
} from "@/components/setup-wizard-stepper"
import {
  SetupBrandStep,
  SetupLegalStep,
  SetupSuccessStep,
  SetupWelcomeStep,
  SetupWizardFooter,
  buildSuccessTips,
  buildWelcomeCards,
} from "@/components/project-setup-wizard-steps"

const MAX_DATA_URL_CHARS = 450_000

function emptyLocalizedDisclaimerContent(): LocalizedDisclaimerContent {
  return {
    en: { title: "", body: "" },
    es: { title: "", body: "" },
  }
}

function fileToCompressedLogoDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        const max = 128
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (w > max || h > max) {
          if (w >= h) {
            h = Math.round((h * max) / w)
            w = max
          } else {
            w = Math.round((w * max) / h)
            h = max
          }
        }
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, w)
        canvas.height = Math.max(1, h)
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.onerror = () => resolve(null)
      img.src = dataUrl
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

type DisclaimerMode = DisclaimerConfig["mode"]

type Props = Readonly<{
  open: boolean
  initialBranding: ProjectBranding
  onSave: (b: ProjectBranding) => Promise<void>
  onDismiss: () => void
}>

function stepKicker(step: SetupStep, t: (key: string) => string): string {
  switch (step) {
    case 0:
      return t("setup.welcomeKicker")
    case 1:
      return t("setup.stepProgressBrand")
    case 2:
      return t("setup.stepProgressLegal")
    case 3:
      return t("setup.stepProgressSuccess")
  }
}

function stepTitle(step: SetupStep, t: (key: string) => string): string {
  switch (step) {
    case 0:
      return t("setup.welcomeTitle")
    case 1:
      return t("setup.brandTitle")
    case 2:
      return t("setup.legalTitle")
    case 3:
      return t("setup.successTitle")
  }
}

function stepDescription(step: SetupStep, t: (key: string) => string): string | null {
  switch (step) {
    case 0:
      return t("setup.welcomeSubtitle")
    case 1:
      return t("setup.brandHint")
    case 2:
      return t("setup.step2Intro")
    case 3:
      return t("setup.successSubtitle")
  }
}

function disclaimerStateFromConfig(d: DisclaimerConfig): {
  mode: DisclaimerMode
  customContent: LocalizedDisclaimerContent
} {
  if (d.mode === "custom") {
    return { mode: "custom", customContent: d.content }
  }
  return { mode: d.mode, customContent: emptyLocalizedDisclaimerContent() }
}

export function shouldInitializeProjectSetup(open: boolean, wasOpen: boolean): boolean {
  return open && !wasOpen
}

function normalizedBrandFields(
  appName: string,
  primary: string,
  accent: string,
  background: string
): {
  name: string
  primary: string
  accent: string
  background: string
} | null {
  const name = appName.trim()
  const p = normalizeHex(primary)
  const a = normalizeHex(accent)
  const bg = normalizeHex(background)
  if (!name || !p || !a || !bg) return null
  return { name, primary: p, accent: a, background: bg }
}

export function ProjectSetupModal({
  open,
  initialBranding,
  onSave,
  onDismiss,
}: Props) {
  const { locale, setLocale, t } = useLocale()
  const wasOpenRef = useRef(false)
  const [step, setStep] = useState<SetupStep>(0)
  const [appName, setAppName] = useState("")
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [primary, setPrimary] = useState("")
  const [accent, setAccent] = useState("")
  const [background, setBackground] = useState("")
  const [logoError, setLogoError] = useState<string | null>(null)
  const [nameError, setNameError] = useState(false)
  const [disclaimerMode, setDisclaimerMode] = useState<DisclaimerMode>("default")
  const [customContent, setCustomContent] = useState<LocalizedDisclaimerContent>(
    emptyLocalizedDisclaimerContent()
  )
  const [disclaimerCustomError, setDisclaimerCustomError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const shouldInitialize = shouldInitializeProjectSetup(open, wasOpenRef.current)
    wasOpenRef.current = open
    if (!shouldInitialize) return

    setStep(0)
    const b = initialBranding
    setAppName(b.appName)
    setLogoDataUrl(b.logoDataUrl)
    setPrimary(b.primary)
    setAccent(b.accent)
    setBackground(b.background)
    setLogoError(null)
    setNameError(false)
    setSaveError(null)
    setDisclaimerCustomError(false)
    const disclaimerState = disclaimerStateFromConfig(b.disclaimer)
    setDisclaimerMode(disclaimerState.mode)
    setCustomContent(disclaimerState.customContent)
    // Only re-init when the modal opens; ignore branding updates while it stays open.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialBranding is read on open only
  }, [open])

  const previewBranding: ProjectBranding = {
    appName: appName.trim() || DEFAULT_PROJECT_BRANDING.appName,
    logoDataUrl,
    primary: normalizeHex(primary) ?? DEFAULT_PROJECT_BRANDING.primary,
    accent: normalizeHex(accent) ?? DEFAULT_PROJECT_BRANDING.accent,
    background:
      normalizeHex(background) ?? DEFAULT_PROJECT_BRANDING.background,
    disclaimer: { mode: "default" },
  }

  const onPickLogo = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      e.target.value = ""
      if (!f) return
      setLogoError(null)
      const url = await fileToCompressedLogoDataUrl(f)
      if (!url) {
        setLogoError(t("setup.errorLogo"))
        return
      }
      if (url.length > MAX_DATA_URL_CHARS) {
        setLogoError(t("setup.errorLogo"))
        return
      }
      setLogoDataUrl(url)
    },
    [t]
  )

  const buildDisclaimer = (): DisclaimerConfig | null => {
    if (disclaimerMode === "hidden") return { mode: "hidden" }
    if (disclaimerMode === "default") return { mode: "default" }
    const nextContent = (["en", "es"] as const).reduce(
      (acc, locale) => {
        const translation = customContent[locale]
        acc[locale] = {
          title: translation.title.trim(),
          body: translation.body.trim(),
        }
        return acc
      },
      {} as Record<DisclaimerLocale, DisclaimerTranslation>
    )
    if (
      !nextContent.en.title ||
      !nextContent.en.body ||
      !nextContent.es.title ||
      !nextContent.es.body
    ) {
      return null
    }
    return { mode: "custom", content: nextContent }
  }

  const validateBrand = (): boolean => {
    const name = appName.trim()
    if (!name) {
      setNameError(true)
      return false
    }
    const p = normalizeHex(primary)
    const a = normalizeHex(accent)
    const bg = normalizeHex(background)
    return Boolean(p && a && bg)
  }

  const handleNextFromBrand = () => {
    setSaveError(null)
    if (!validateBrand()) return
    setStep(2)
  }

  const handleSave = async () => {
    setSaveError(null)
    const brand = normalizedBrandFields(appName, primary, accent, background)
    if (!brand) {
      if (!appName.trim()) setNameError(true)
      setStep(1)
      return
    }

    const disclaimer = buildDisclaimer()
    if (!disclaimer) {
      setDisclaimerCustomError(true)
      return
    }
    setDisclaimerCustomError(false)

    const payload: ProjectBranding = {
      appName: brand.name,
      logoDataUrl,
      primary: brand.primary,
      accent: brand.accent,
      background: brand.background,
      disclaimer,
    }

    setSaving(true)
    try {
      await onSave(payload)
      setStep(3)
    } catch (e) {
      setSaveError(
        e instanceof Error && e.message
          ? e.message
          : t("setup.errorSave")
      )
    } finally {
      setSaving(false)
    }
  }

  const welcomeCards = buildWelcomeCards(t)
  const successTips = buildSuccessTips(t)

  if (!open) return null

  const localePill = (code: Locale) => (
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

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return <SetupWelcomeStep cards={welcomeCards} />
      case 1:
        return (
          <SetupBrandStep
            previewBranding={previewBranding}
            appName={appName}
            onAppNameChange={(v) => {
              setAppName(v)
              setNameError(false)
            }}
            nameError={nameError}
            onPickLogo={onPickLogo}
            logoDataUrl={logoDataUrl}
            onRemoveLogo={() => {
              setLogoDataUrl(null)
              setLogoError(null)
            }}
            logoError={logoError}
            primary={primary}
            accent={accent}
            background={background}
            onPrimaryChange={setPrimary}
            onAccentChange={setAccent}
            onBackgroundChange={setBackground}
            t={t}
          />
        )
      case 2:
        return (
          <SetupLegalStep
            disclaimerMode={disclaimerMode}
            onDisclaimerModeChange={(mode) => {
              setDisclaimerMode(mode)
              setDisclaimerCustomError(false)
            }}
            customContent={customContent}
            onCustomTranslationChange={(targetLocale, field, value) => {
              setCustomContent((current) => ({
                ...current,
                [targetLocale]: {
                  ...current[targetLocale],
                  [field]: value,
                },
              }))
            }}
            disclaimerCustomError={disclaimerCustomError}
            saveError={saveError}
            t={t}
          />
        )
      case 3:
        return <SetupSuccessStep tips={successTips} />
    }
  }

  return (
    <section
      data-doc="setup-wizard"
      className="mx-auto w-full max-w-5xl rounded-[28px] border border-border/70 bg-card/95 shadow-[0_24px_90px_-32px_rgba(0,0,0,0.45)] backdrop-blur"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,26rem)]">
        <div className="min-w-0 border-b border-border/60 p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SetupWizardStepper step={step} className="flex-1" />
            <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
              <span className="text-xs font-medium text-muted-foreground">
                {t("nav.language")}
              </span>
              <fieldset className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                <legend className="sr-only">{t("nav.language")}</legend>
                {localePill("en")}
                {localePill("es")}
              </fieldset>
            </div>
          </div>

          <div className="text-left">
            <p className="text-xs font-medium text-muted-foreground">
              {stepKicker(step, t)}
            </p>
            <h2 className="pt-1 text-xl font-semibold text-foreground sm:text-2xl">
              {stepTitle(step, t)}
            </h2>
            {stepDescription(step, t) ? (
              <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
                {stepDescription(step, t)}
              </p>
            ) : null}
          </div>

          {renderStepContent()}
        </div>

        <aside className="flex min-h-full flex-col justify-between bg-muted/20 p-6 lg:p-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("setup.sideKicker")}
            </p>
            <h3 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
              {t("setup.sideTitle")}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("setup.sideBody")}
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t("setup.preview")}
            </p>
            <div
              className="rounded-xl border border-border/60 p-5"
              style={{ backgroundColor: previewBranding.background }}
            >
              <p
                className="text-lg font-semibold"
                style={{ color: previewBranding.primary }}
              >
                {previewBranding.appName}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <SetupWizardFooter
        step={step}
        saving={saving}
        onBack={() => {
          setSaveError(null)
          setStep((step - 1) as SetupStep)
        }}
        onContinue={() => setStep(1)}
        onNextBrand={handleNextFromBrand}
        onSave={handleSave}
        onDismiss={onDismiss}
        t={t}
      />
    </section>
  )
}
