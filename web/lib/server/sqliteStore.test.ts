import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("sqliteStore readiness", () => {
  let tmpDir = ""

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secured-note-sqlite-"))
    process.env.SQLITE_PATH = path.join(tmpDir, "test.db")
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetModules()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("opens database and answers ping", async () => {
    const { pingDb } = await import("./sqliteStore")
    expect(() => pingDb()).not.toThrow()
  })

  it("stores project config only once", async () => {
    const { getProjectConfigJson, insertProjectConfigIfAbsent } = await import("./sqliteStore")
    expect(insertProjectConfigIfAbsent('{"a":1}')).toEqual({ ok: true })
    expect(insertProjectConfigIfAbsent('{"a":2}')).toEqual({ ok: false, existing: '{"a":1}' })
    expect(getProjectConfigJson()).toBe('{"a":1}')
  })

  it("stores, expires, and deletes notes", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-18T00:00:00Z"))
    const { deleteNote, getNoteRow, insertNote, purgeExpiredNotes } = await import("./sqliteStore")

    insertNote("note-a", '{"cipher":"a"}', 0, Date.now())
    insertNote("note-b", '{"cipher":"b"}', 1, Date.now())
    expect(getNoteRow("note-a")?.data).toContain('"cipher":"a"')
    expect(getNoteRow("note-b")?.data).toContain('"cipher":"b"')

    vi.setSystemTime(new Date("2026-06-18T00:00:03Z"))
    expect(getNoteRow("note-b")).toBeNull()
    expect(purgeExpiredNotes()).toBe(0)

    deleteNote("note-a")
    expect(getNoteRow("note-a")).toBeNull()
    vi.useRealTimers()
  })

  it("tracks and clears password attempts and closes safely", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-18T00:00:00Z"))
    const {
      clearAttempts,
      closeDb,
      getAttemptCount,
      setAttemptCount,
    } = await import("./sqliteStore")

    expect(getAttemptCount("k")).toEqual({ count: 0, ttlLeft: 0 })
    setAttemptCount("k", 2, 60)
    expect(getAttemptCount("k")).toEqual({ count: 2, ttlLeft: 60 })

    vi.setSystemTime(new Date("2026-06-18T00:01:01Z"))
    expect(getAttemptCount("k")).toEqual({ count: 0, ttlLeft: 0 })

    setAttemptCount("k", 1, 60)
    clearAttempts("k")
    expect(getAttemptCount("k")).toEqual({ count: 0, ttlLeft: 0 })

    closeDb()
    closeDb()
    vi.useRealTimers()
  })

  it("creates the sqlite directory, caches the singleton, and warns on close failure", async () => {
    vi.resetModules()
    const existsSync = vi.fn().mockReturnValue(false)
    const mkdirSync = vi.fn()
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const close = vi.fn(() => {
      throw new Error("close failed")
    })
    const prepare = vi.fn(() => ({ get: vi.fn(), run: vi.fn() }))
    const pragma = vi.fn()
    const exec = vi.fn()
    const db = { pragma, exec, close, prepare, transaction: vi.fn() }
    const Database = vi.fn(() => db)

    vi.doMock("node:fs", () => ({
      default: { existsSync, mkdirSync },
    }))
    vi.doMock("better-sqlite3", () => ({
      default: Database,
    }))

    const { closeDb, getDb } = await import("./sqliteStore")
    expect(getDb()).toBe(db)
    expect(getDb()).toBe(db)
    expect(Database).toHaveBeenCalledTimes(1)
    expect(mkdirSync).toHaveBeenCalled()

    closeDb()
    expect(warnSpy).toHaveBeenCalled()
  })

  it("deletes rows that are already expired after selection", async () => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-18T00:00:10Z"))

    const purgeRun = vi.fn().mockReturnValue({ changes: 0 })
    const deleteRun = vi.fn().mockReturnValue({ changes: 1 })
    const selectGet = vi.fn().mockReturnValue({
      data: '{"cipher":"late"}',
      expires_at: Math.floor(Date.now() / 1000) - 1,
      created_at: Date.now(),
    })
    const prepare = vi.fn((sql: string) => {
      if (sql.includes("DELETE FROM notes WHERE expires_at")) {
        return { run: purgeRun }
      }
      if (sql === "DELETE FROM notes WHERE id = ?") {
        return { run: deleteRun }
      }
      if (sql.includes("SELECT data, expires_at, created_at FROM notes")) {
        return { get: selectGet }
      }
      return { run: vi.fn(), get: vi.fn() }
    })
    const db = {
      pragma: vi.fn(),
      exec: vi.fn(),
      close: vi.fn(),
      prepare,
      transaction: vi.fn(),
    }
    vi.doMock("better-sqlite3", () => ({
      default: vi.fn(() => db),
    }))

    const { getNoteRow } = await import("./sqliteStore")
    expect(getNoteRow("expired-note")).toBeNull()
    expect(deleteRun).toHaveBeenCalledWith("expired-note")
    vi.useRealTimers()
  })

  it("drops expired attempt counters after lookup", async () => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-18T00:00:10Z"))

    const purgeRun = vi.fn().mockReturnValue({ changes: 0 })
    const deleteRun = vi.fn().mockReturnValue({ changes: 1 })
    const selectGet = vi.fn().mockReturnValue({
      count: 2,
      expires_at: Math.floor(Date.now() / 1000) - 1,
    })
    const prepare = vi.fn((sql: string) => {
      if (sql.includes("DELETE FROM password_attempts WHERE expires_at")) {
        return { run: purgeRun }
      }
      if (sql.includes("SELECT count, expires_at FROM password_attempts")) {
        return { get: selectGet }
      }
      if (sql === "DELETE FROM password_attempts WHERE attempt_key = ?") {
        return { run: deleteRun }
      }
      return { run: vi.fn(), get: vi.fn() }
    })
    const db = {
      pragma: vi.fn(),
      exec: vi.fn(),
      close: vi.fn(),
      prepare,
      transaction: vi.fn(),
    }
    vi.doMock("better-sqlite3", () => ({
      default: vi.fn(() => db),
    }))

    const { getAttemptCount } = await import("./sqliteStore")
    expect(getAttemptCount("attempt-key")).toEqual({ count: 0, ttlLeft: 0 })
    expect(deleteRun).toHaveBeenCalledWith("attempt-key")
    vi.useRealTimers()
  })
})
