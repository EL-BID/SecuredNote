import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const validPayload = {
  version: 1 as const,
  branding: {
    appName: "Route Test App",
    logoDataUrl: null,
    primary: "#111111",
    accent: "#222222",
    background: "#333333",
    disclaimer: { mode: "default" as const },
  },
}

describe("/api/project-config route", () => {
  let tmpDir = ""

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secured-pcfg-route-"))
    process.env.SQLITE_PATH = path.join(tmpDir, `${Date.now()}.db`)
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetModules()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("GET returns unconfigured initially", async () => {
    const { GET } = await import("./route")
    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ configured: false })
  })

  it("POST creates config", async () => {
    const { POST } = await import("./route")
    const res = await POST(
      new Request("http://localhost/api/project-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    )
    expect(res.status).toBe(201)
  })
})
