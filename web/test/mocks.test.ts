import { describe, expect, it, vi } from "vitest"
import { mockBranding, mockBrandingContext } from "./mocks"

describe("test/mocks", () => {
  it("exposes a reusable branding fixture", () => {
    expect(mockBranding.appName).toBe("Test Notes")
    expect(mockBranding.disclaimer).toEqual({ mode: "default" })
  })

  it("creates overridable branding contexts", async () => {
    const saveProjectSetup = vi.fn().mockResolvedValue(undefined)
    const dismissProjectSetup = vi.fn()

    const ctx = mockBrandingContext({
      setupComplete: false,
      saveProjectSetup,
      dismissProjectSetup,
    })

    expect(ctx.branding).toBe(mockBranding)
    expect(ctx.setupReady).toBe(true)
    expect(ctx.setupComplete).toBe(false)
    await ctx.saveProjectSetup(mockBranding)
    ctx.dismissProjectSetup()
    expect(saveProjectSetup).toHaveBeenCalledWith(mockBranding)
    expect(dismissProjectSetup).toHaveBeenCalledOnce()
  })

  it("provides callable defaults when no overrides are passed", async () => {
    const ctx = mockBrandingContext()

    await expect(ctx.saveProjectSetup(mockBranding)).resolves.toBeUndefined()
    expect(ctx.dismissProjectSetup()).toBeUndefined()
  })
})
