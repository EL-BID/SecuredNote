import { afterEach, describe, expect, it } from "vitest"
import { getNoteOrigin, resolveAttemptsRemaining } from "./page"

describe("NotePage helper branches", () => {
  afterEach(() => {
    if (typeof window !== "undefined") {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: window,
      })
    }
  })

  it("falls back to the default attempts count when the API omits it", () => {
    expect(resolveAttemptsRemaining(undefined)).toBe(2)
    expect(resolveAttemptsRemaining(1)).toBe(1)
  })

  it("returns an empty origin when window.location.origin is unavailable", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: {} },
    })

    expect(getNoteOrigin()).toBe("")
  })
})
