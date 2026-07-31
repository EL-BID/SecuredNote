import type React from "react"
import type { Metadata, Viewport } from "next"
import { Open_Sans } from "next/font/google"
import { Suspense } from "react"
import Script from "next/script"
import { getSafeGa4MeasurementId } from "@/lib/ga"
import { getBrandingBootstrapInlineScript } from "@/lib/branding-bootstrap-inline"
import {
  brandingCssVariablesToInlineStyle,
  getBrandingCssVariables,
} from "@/lib/brand-theme-css"
import { DEFAULT_PROJECT_BRANDING } from "@/lib/project-branding"
import { getGithubRepoUrlFromRuntimeEnv } from "@/lib/github-repo"
import { Providers } from "@/app/providers"
import "./globals.css"

export function normalizeSiteUrl(raw: string | undefined): string | undefined {
  const normalized = (raw || "").trim().replace(/\/$/, "")
  return normalized || undefined
}

export function buildSiteMetadata(siteUrl: string | undefined): Metadata {
  return {
    title: "Secured Note - Ephemeral Encrypted Notes",
    applicationName: "Secured Note",
    description: "Share sensitive information securely with self-destructing encrypted notes. End-to-end encryption with zero-knowledge architecture.",
    keywords: ["encrypted notes", "secure messaging", "ephemeral", "self-destructing", "privacy"],
    authors: [{ name: "Secured Note" }],
    robots: "index, follow",
    appleWebApp: {
      title: "Secured Note",
    },
    openGraph: {
      title: "Secured Note - Ephemeral Encrypted Notes",
      description: "Share sensitive information securely with self-destructing encrypted notes",
      type: "website",
      ...(siteUrl ? { url: siteUrl } : {}),
    },
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  }
}

export function buildGaScriptSrc(gaId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`
}

export function buildGaConfigScript(gaId: string): string {
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config',${JSON.stringify(gaId)});`
}

export const renderGaScripts = (gaId: string) => (
  <>
    <Script src={buildGaScriptSrc(gaId)} strategy="afterInteractive" />
    <Script id="ga4-config" strategy="afterInteractive">
      {buildGaConfigScript(gaId)}
    </Script>
  </>
)

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-open-sans",
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#001a28" },
    { media: "(prefers-color-scheme: dark)", color: "#001a28" },
  ],
}

export const metadata: Metadata = buildSiteMetadata(
  normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const gaId = getSafeGa4MeasurementId()
  const defaultThemeStyle = brandingCssVariablesToInlineStyle(
    getBrandingCssVariables(DEFAULT_PROJECT_BRANDING)
  )
  const githubRepoUrl = getGithubRepoUrlFromRuntimeEnv()

  return (
    <html lang="en" style={defaultThemeStyle}>
      <head />
      <body className={`font-sans ${openSans.variable} antialiased`}>
        <Script id="brand-bootstrap" strategy="beforeInteractive">
          {getBrandingBootstrapInlineScript()}
        </Script>
        {gaId ? renderGaScripts(gaId) : null}
        <Providers githubRepoUrl={githubRepoUrl}>
          <Suspense fallback={null}>{children}</Suspense>
        </Providers>
      </body>
    </html>
  )
}
