import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { useLocale } from "@/lib/locale-provider"
import { mockUseLocale, renderWithLocale } from "./test-utils"

function Probe() {
  const { locale, t } = useLocale()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated">{t("nav.en")}</span>
    </div>
  )
}

describe("test-utils", () => {
  it("renders with the locale provider wrapper", () => {
    renderWithLocale(<Probe />)
    expect(screen.getByTestId("locale")).toHaveTextContent("en")
    expect(screen.getByTestId("translated")).toHaveTextContent("EN")
  })

  it("builds a mock locale object", () => {
    const locale = mockUseLocale((key) => `tx:${key}`)
    expect(locale.locale).toBe("en")
    expect(locale.t("x")).toBe("tx:x")
    expect(locale.setLocale()).toBeUndefined()
  })

  it("uses the default key passthrough translator when no override is provided", () => {
    const locale = mockUseLocale()
    expect(locale.t("plain.key")).toBe("plain.key")
  })
})
