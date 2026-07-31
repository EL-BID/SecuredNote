"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { applyBrandingTheme } from "@/lib/brand-theme-css"
import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
} from "@/lib/client/safe-local-storage"
import {
  DEFAULT_PROJECT_BRANDING,
  PROJECT_BRANDING_KEY,
  PROJECT_SETUP_DONE_KEY,
  type ProjectBranding,
  parseProjectConfigGet,
  parseProjectConfigResponse,
  parseStoredBranding,
} from "@/lib/project-branding"

function projectConfigUrl(): string {
  return "/api/project-config"
}

type BrandingContextValue = {
  branding: ProjectBranding
  setupReady: boolean
  setupComplete: boolean
  saveProjectSetup: (b: ProjectBranding) => Promise<void>
  dismissProjectSetup: () => void
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

export function BrandingProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [branding, setBranding] = useState<ProjectBranding>(DEFAULT_PROJECT_BRANDING)
  const [setupReady, setSetupReady] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(projectConfigUrl(), {
          cache: "no-store",
          headers: { Accept: "application/json" },
        })
        if (cancelled) return
        if (res.ok) {
          const data: unknown = await res.json()
          const parsed = parseProjectConfigGet(data)
          if (parsed?.kind === "configured") {
            applyBrandingTheme(parsed.branding)
            setBranding(parsed.branding)
            setSetupComplete(true)
            document.title = `${parsed.branding.appName} - Ephemeral Encrypted Notes`
            safeLocalStorageSetItem(
              PROJECT_BRANDING_KEY,
              JSON.stringify(parsed.branding),
            )
            safeLocalStorageSetItem(PROJECT_SETUP_DONE_KEY, "1")
            setSetupReady(true)
            return
          }
          if (parsed?.kind === "unconfigured") {
            safeLocalStorageRemoveItem(PROJECT_BRANDING_KEY)
            safeLocalStorageRemoveItem(PROJECT_SETUP_DONE_KEY)
            applyBrandingTheme(DEFAULT_PROJECT_BRANDING)
            setBranding(DEFAULT_PROJECT_BRANDING)
            setSetupComplete(false)
            document.title = `${DEFAULT_PROJECT_BRANDING.appName} - Ephemeral Encrypted Notes`
            setSetupReady(true)
            return
          }
        }
      } catch (err) {
        console.debug("project-config fetch failed, using local fallback", err)
      }
      if (cancelled) return
      const done = safeLocalStorageGetItem(PROJECT_SETUP_DONE_KEY) === "1"
      const stored = parseStoredBranding(
        safeLocalStorageGetItem(PROJECT_BRANDING_KEY),
      )
      applyBrandingTheme(stored)
      setBranding(stored)
      setSetupComplete(done)
      document.title = `${stored.appName} - Ephemeral Encrypted Notes`
      setSetupReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persistBranding = useCallback((next: ProjectBranding) => {
    safeLocalStorageSetItem(PROJECT_BRANDING_KEY, JSON.stringify(next))
    applyBrandingTheme(next)
    setBranding(next)
    document.title = `${next.appName} - Ephemeral Encrypted Notes`
  }, [])

  const saveProjectSetup = useCallback(
    async (b: ProjectBranding) => {
      const res = await fetch(projectConfigUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: 1, branding: b }),
      })

      if (res.status === 409) {
        const j = (await res.json().catch(() => null)) as {
          config?: unknown
        } | null
        const fromConflict = j?.config
          ? parseProjectConfigResponse(j.config)
          : null
        persistBranding(fromConflict ?? b)
        return
      }

      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try {
          const err = (await res.json()) as { error?: string }
          if (err?.error) msg = err.error
        } catch (error_) {
          console.debug("Could not parse project-config error body", error_)
        }
        throw new Error(msg)
      }

      const data: unknown = await res.json().catch(() => null)
      const confirmed = data ? parseProjectConfigResponse(data) : null
      persistBranding(confirmed ?? b)
    },
    [persistBranding]
  )

  const dismissProjectSetup = useCallback(() => {
    safeLocalStorageSetItem(PROJECT_SETUP_DONE_KEY, "1")
    setSetupComplete(true)
  }, [])

  const value = useMemo(
    () => ({
      branding,
      setupReady,
      setupComplete,
      saveProjectSetup,
      dismissProjectSetup,
    }),
    [branding, setupReady, setupComplete, saveProjectSetup, dismissProjectSetup]
  )

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext)
  if (!ctx) {
    throw new Error("useBranding must be used within BrandingProvider")
  }
  return ctx
}
