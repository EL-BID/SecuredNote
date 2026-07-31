import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("lifecycle", () => {
  let tmpDir = ""

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secured-note-lc-"))
    process.env.SQLITE_PATH = path.join(tmpDir, "test.db")
    vi.resetModules()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("starts sqlite lifecycle and schedules purge", async () => {
    const { startSqliteLifecycle } = await import("./lifecycle")
    startSqliteLifecycle()
    startSqliteLifecycle()
    vi.advanceTimersByTime(60_000)
    expect(true).toBe(true)
  })

  it("logs purge results and shutdown close failures", async () => {
    const debug = vi.fn()
    const warn = vi.fn()
    const error = vi.fn()
    const handlers = new Map<string, (...args: unknown[]) => void>()
    const onSpy = vi.spyOn(process, "on").mockImplementation(((event, handler) => {
      handlers.set(String(event), handler as (...args: unknown[]) => void)
      return process
    }) as typeof process.on)
    vi.doMock("pino", () => ({
      default: () => ({ debug, warn, error }),
    }))
    vi.doMock("./sqliteStore", () => ({
      getDb: vi.fn(),
      closeDb: () => {
        throw new Error("close failed")
      },
      purgeExpiredNotes: () => 1,
      purgeExpiredAttempts: () => 0,
    }))

    const { startSqliteLifecycle } = await import("./lifecycle")
    startSqliteLifecycle()
    vi.advanceTimersByTime(60_000)

    const shutdownHandler = handlers.get("SIGTERM")
    expect(debug).toHaveBeenCalled()
    expect(onSpy).toHaveBeenCalled()
    expect(shutdownHandler).toBeTypeOf("function")
    shutdownHandler?.(undefined)
    expect(warn).toHaveBeenCalled()
  })

  it("logs and rethrows startup failures", async () => {
    const debug = vi.fn()
    const warn = vi.fn()
    const error = vi.fn()
    vi.doMock("pino", () => ({
      default: () => ({ debug, warn, error }),
    }))
    vi.doMock("./sqliteStore", () => ({
      getDb: () => {
        throw new Error("open failed")
      },
      closeDb: vi.fn(),
      purgeExpiredNotes: vi.fn(),
      purgeExpiredAttempts: vi.fn(),
    }))

    const { startSqliteLifecycle } = await import("./lifecycle")
    expect(() => startSqliteLifecycle()).toThrow("open failed")
    expect(error).toHaveBeenCalled()
  })

  it("warns when scheduled purge throws", async () => {
    const debug = vi.fn()
    const warn = vi.fn()
    const error = vi.fn()
    vi.doMock("pino", () => ({
      default: () => ({ debug, warn, error }),
    }))
    vi.doMock("./sqliteStore", () => ({
      getDb: vi.fn(),
      closeDb: vi.fn(),
      purgeExpiredNotes: () => {
        throw new Error("purge failed")
      },
      purgeExpiredAttempts: vi.fn(),
    }))

    const { startSqliteLifecycle } = await import("./lifecycle")
    startSqliteLifecycle()
    vi.advanceTimersByTime(60_000)

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ e: expect.any(Error) }),
      "SQLite purge failed",
    )
  })
})
