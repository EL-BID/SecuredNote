import { afterEach, describe, expect, it, vi } from "vitest"
import { getBrandingBootstrapInlineScript } from "./branding-bootstrap-inline"
import {
  PROJECT_BRANDING_KEY,
  PROJECT_SETUP_DONE_KEY,
} from "./project-branding"

describe("branding-bootstrap-inline", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("embeds the expected storage keys", () => {
    const script = getBrandingBootstrapInlineScript()
    expect(script).toContain(PROJECT_BRANDING_KEY)
    expect(script).toContain(PROJECT_SETUP_DONE_KEY)
  })

  it("applies normalized branding values from localStorage", () => {
    const setProperty = vi.fn()
    vi.stubGlobal("document", {
      documentElement: {
        style: { setProperty },
      },
    })
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => {
        if (key === PROJECT_SETUP_DONE_KEY) return "1"
        if (key === PROJECT_BRANDING_KEY) {
          return JSON.stringify({
            primary: "ABCDEF",
            accent: "#123456",
            background: "#000000",
          })
        }
        return null
      },
    })

    new Function(getBrandingBootstrapInlineScript())()

    expect(setProperty).toHaveBeenCalledWith("--background", "#000000")
    expect(setProperty).toHaveBeenCalledWith("--primary", "#abcdef")
    expect(setProperty).toHaveBeenCalledWith("--accent", "#123456")
    expect(setProperty).toHaveBeenCalledWith("--foreground", "#f0f9ff")
  })

  it("does nothing when setup is incomplete or branding is invalid", () => {
    const setProperty = vi.fn()
    vi.stubGlobal("document", {
      documentElement: {
        style: { setProperty },
      },
    })
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => {
        if (key === PROJECT_SETUP_DONE_KEY) return "0"
        return "{bad-json"
      },
    })

    new Function(getBrandingBootstrapInlineScript())()

    expect(setProperty).not.toHaveBeenCalled()
  })
})
