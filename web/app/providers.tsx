"use client"

import type { ReactNode } from "react"
import { Toaster } from "sonner"
import { LocaleProvider } from "@/lib/locale-provider"
import { BrandingProvider } from "@/lib/branding-provider"
import { HomeOnlyFooter } from "@/components/home-only-footer"

type ProvidersProps = Readonly<{
  children: ReactNode
  githubRepoUrl: string | null
}>

export function Providers({ children, githubRepoUrl }: ProvidersProps) {
  return (
    <LocaleProvider>
      <BrandingProvider>
        <div className="flex min-h-dvh flex-col px-safe">
          <div className="flex flex-1 flex-col">{children}</div>
          <HomeOnlyFooter githubRepoUrl={githubRepoUrl} />
          <Toaster richColors position="bottom-center" />
        </div>
      </BrandingProvider>
    </LocaleProvider>
  )
}
