"use client"

import type { LucideIcon } from "lucide-react"
import {
  CheckCircle2,
  Link2,
  Palette,
  PenLine,
  Scale,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type {
  DisclaimerConfig,
  DisclaimerLocale,
  DisclaimerTranslation,
  ProjectBranding,
} from "@/lib/project-branding"
import { cn } from "@/lib/utils"
import type { SetupStep } from "@/components/setup-wizard-stepper"

type WelcomeCard = Readonly<{ icon: LucideIcon; title: string; desc: string }>
type SuccessTip = Readonly<{ icon: LucideIcon; title: string; desc: string }>
type DisclaimerMode = DisclaimerConfig["mode"]

export type SetupBrandStepProps = Readonly<{
  previewBranding: ProjectBranding
  appName: string
  onAppNameChange: (v: string) => void
  nameError: boolean
  onPickLogo: (e: React.ChangeEvent<HTMLInputElement>) => void
  logoDataUrl: string | null
  onRemoveLogo: () => void
  logoError: string | null
  primary: string
  accent: string
  background: string
  onPrimaryChange: (v: string) => void
  onAccentChange: (v: string) => void
  onBackgroundChange: (v: string) => void
  t: (key: string) => string
}>

export function SetupWelcomeStep({ cards }: Readonly<{ cards: WelcomeCard[] }>) {
  return (
    <div className="mt-6 space-y-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="flex gap-3 rounded-lg border border-border bg-muted/20 p-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/15">
            <card.icon className="h-4 w-4 text-accent" aria-hidden />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-foreground">{card.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{card.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SetupBrandStep({
  previewBranding,
  appName,
  onAppNameChange,
  nameError,
  onPickLogo,
  logoDataUrl,
  onRemoveLogo,
  logoError,
  primary,
  accent,
  background,
  onPrimaryChange,
  onAccentChange,
  onBackgroundChange,
  t,
}: SetupBrandStepProps) {
  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">{t("setup.preview")}</p>
        <div
          className="flex flex-col items-center gap-2 rounded-md border border-border p-4"
          style={{ backgroundColor: previewBranding.background }}
        >
          <div className="rounded-full bg-accent/20 p-3">
            {previewBranding.logoDataUrl ? (
              <img
                src={previewBranding.logoDataUrl}
                alt=""
                className="h-10 w-10 object-contain"
              />
            ) : (
              <Shield
                className="h-10 w-10"
                style={{ color: previewBranding.accent }}
                aria-hidden
              />
            )}
          </div>
          <p
            className="text-center text-lg font-semibold"
            style={{ color: previewBranding.primary }}
          >
            {previewBranding.appName}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="setup-app-name">{t("setup.appName")}</Label>
        <Input
          id="setup-app-name"
          value={appName}
          onChange={(e) => onAppNameChange(e.target.value)}
          maxLength={80}
          aria-invalid={nameError}
          className={nameError ? "border-destructive" : undefined}
        />
        {nameError ? (
          <p className="text-xs text-destructive">{t("setup.errorName")}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="setup-logo">{t("setup.logo")}</Label>
        <Input
          id="setup-logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onPickLogo}
          className="cursor-pointer text-sm"
        />
        <p className="text-xs text-muted-foreground">{t("setup.logoHint")}</p>
        {logoDataUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-xs text-muted-foreground"
            onClick={onRemoveLogo}
          >
            {t("setup.logoRemove")}
          </Button>
        ) : null}
        {logoError ? <p className="text-xs text-destructive">{logoError}</p> : null}
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium text-foreground">{t("setup.colors")}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="setup-primary" className="text-xs">
              {t("setup.primary")}
            </Label>
            <Input
              id="setup-primary"
              type="color"
              value={primary}
              onChange={(e) => onPrimaryChange(e.target.value)}
              className="h-10 w-full cursor-pointer p-1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setup-accent" className="text-xs">
              {t("setup.accent")}
            </Label>
            <Input
              id="setup-accent"
              type="color"
              value={accent}
              onChange={(e) => onAccentChange(e.target.value)}
              className="h-10 w-full cursor-pointer p-1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setup-bg" className="text-xs">
              {t("setup.background")}
            </Label>
            <Input
              id="setup-bg"
              type="color"
              value={background}
              onChange={(e) => onBackgroundChange(e.target.value)}
              className="h-10 w-full cursor-pointer p-1"
            />
          </div>
        </div>
      </fieldset>
    </div>
  )
}

export type SetupLegalStepProps = Readonly<{
  disclaimerMode: DisclaimerMode
  onDisclaimerModeChange: (mode: DisclaimerMode) => void
  customContent: Record<DisclaimerLocale, DisclaimerTranslation>
  onCustomTranslationChange: (
    locale: DisclaimerLocale,
    field: keyof DisclaimerTranslation,
    value: string
  ) => void
  disclaimerCustomError: boolean
  saveError: string | null
  t: (key: string) => string
}>

export function SetupLegalStep({
  disclaimerMode,
  onDisclaimerModeChange,
  customContent,
  onCustomTranslationChange,
  disclaimerCustomError,
  saveError,
  t,
}: SetupLegalStepProps) {
  return (
    <div className="mt-6 space-y-5">
      <fieldset className="space-y-3">
        <legend className="sr-only">{t("setup.legalTitle")}</legend>
        <RadioGroup
          value={disclaimerMode}
          onValueChange={(v) => onDisclaimerModeChange(v as DisclaimerMode)}
          className="space-y-3"
        >
          {(
            [
              ["hidden", "setup.disclaimerHidden", "setup.disclaimerHiddenDesc"],
              ["default", "setup.disclaimerDefault", "setup.disclaimerDefaultDesc"],
              ["custom", "setup.disclaimerCustom", "setup.disclaimerCustomDesc"],
            ] as const
          ).map(([value, titleKey, descKey]) => (
            <label
              key={value}
              htmlFor={`disclaimer-${value}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                disclaimerMode === value
                  ? "border-accent bg-accent/5"
                  : "border-border bg-muted/20",
              )}
            >
              <RadioGroupItem value={value} id={`disclaimer-${value}`} className="mt-0.5" />
              <div className="grid flex-1 gap-1">
                <span className="text-sm font-medium leading-snug text-foreground">
                  {t(titleKey)}
                </span>
                <span className="text-xs text-muted-foreground">{t(descKey)}</span>
              </div>
            </label>
          ))}
        </RadioGroup>
        {disclaimerMode === "default" ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("setup.disclaimerDefaultDesc")}
            </p>
            <div className="space-y-3 rounded-md border border-border/80 bg-background/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("setup.preview")}
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {t("disclaimer.title")}
                </p>
                {t("disclaimer.body")
                  .split("\n\n")
                  .map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 48)}
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        ) : null}
        {disclaimerMode === "custom" ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("setup.disclaimerCustomHint")}
            </p>
            {(["en", "es"] as const).map((locale) => (
              <div key={locale} className="space-y-3 rounded-md border border-border/80 bg-background/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {locale === "en" ? t("setup.languageEnglish") : t("setup.languageSpanish")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor={`disclaimer-custom-title-${locale}`}>
                    {t("setup.disclaimerTitle")}
                  </Label>
                  <Input
                    id={`disclaimer-custom-title-${locale}`}
                    value={customContent[locale].title}
                    onChange={(e) =>
                      onCustomTranslationChange(locale, "title", e.target.value)
                    }
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`disclaimer-custom-body-${locale}`}>
                    {t("setup.disclaimerBody")}
                  </Label>
                  <Textarea
                    id={`disclaimer-custom-body-${locale}`}
                    value={customContent[locale].body}
                    onChange={(e) =>
                      onCustomTranslationChange(locale, "body", e.target.value)
                    }
                    rows={5}
                    maxLength={12000}
                    className="min-h-[100px] resize-y"
                  />
                </div>
              </div>
            ))}
            {disclaimerCustomError ? (
              <p className="text-xs text-destructive">{t("setup.errorDisclaimerCustom")}</p>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      {saveError ? (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      ) : null}
    </div>
  )
}

export function SetupSuccessStep({ tips }: Readonly<{ tips: SuccessTip[] }>) {
  return (
    <div className="mt-6 space-y-5">
      <div className="flex justify-center">
        <div className="rounded-full bg-emerald-500/15 p-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" aria-hidden />
        </div>
      </div>
      <div className="space-y-3">
        {tips.map((tip) => (
          <div
            key={tip.title}
            className="flex gap-3 rounded-lg border border-border bg-muted/20 p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/15">
              <tip.icon className="h-4 w-4 text-accent" aria-hidden />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">{tip.title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export type SetupWizardFooterProps = Readonly<{
  step: SetupStep
  saving: boolean
  onBack: () => void
  onContinue: () => void
  onNextBrand: () => void
  onSave: () => void
  onDismiss: () => void
  t: (key: string) => string
}>

export function SetupWizardFooter({
  step,
  saving,
  onBack,
  onContinue,
  onNextBrand,
  onSave,
  onDismiss,
  t,
}: SetupWizardFooterProps) {
  const showBack = step === 1 || step === 2

  return (
    <div className="shrink-0 flex flex-col gap-2 border-t border-border bg-muted/30 p-4 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.25)] sm:flex-row sm:justify-between">
      {showBack ? (
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={saving}
          onClick={onBack}
        >
          {t("setup.back")}
        </Button>
      ) : (
        <span className="hidden sm:block sm:flex-1" aria-hidden />
      )}

      {step === 0 ? (
        <Button type="button" className="w-full sm:ml-auto sm:w-auto" onClick={onContinue}>
          {t("setup.continue")}
        </Button>
      ) : null}

      {step === 1 ? (
        <Button type="button" className="w-full sm:ml-auto sm:w-auto" onClick={onNextBrand}>
          {t("setup.next")}
        </Button>
      ) : null}

      {step === 2 ? (
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? t("setup.saving") : t("setup.save")}
        </Button>
      ) : null}

      {step === 3 ? (
        <Button type="button" className="w-full sm:ml-auto sm:w-auto" onClick={onDismiss}>
          {t("setup.openApp")}
        </Button>
      ) : null}
    </div>
  )
}

export function buildWelcomeCards(t: (key: string) => string): WelcomeCard[] {
  return [
    { icon: Palette, title: t("setup.welcomeBrandTitle"), desc: t("setup.welcomeBrandDesc") },
    { icon: Scale, title: t("setup.welcomeLegalTitle"), desc: t("setup.welcomeLegalDesc") },
    { icon: Shield, title: t("setup.welcomeZkTitle"), desc: t("setup.welcomeZkDesc") },
  ]
}

export function buildSuccessTips(t: (key: string) => string): SuccessTip[] {
  return [
    { icon: PenLine, title: t("setup.successTipCreate"), desc: t("setup.successTipCreateDesc") },
    { icon: Link2, title: t("setup.successTipShare"), desc: t("setup.successTipShareDesc") },
  ]
}
