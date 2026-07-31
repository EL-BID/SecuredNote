import { describe, expect, it } from "vitest"
import {
  DEFAULT_PROJECT_BRANDING,
  parseBrandingObject,
  normalizeHex,
  parseDisclaimerField,
  parseBrandingStrict,
  parseDisclaimerStrict,
  parseLocalizedDisclaimerContent,
  parseProjectConfigResponse,
  parseProjectConfigGet,
  parseProjectConfigPayloadStrict,
  parseStoredBranding,
} from "./project-branding"
import { vi } from "vitest"

describe("project-branding parsers", () => {
  it("normalizes hex colors", () => {
    expect(normalizeHex("009ade")).toBe("#009ade")
    expect(normalizeHex("#004E70")).toBe("#004e70")
    expect(normalizeHex("not-a-color")).toBeNull()
  })

  it("parses strict disclaimer modes", () => {
    expect(parseDisclaimerStrict({ mode: "hidden" })).toEqual({ mode: "hidden" })
    expect(parseDisclaimerStrict({ mode: "default" })).toEqual({ mode: "default" })
    expect(parseDisclaimerStrict({ mode: "custom", title: "", body: "x" })).toBeNull()
    expect(
      parseDisclaimerStrict({ mode: "custom", title: "T", body: "Body" }),
    ).toEqual({
      mode: "custom",
      content: {
        en: { title: "T", body: "Body" },
        es: { title: "T", body: "Body" },
      },
    })
    expect(
      parseDisclaimerStrict({
        mode: "custom",
        content: {
          en: { title: "Terms", body: "English body" },
          es: { title: "Términos", body: "Texto español" },
        },
      }),
    ).toEqual({
      mode: "custom",
      content: {
        en: { title: "Terms", body: "English body" },
        es: { title: "Términos", body: "Texto español" },
      },
    })
    expect(parseDisclaimerStrict({ mode: "custom", title: 1, body: {} })).toBeNull()
    expect(parseDisclaimerStrict({ mode: "other" })).toBeNull()
  })

  it("parses localized disclaimer content from locales alias and rejects missing localized payloads", () => {
    expect(parseLocalizedDisclaimerContent(null)).toBeNull()
    expect(parseLocalizedDisclaimerContent("bad")).toBeNull()
    expect(
      parseLocalizedDisclaimerContent({
        locales: {
          en: { title: "Terms", body: "English body" },
          es: { title: "Términos", body: "Texto español" },
        },
      }),
    ).toEqual({
      en: { title: "Terms", body: "English body" },
      es: { title: "Términos", body: "Texto español" },
    })

    expect(parseLocalizedDisclaimerContent({ mode: "custom" })).toBeNull()
    expect(
      parseLocalizedDisclaimerContent({
        content: {
          en: { title: "Only one", body: "Missing spanish" },
        },
      }),
    ).toBeNull()
  })

  it("parses strict branding payload", () => {
    const branding = parseBrandingStrict({
      appName: "Acme Notes",
      primary: "#111111",
      accent: "#222222",
      background: "#333333",
      disclaimer: { mode: "default" },
    })
    expect(branding?.appName).toBe("Acme Notes")
    expect(branding?.primary).toBe("#111111")
  })

  it("parses project config v1 payload", () => {
    const payload = parseProjectConfigPayloadStrict({
      version: 1,
      branding: {
        appName: "Demo",
        primary: "#111111",
        accent: "#222222",
        background: "#333333",
        disclaimer: { mode: "hidden" },
      },
    })
    expect(payload?.version).toBe(1)
    expect(payload?.branding.disclaimer).toEqual({ mode: "hidden" })
  })

  it("detects configured vs unconfigured GET shapes", () => {
    expect(
      parseProjectConfigGet({
        configured: true,
        version: 1,
        branding: {
          appName: "X",
          primary: "#111111",
          accent: "#222222",
          background: "#333333",
          disclaimer: { mode: "default" },
        },
      })?.kind,
    ).toBe("configured")
    expect(parseProjectConfigGet({ configured: false })?.kind).toBe("unconfigured")
    expect(parseProjectConfigGet({ version: 1, branding: {} })?.kind).toBe("configured")
    expect(parseProjectConfigGet({ configured: true })).toBeNull()
  })

  it("falls back when stored branding JSON is invalid", () => {
    const branding = parseStoredBranding("{not-json")
    expect(branding.appName.length).toBeGreaterThan(0)
  })

  it("returns defaults when stored branding is empty or parser inputs are non-objects", () => {
    expect(parseStoredBranding(null)).toEqual(DEFAULT_PROJECT_BRANDING)
    expect(parseProjectConfigResponse("bad")).toBeNull()
    expect(parseProjectConfigGet("bad")).toBeNull()
  })

  it("parses non-strict disclaimer fields with defaults and truncation", () => {
    expect(parseDisclaimerField(null)).toEqual({ mode: "default" })
    expect(parseDisclaimerField("not-an-object")).toEqual({ mode: "default" })
    expect(parseDisclaimerField({ mode: "hidden" })).toEqual({ mode: "hidden" })
    expect(parseDisclaimerField({ mode: "default" })).toEqual({ mode: "default" })
    expect(parseDisclaimerField({ mode: "custom", title: " ", body: "body" })).toEqual({
      mode: "default",
    })
    expect(
      parseDisclaimerField({
        mode: "custom",
        title: "  Long title  ",
        body: `  ${"Body".repeat(4000)}  `,
      }),
    ).toEqual({
      mode: "custom",
      content: {
        en: { title: "Long title", body: "Body".repeat(3000) },
        es: { title: "Long title", body: "Body".repeat(3000) },
      },
    })
    expect(
      parseDisclaimerField({
        mode: "custom",
        content: {
          en: { title: " Terms ", body: " English " },
          es: { title: " Términos ", body: " Español " },
        },
      }),
    ).toEqual({
      mode: "custom",
      content: {
        en: { title: "Terms", body: "English" },
        es: { title: "Términos", body: "Español" },
      },
    })
    expect(
      parseDisclaimerField({ mode: "custom", title: 123, body: ["not-a-string"] }),
    ).toEqual({ mode: "default" })
    expect(parseDisclaimerField({ mode: "other" })).toEqual({ mode: "default" })
  })

  it("parses branding object fallbacks and trims values", () => {
    expect(parseBrandingObject(null)).toEqual(DEFAULT_PROJECT_BRANDING)

    const parsed = parseBrandingObject({
      appName: "  Demo App  ",
      logoDataUrl: "data:image/png;base64,abc",
      primary: "111111",
      accent: "#222222",
      background: "invalid",
      disclaimer: { mode: "custom", title: " T ", body: " B " },
    })

    expect(parsed).toMatchObject({
      appName: "Demo App",
      logoDataUrl: "data:image/png;base64,abc",
      primary: "#111111",
      accent: "#222222",
      background: DEFAULT_PROJECT_BRANDING.background,
      disclaimer: {
        mode: "custom",
        content: {
          en: { title: "T", body: "B" },
          es: { title: "T", body: "B" },
        },
      },
    })

    const fallbackName = parseBrandingObject({
      appName: "   ",
      primary: "#111111",
      accent: "#222222",
      background: "#333333",
    })
    expect(fallbackName.appName).toBe(DEFAULT_PROJECT_BRANDING.appName)
  })

  it("rejects oversized and invalid logo data in branding object", () => {
    const parsed = parseBrandingObject({
      appName: "Demo",
      logoDataUrl: `data:image/png;base64,${"a".repeat(500_000)}`,
      primary: "#111111",
      accent: "#222222",
      background: "#333333",
      disclaimer: { mode: "default" },
    })

    expect(parsed.logoDataUrl).toBeNull()
  })

  it("rejects invalid branding strict payload", () => {
    expect(parseBrandingStrict({ appName: "" })).toBeNull()
    expect(parseBrandingStrict({ appName: 42 })).toBeNull()
    expect(parseBrandingStrict(null)).toBeNull()
    expect(
      parseBrandingStrict({
        appName: "Demo",
        primary: "invalid",
        accent: "#222222",
        background: "#333333",
        disclaimer: { mode: "default" },
      }),
    ).toBeNull()
    expect(
      parseBrandingStrict({
        appName: "Demo",
        primary: "#111111",
        accent: "#222222",
        background: "#333333",
      }),
    ).toBeNull()
    expect(
      parseBrandingStrict({
        appName: "Demo",
        primary: "#111111",
        accent: "#222222",
        background: "#333333",
        logoDataUrl: "https://example.com/logo.png",
        disclaimer: { mode: "default" },
      }),
    ).toMatchObject({ logoDataUrl: null })
    expect(
      parseBrandingStrict({
        appName: "X".repeat(200),
        primary: "#111111",
        accent: "#222222",
        background: "#333333",
        disclaimer: { mode: "default" },
      })?.appName.length,
    ).toBe(80)
  })

  it("parses logo data url when valid", () => {
    const branding = parseBrandingStrict({
      appName: "Logo Co",
      primary: "#111111",
      accent: "#222222",
      background: "#333333",
      logoDataUrl: "data:image/png;base64,abc",
      disclaimer: { mode: "default" },
    })
    expect(branding?.logoDataUrl).toContain("data:image")
  })

  it("parses project-config response variants", () => {
    expect(
      parseProjectConfigResponse({
        configured: true,
        version: 1,
        branding: {
          appName: "Configured",
          primary: "#111111",
          accent: "#222222",
          background: "#333333",
          disclaimer: { mode: "default" },
        },
      })?.appName,
    ).toBe("Configured")

    expect(
      parseProjectConfigResponse({
        version: 1,
        branding: {
          appName: "Legacy",
          primary: "#111111",
          accent: "#222222",
          background: "#333333",
          disclaimer: { mode: "default" },
        },
      })?.appName,
    ).toBe("Legacy")

    expect(parseProjectConfigResponse({ version: 2 })).toBeNull()
  })

  it("rejects invalid project config payloads", () => {
    expect(parseProjectConfigPayloadStrict({ version: 2 })).toBeNull()
    expect(parseProjectConfigPayloadStrict({ version: 1, branding: null })).toBeNull()
    expect(parseProjectConfigPayloadStrict("bad")).toBeNull()
  })

  it("reads branding defaults from environment with fallbacks", async () => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_BRAND_PRIMARY = "123456"
    process.env.NEXT_PUBLIC_BRAND_ACCENT = "#654321"
    process.env.NEXT_PUBLIC_BRAND_BACKGROUND = "bad-color"
    process.env.NEXT_PUBLIC_BRAND_APP_NAME = "X".repeat(300)

    const { DEFAULT_PROJECT_BRANDING: envBranding } = await import("./project-branding")
    expect(envBranding.primary).toBe("#123456")
    expect(envBranding.accent).toBe("#654321")
    expect(envBranding.background).toBe("#001a28")
    expect(envBranding.appName.length).toBe(200)

    delete process.env.NEXT_PUBLIC_BRAND_PRIMARY
    delete process.env.NEXT_PUBLIC_BRAND_ACCENT
    delete process.env.NEXT_PUBLIC_BRAND_BACKGROUND
    delete process.env.NEXT_PUBLIC_BRAND_APP_NAME
    vi.resetModules()
  })

  it("truncates strict custom disclaimer title and body", () => {
    const parsed = parseDisclaimerStrict({
      mode: "custom",
      title: "A".repeat(500),
      body: "B".repeat(20_000),
    })
    expect(parsed).toEqual({
      mode: "custom",
      content: {
        en: { title: "A".repeat(200), body: "B".repeat(12_000) },
        es: { title: "A".repeat(200), body: "B".repeat(12_000) },
      },
    })
  })
})
