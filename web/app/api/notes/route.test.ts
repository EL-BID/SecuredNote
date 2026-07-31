import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "./route"

function b64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64")
}

describe("POST /api/notes route", () => {
  let tmpDir = ""

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secured-note-route-"))
    process.env.SQLITE_PATH = path.join(tmpDir, "test.db")
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetModules()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("delegates to postCreateNote", async () => {
    const res = await POST(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cipher: b64("x"), iv: b64("y") }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/)
  })
})
