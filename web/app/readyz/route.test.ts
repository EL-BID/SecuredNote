import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("GET /readyz", () => {
  let tmpDir = ""

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secured-readyz-"))
    process.env.SQLITE_PATH = path.join(tmpDir, `${Date.now()}.db`)
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetModules()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("returns ok when database is reachable", async () => {
    const { GET } = await import("./route")
    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
  })

  it("returns 503 when database ping fails", async () => {
    vi.doMock("@/lib/server/sqliteStore", () => ({
      pingDb: () => {
        throw new Error("db down")
      },
    }))

    const { GET } = await import("./route")
    const res = await GET()
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toEqual({ ok: false })
  })
})
