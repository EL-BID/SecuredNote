import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
} from "./safe-local-storage"

describe("safe-local-storage", () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reads and writes values", () => {
    expect(safeLocalStorageSetItem("a", "1")).toBe(true)
    expect(safeLocalStorageGetItem("a")).toBe("1")
    expect(safeLocalStorageRemoveItem("a")).toBe(true)
    expect(safeLocalStorageGetItem("a")).toBeNull()
  })

  it("returns false when setItem throws", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("quota")
      },
    })
    expect(safeLocalStorageSetItem("x", "y")).toBe(false)
  })

  it("returns null when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined)
    expect(safeLocalStorageGetItem("missing")).toBeNull()
  })

  it("returns false when removeItem throws", () => {
    vi.stubGlobal("localStorage", {
      removeItem: () => {
        throw new Error("blocked")
      },
    })
    expect(safeLocalStorageRemoveItem("x")).toBe(false)
  })

  it("returns null when getItem throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked")
      },
    })
    expect(safeLocalStorageGetItem("x")).toBeNull()
  })
})
