import { render, type RenderOptions } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { LocaleProvider } from "@/lib/locale-provider"

export function renderWithLocale(ui: ReactElement, options?: RenderOptions) {
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <LocaleProvider>{children}</LocaleProvider>
  }
  return render(ui, { wrapper: Wrapper, ...options })
}

export function mockUseLocale(t: (key: string) => string = (k) => k) {
  return {
    locale: "en" as const,
    setLocale: () => {},
    t,
  }
}
