import { afterEach, describe, expect, it, vi } from "vitest"
import { applyLocaleToDocument, readStoredLocale } from "./locale-provider"

describe("locale-provider internal guards", () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock("react")
  })

  it("covers the direct locale helpers with and without browser globals", () => {
    const originalWindow = globalThis.window
    const originalDocument = globalThis.document
    const originalLocalStorage = globalThis.localStorage
    const storage = { getItem: () => "es", setItem: vi.fn() }

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: storage },
    })
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage,
    })
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { documentElement: { lang: "en" } },
    })

    expect(readStoredLocale()).toBe("es")
    applyLocaleToDocument("es")
    expect(document.documentElement.lang).toBe("es")

    Reflect.deleteProperty(globalThis, "window")
    Reflect.deleteProperty(globalThis, "document")
    expect(readStoredLocale()).toBe("en")
    expect(() => applyLocaleToDocument("en")).not.toThrow()

    globalThis.window = originalWindow
    globalThis.document = originalDocument
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    })
  })

  it("falls back safely when window is unavailable", async () => {
    const originalWindow = globalThis.window
    const originalDocument = globalThis.document
    const setState = vi.fn()

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react")
      return {
        ...actual,
        useState: vi.fn(() => ["en", setState]),
        useLayoutEffect: vi.fn((cb: () => void) => cb()),
        useCallback: vi.fn((fn: unknown) => fn),
        useMemo: vi.fn((fn: () => unknown) => fn()),
      }
    })

    Reflect.deleteProperty(globalThis, "window")
    Reflect.deleteProperty(globalThis, "document")

    const { LocaleProvider } = await import("./locale-provider")
    const element = LocaleProvider({ children: "child" })
    const value = (element as { props: { value: { locale: string; setLocale: (l: "en" | "es") => void } } }).props.value

    expect(value.locale).toBe("en")
    expect(() => value.setLocale("es")).not.toThrow()

    globalThis.window = originalWindow
    globalThis.document = originalDocument
  })
})
