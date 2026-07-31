"use client"

import { CreateNoteForm } from "@/components/create-note-form"
import { DisclaimerModal } from "@/components/disclaimer-modal"
import { ProjectSetupModal } from "@/components/project-setup-modal"
import { useBranding } from "@/lib/branding-provider"
import { useLocale } from "@/lib/locale-provider"
import { Shield } from "lucide-react"

export function HomePageClient() {
  const { t } = useLocale()
  const { branding, setupReady, setupComplete, saveProjectSetup, dismissProjectSetup } =
    useBranding()
  const showSetupWizard = setupReady && !setupComplete

  if (showSetupWizard) {
    return (
      <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top,rgba(0,154,222,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_55%)] bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="w-full space-y-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {t("home.setup.kicker")}
              </p>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {t("home.setup.title")}
              </h1>
              <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("home.setup.banner")}
              </p>
            </div>
            <ProjectSetupModal
              open
              initialBranding={branding}
              onSave={saveProjectSetup}
              onDismiss={dismissProjectSetup}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-background">
      <DisclaimerModal />
      <div className="container mx-auto flex w-full flex-1 flex-col max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 text-center sm:mb-12">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-accent/20 p-3 sm:p-4">
              {branding.logoDataUrl ? (
                <img
                  src={branding.logoDataUrl}
                  alt=""
                  className="h-12 w-12 object-contain"
                  width={48}
                  height={48}
                />
              ) : (
                <Shield className="h-12 w-12 text-accent" aria-hidden />
              )}
            </div>
          </div>
          <h1 className="mb-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {branding.appName}
          </h1>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("home.tagline")}
          </p>
        </header>

        <CreateNoteForm />

        <footer className="mt-auto border-t border-border/50 pt-6 text-center text-sm text-muted-foreground sm:pt-8">
          <div className="space-y-2">
            <p className="leading-relaxed">{t("home.footer.features")}</p>
            <p className="text-xs leading-relaxed">{t("home.footer.detail")}</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
