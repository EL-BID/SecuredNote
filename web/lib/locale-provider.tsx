"use client"

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Locale } from "@/lib/dictionaries"
import { translate } from "@/lib/dictionaries"

const STORAGE_KEY = "secured-note-locale"

type LocaleContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function readStoredLocale(): Locale {
  if (globalThis.window === undefined) return "en"
  const v = globalThis.localStorage?.getItem(STORAGE_KEY)
  return v === "es" ? "es" : "en"
}

export function applyLocaleToDocument(l: Locale) {
  if (globalThis.window === undefined) return
  document.documentElement.lang = l === "es" ? "es" : "en"
  globalThis.localStorage?.setItem(STORAGE_KEY, l)
}

export function LocaleProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, setLocale] = useState<Locale>("en")

  useLayoutEffect(() => {
    const stored = readStoredLocale()
    setLocale(stored)
    applyLocaleToDocument(stored)
  }, [])

  const changeLocale = useCallback((l: Locale) => {
    applyLocaleToDocument(l)
    setLocale(l)
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale]
  )

  const value = useMemo(
    () => ({ locale, setLocale: changeLocale, t }),
    [locale, changeLocale, t]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider")
  }
  return ctx
}
