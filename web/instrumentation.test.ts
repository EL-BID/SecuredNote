import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("instrumentation", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.NEXT_RUNTIME
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("starts sqlite lifecycle in node runtime", async () => {
    const startSqliteLifecycle = vi.fn()
    process.env.NEXT_RUNTIME = "nodejs"
    vi.doMock("./lib/server/lifecycle", () => ({
      startSqliteLifecycle,
    }))

    const { register } = await import("./instrumentation")
    await register()

    expect(startSqliteLifecycle).toHaveBeenCalledOnce()
  })

  it("skips sqlite lifecycle outside node runtime", async () => {
    const startSqliteLifecycle = vi.fn()
    process.env.NEXT_RUNTIME = "edge"
    vi.doMock("./lib/server/lifecycle", () => ({
      startSqliteLifecycle,
    }))

    const { register } = await import("./instrumentation")
    await register()

    expect(startSqliteLifecycle).not.toHaveBeenCalled()
  })
})
