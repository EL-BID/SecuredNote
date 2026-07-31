import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const validPayload = {
  version: 1 as const,
  branding: {
    appName: "Test App",
    logoDataUrl: null,
    primary: "#111111",
    accent: "#222222",
    background: "#333333",
    disclaimer: { mode: "default" as const },
  },
}

describe("project-config-handlers", () => {
  let tmpDir = ""

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secured-note-pcfg-"))
    process.env.SQLITE_PATH = path.join(tmpDir, "test.db")
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetModules()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("returns configured:false when empty", async () => {
    const { getProjectConfig } = await import("./project-config-handlers")
    const res = await getProjectConfig()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ configured: false })
  })

  it("inserts initial config once", async () => {
    const { getProjectConfig, postProjectConfig } = await import(
      "./project-config-handlers"
    )

    const postRes = await postProjectConfig(
      new Request("http://localhost/api/project-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    )
    expect(postRes.status).toBe(201)

    const getRes = await getProjectConfig()
    const body = await getRes.json()
    expect(body.configured).toBe(true)
    expect(body.branding.appName).toBe("Test App")

    const conflict = await postProjectConfig(
      new Request("http://localhost/api/project-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    )
    expect(conflict.status).toBe(409)
  })

  it("rejects invalid payload", async () => {
    const { postProjectConfig } = await import("./project-config-handlers")
    const res = await postProjectConfig(
      new Request("http://localhost/api/project-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: 2 }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("rejects project-config requests with the wrong content type", async () => {
    const { postProjectConfig } = await import("./project-config-handlers")
    const res = await postProjectConfig(
      new Request("http://localhost/api/project-config", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "x",
      }),
    )

    expect(res.status).toBe(415)
  })

  it("returns 500 when stored config is invalid or corrupt", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.doMock("./sqliteStore", () => ({
      getProjectConfigJson: vi
        .fn()
        .mockReturnValueOnce(JSON.stringify({ version: 1, branding: null }))
        .mockReturnValueOnce("{bad-json"),
      insertProjectConfigIfAbsent: vi.fn(),
    }))

    const { getProjectConfig } = await import("./project-config-handlers")

    const invalid = await getProjectConfig()
    expect(invalid.status).toBe(500)
    await expect(invalid.json()).resolves.toEqual({
      error: "Configuración almacenada inválida",
    })

    const corrupt = await getProjectConfig()
    expect(corrupt.status).toBe(500)
    await expect(corrupt.json()).resolves.toEqual({
      error: "Configuración almacenada corrupta",
    })
    expect(warnSpy).toHaveBeenCalled()
  })

  it("returns 503 when project config read fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.doMock("./sqliteStore", () => ({
      getProjectConfigJson: () => {
        throw new Error("db down")
      },
      insertProjectConfigIfAbsent: vi.fn(),
    }))

    const { getProjectConfig } = await import("./project-config-handlers")
    const res = await getProjectConfig()
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toEqual({
      error: "Base de datos no disponible",
    })
    expect(warnSpy).toHaveBeenCalled()
  })

  it("rejects invalid json body and oversized payloads", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const { postProjectConfig } = await import("./project-config-handlers")

    const badJson = await postProjectConfig({
      headers: new Headers({ "content-type": "application/json", "content-length": "10" }),
      json: async () => {
        throw new Error("bad json")
      },
    } as unknown as Request)
    expect(badJson.status).toBe(400)

    const oversized = await postProjectConfig(
      new Request("http://localhost/api/project-config", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "9999999",
        },
        body: JSON.stringify(validPayload),
      }),
    )
    expect(oversized.status).toBe(413)
    expect(debugSpy).toHaveBeenCalled()
  })

  it("returns conflict without config for corrupt existing payloads and 503 on insert failure", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.doMock("./sqliteStore", () => ({
      getProjectConfigJson: vi.fn(),
      insertProjectConfigIfAbsent: vi
        .fn()
        .mockReturnValueOnce({ ok: false, existing: "{bad-json" })
        .mockImplementationOnce(() => {
          throw new Error("write failed")
        }),
    }))

    const { postProjectConfig } = await import("./project-config-handlers")

    const conflict = await postProjectConfig(
      new Request("http://localhost/api/project-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    )
    expect(conflict.status).toBe(409)
    await expect(conflict.json()).resolves.toEqual({
      error: "La instancia ya fue configurada",
    })

    const failed = await postProjectConfig(
      new Request("http://localhost/api/project-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    )
    expect(failed.status).toBe(503)
    await expect(failed.json()).resolves.toEqual({
      error: "Base de datos no disponible",
    })
    expect(warnSpy).toHaveBeenCalled()
  })

  it("rejects payloads whose serialized config exceeds the hard limit", async () => {
    const actualStringify = JSON.stringify.bind(JSON)
    const stringifySpy = vi.spyOn(JSON, "stringify").mockImplementation((value, replacer, space) => {
      if (
        value &&
        typeof value === "object" &&
        "version" in (value as Record<string, unknown>) &&
        "branding" in (value as Record<string, unknown>)
      ) {
        return "x".repeat(750_001)
      }

      return actualStringify(value, replacer, space)
    })

    const { postProjectConfig } = await import("./project-config-handlers")
    const res = await postProjectConfig(
      new Request("http://localhost/api/project-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: actualStringify(validPayload),
      }),
    )

    expect(stringifySpy).toHaveBeenCalled()
    expect(res.status).toBe(413)
    await expect(res.json()).resolves.toEqual({
      error: "Payload demasiado grande",
    })
  })
})
