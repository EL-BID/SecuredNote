import { describe, expect, it, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { LocaleProvider, useLocale } from "./locale-provider"

function Probe() {
  const { locale, t, setLocale } = useLocale()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="title">{t("home.title")}</span>
      <button type="button" onClick={() => setLocale("es")}>
        set-es
      </button>
    </div>
  )
}

describe("LocaleProvider", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = "en"
  })

  it("provides locale and translate", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )
    expect(screen.getByTestId("locale")).toHaveTextContent("en")
    expect(screen.getByTestId("title")).toHaveTextContent("Secured Note")
  })

  it("reads stored locale and persists locale changes", () => {
    localStorage.setItem("secured-note-locale", "es")
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )
    expect(screen.getByTestId("locale")).toHaveTextContent("es")
    expect(document.documentElement.lang).toBe("es")

    fireEvent.click(screen.getByRole("button", { name: "set-es" }))
    expect(localStorage.getItem("secured-note-locale")).toBe("es")
  })

  it("falls back to english for an unsupported stored locale", () => {
    localStorage.setItem("secured-note-locale", "fr")
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )

    expect(screen.getByTestId("locale")).toHaveTextContent("en")
    expect(document.documentElement.lang).toBe("en")
  })

  it("throws when used outside the provider", () => {
    expect(() => render(<Probe />)).toThrow("useLocale must be used within LocaleProvider")
  })
})
