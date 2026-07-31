import { describe, expect, it } from "vitest"
import {
  applyBrandingTheme,
  brandingCssVariablesToInlineStyle,
  clearBrandingThemeOverrides,
  getBrandingCssVariables,
} from "./brand-theme-css"
import type { ProjectBranding } from "./project-branding"

const branding: ProjectBranding = {
  appName: "Demo",
  logoDataUrl: null,
  primary: "#004e70",
  accent: "#009ade",
  background: "#001a28",
  disclaimer: { mode: "default" },
}

describe("brand-theme-css", () => {
  it("derives CSS variables from branding", () => {
    const vars = getBrandingCssVariables(branding)
    expect(vars["--primary"]).toBe("#004e70")
    expect(vars["--background"]).toBe("#001a28")
  })

  it("uses light foreground on light background", () => {
    const light: ProjectBranding = {
      ...branding,
      background: "#ffffff",
    }
    const vars = getBrandingCssVariables(light)
    expect(vars["--foreground"]).toBe("#0a0a0a")
  })

  it("converts variables to inline style object", () => {
    const vars = getBrandingCssVariables(branding)
    const style = brandingCssVariablesToInlineStyle(vars)
    expect(style["--primary"]).toBe("#004e70")
  })

  it("applies and clears theme on document", () => {
    applyBrandingTheme(branding)
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "#004e70",
    )
    clearBrandingThemeOverrides()
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("")
  })

  it("falls back safely when invalid colors are provided", () => {
    const vars = getBrandingCssVariables({
      ...branding,
      accent: "invalid",
      background: "invalid",
    })

    expect(vars["--background"]).toBe("invalid")
    expect(vars["--muted-foreground"]).toBe("#f0f9ff")
  })

  it("no-ops theme helpers when document is unavailable", () => {
    const originalDocument = globalThis.document

    Reflect.deleteProperty(globalThis, "document")
    expect(() => applyBrandingTheme(branding)).not.toThrow()
    expect(() => clearBrandingThemeOverrides()).not.toThrow()

    globalThis.document = originalDocument
  })
})
