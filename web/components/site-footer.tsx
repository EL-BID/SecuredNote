"use client"

import { Code2 } from "lucide-react"
import { getGithubRepoUrl } from "@/lib/github-repo"
import { useLocale } from "@/lib/locale-provider"
import type { Locale } from "@/lib/dictionaries"

type Props = Readonly<{
  githubRepoUrl: string | null
}>

export function SiteFooter({ githubRepoUrl: githubRepoUrlFromServer }: Props) {
  const { locale, setLocale, t } = useLocale()
  const href = githubRepoUrlFromServer ?? getGithubRepoUrl()

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

  return (
    <footer className="mt-auto border-t border-border/40 bg-muted/20 pb-safe">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2.5 px-4 py-4 text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <span className="text-xs font-medium">{t("nav.language")}</span>
          <fieldset className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
            <legend className="sr-only">{t("nav.language")}</legend>
            {pill("en")}
            {pill("es")}
          </fieldset>
        </div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("github.aria")}
            className="inline-flex max-w-sm items-center justify-center gap-1.5 text-balance break-words text-center text-xs text-muted-foreground/90 underline-offset-2 transition hover:text-foreground hover:underline"
          >
            <Code2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {t("github.link")}
          </a>
        ) : null}
      </div>
    </footer>
  )
}
