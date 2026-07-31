import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function b64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64")
}

const NOTE_ID = "550e8400-e29b-41d4-a716-446655440000"

describe("notes-handlers", () => {
  let tmpDir = ""

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secured-note-test-"))
    process.env.SQLITE_PATH = path.join(tmpDir, "test.db")
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetModules()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("creates and reads a note without password", async () => {
    const { postCreateNote, postGetNoteById, getNoteMetadataById } = await import(
      "./notes-handlers"
    )

    const createReq = new Request("http://localhost/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "120",
      },
      body: JSON.stringify({
        cipher: b64("cipher"),
        iv: b64("iv"),
        salt: null,
        ttl: 0,
      }),
    })

    const createRes = await postCreateNote(createReq)
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()) as { id: string; hasPassword: boolean }
    expect(created.hasPassword).toBe(false)

    const metaRes = await getNoteMetadataById(
      new Request("http://localhost"),
      created.id,
    )
    expect(metaRes.status).toBe(200)

    const readReq = new Request(`http://localhost/api/notes/${created.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
    const readRes = await postGetNoteById(readReq, created.id)
    expect(readRes.status).toBe(200)
    const payload = await readRes.json()
    expect(payload.cipher).toBe(b64("cipher"))

    const goneRes = await postGetNoteById(readReq, created.id)
    expect(goneRes.status).toBe(404)
  })

  it("rejects invalid note id", async () => {
    const { getNoteMetadataById } = await import("./notes-handlers")
    const res = await getNoteMetadataById(new Request("http://localhost"), "not-a-uuid")
    expect(res.status).toBe(400)
  })

  it("derives client ip from forwarded, real-ip, or unknown fallbacks", async () => {
    const { getClientIp, pickClientIp } = await import("./notes-handlers")

    expect(
      getClientIp(
        new Request("http://localhost", {
          headers: { "x-forwarded-for": "198.51.100.10, 203.0.113.5" },
        }),
      ),
    ).toBe("198.51.100.10")

    expect(
      getClientIp(
        new Request("http://localhost", {
          headers: { "x-real-ip": " 203.0.113.9 " },
        }),
      ),
    ).toBe("203.0.113.9")

    expect(getClientIp(new Request("http://localhost"))).toBe("unknown")

    expect(
      getClientIp(
        new Request("http://localhost", {
          headers: { "x-forwarded-for": "   " },
        }),
      ),
    ).toBe("unknown")

    expect(pickClientIp("198.51.100.10, 203.0.113.5", null)).toBe("198.51.100.10")
    expect(pickClientIp("   ", null)).toBe("unknown")
    expect(pickClientIp(null, " 203.0.113.9 ")).toBe("203.0.113.9")
  })

  it("evaluates oversized create payload thresholds directly", async () => {
    const { isOversizedCreatePayload } = await import("./notes-handlers")

    expect(isOversizedCreatePayload(16 * 1024 + 1, 10, 10)).toBe(true)
    expect(isOversizedCreatePayload(16, 257, 10)).toBe(true)
    expect(isOversizedCreatePayload(16, 10, 513)).toBe(true)
    expect(isOversizedCreatePayload(16, 10, 10)).toBe(false)
  })

  it("enforces password on protected notes", async () => {
    const { postCreateNote, postGetNoteById } = await import("./notes-handlers")

    const createReq = new Request("http://localhost/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cipher: b64("cipher"),
        iv: b64("iv"),
        password: "secret123",
      }),
    })
    const createRes = await postCreateNote(createReq)
    const { id } = (await createRes.json()) as { id: string }

    const missingPwd = await postGetNoteById(
      new Request(`http://localhost/api/notes/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      id,
    )
    expect(missingPwd.status).toBe(401)

    const wrongPwd = await postGetNoteById(
      new Request(`http://localhost/api/notes/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "bad" }),
      }),
      id,
    )
    expect(wrongPwd.status).toBe(401)
  })

  it("reads note with correct password and returns 404 for missing note", async () => {
    const { postCreateNote, postGetNoteById, getNoteMetadataById } = await import(
      "./notes-handlers"
    )

    const createReq = new Request("http://localhost/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cipher: b64("cipher"),
        iv: b64("iv"),
        password: "secret123",
      }),
    })
    const { id } = ((await (await postCreateNote(createReq)).json()) as {
      id: string
    })

    const ok = await postGetNoteById(
      new Request(`http://localhost/api/notes/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "secret123" }),
      }),
      id,
    )
    expect(ok.status).toBe(200)

    const meta = await getNoteMetadataById(new Request("http://localhost"), id)
    expect(meta.status).toBe(404)
  })

  it("rejects invalid cipher on create", async () => {
    const { postCreateNote } = await import("./notes-handlers")
    const res = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cipher: "!!!", iv: b64("iv") }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("rejects invalid iv and invalid create request metadata", async () => {
    const { postCreateNote } = await import("./notes-handlers")

    const invalidIv = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cipher: b64("cipher"), iv: "!!!" }),
      }),
    )
    expect(invalidIv.status).toBe(400)

    const wrongContentType = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "x",
      }),
    )
    expect(wrongContentType.status).toBe(415)

    const oversized = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "9999999",
        },
        body: JSON.stringify({ cipher: b64("cipher"), iv: b64("iv") }),
      }),
    )
    expect(oversized.status).toBe(413)
  })

  it("rejects invalid salt and oversized payloads on create", async () => {
    const { postCreateNote } = await import("./notes-handlers")

    const invalidSalt = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cipher: b64("cipher"), iv: b64("iv"), salt: "!!!" }),
      }),
    )
    expect(invalidSalt.status).toBe(400)

    const oversized = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cipher: b64("a".repeat(12 * 1024 + 1)),
          iv: b64("iv"),
        }),
      }),
    )
    expect(oversized.status).toBe(413)
  })

  it("rejects oversized iv and salt fields on create", async () => {
    const { postCreateNote } = await import("./notes-handlers")

    const oversizedIv = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cipher: b64("cipher"),
          iv: b64("a".repeat(193)),
        }),
      }),
    )
    expect(oversizedIv.status).toBe(413)

    const oversizedSalt = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cipher: b64("cipher"),
          iv: b64("iv"),
          salt: "a".repeat(513),
        }),
      }),
    )
    expect(oversizedSalt.status).toBe(413)
  })

  it("rejects null JSON payloads on create", async () => {
    const { postCreateNote } = await import("./notes-handlers")
    const res = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "null",
      }),
    )

    expect(res.status).toBe(400)
  })

  it("caps ttl and marks passworded notes", async () => {
    const { postCreateNote } = await import("./notes-handlers")
    const res = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cipher: b64("cipher"),
          iv: b64("iv"),
          ttl: 999999999,
          password: " secret123 ",
        }),
      }),
    )

    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toMatchObject({
      ttl: 60 * 60 * 24 * 30,
      hasPassword: true,
    })
  })

  it("returns metadata with expiresIn null for no ttl", async () => {
    const { postCreateNote, getNoteMetadataById } = await import("./notes-handlers")
    const createRes = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cipher: b64("c"), iv: b64("i"), ttl: 0 }),
      }),
    )
    const { id } = (await createRes.json()) as { id: string }
    const meta = await getNoteMetadataById(new Request("http://localhost"), id)
    const body = await meta.json()
    expect(body.expiresIn).toBeNull()
  })

  it("returns metadata with time remaining for ttl notes", async () => {
    const { postCreateNote, getNoteMetadataById } = await import("./notes-handlers")
    const createRes = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cipher: b64("c"), iv: b64("i"), ttl: 120 }),
      }),
    )
    const { id } = (await createRes.json()) as { id: string }
    const meta = await getNoteMetadataById(new Request("http://localhost"), id)
    const body = await meta.json()
    expect(body.expiresIn).toBeGreaterThan(0)
  })

  it("locks password-protected reads after too many attempts and tolerates invalid JSON body", async () => {
    const { postCreateNote, postGetNoteById } = await import("./notes-handlers")

    const createReq = new Request("http://localhost/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cipher: b64("cipher"),
        iv: b64("iv"),
        password: "secret123",
      }),
    })
    const { id } = ((await (await postCreateNote(createReq)).json()) as { id: string })

    const makeWrongAttempt = () =>
      postGetNoteById(
        new Request(`http://localhost/api/notes/${id}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.9",
          },
          body: JSON.stringify({ password: "bad" }),
        }),
        id,
      )

    expect((await makeWrongAttempt()).status).toBe(401)
    expect((await makeWrongAttempt()).status).toBe(401)
    expect((await makeWrongAttempt()).status).toBe(401)

    const locked = await postGetNoteById(
      new Request(`http://localhost/api/notes/${id}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.9",
        },
        body: "{not-json",
      }),
      id,
    )
    expect(locked.status).toBe(429)
  })

  it("uses the default retryAfter when lockout ttl has already elapsed", async () => {
    vi.doMock("./sqliteStore", async () => {
      const actual = await vi.importActual<typeof import("./sqliteStore")>("./sqliteStore")
      return {
        ...actual,
        getAttemptCount: vi.fn(() => ({ count: 3, ttlLeft: 0 })),
      }
    })

    const { postGetNoteById } = await import("./notes-handlers")
    const res = await postGetNoteById(
      new Request(`http://localhost/api/notes/${NOTE_ID}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      NOTE_ID,
    )

    expect(res.status).toBe(429)
    await expect(res.json()).resolves.toMatchObject({ retryAfter: 60 })
    vi.doUnmock("./sqliteStore")
  })

  it("handles read validation, missing rows, and invalid JSON for unprotected notes", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const { postCreateNote, postGetNoteById } = await import("./notes-handlers")

    const invalidId = await postGetNoteById(
      new Request("http://localhost/api/notes/not-a-uuid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      "not-a-uuid",
    )
    expect(invalidId.status).toBe(400)

    const wrongContentType = await postGetNoteById(
      new Request(`http://localhost/api/notes/${NOTE_ID}`, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "x",
      }),
      NOTE_ID,
    )
    expect(wrongContentType.status).toBe(415)

    const oversized = await postGetNoteById(
      new Request(`http://localhost/api/notes/${NOTE_ID}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "9999999",
        },
        body: "{}",
      }),
      NOTE_ID,
    )
    expect(oversized.status).toBe(413)

    const missing = await postGetNoteById(
      new Request(`http://localhost/api/notes/${NOTE_ID}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      NOTE_ID,
    )
    expect(missing.status).toBe(404)

    const createRes = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cipher: b64("c"), iv: b64("i"), ttl: 120 }),
      }),
    )
    const { id } = (await createRes.json()) as { id: string }

    const ok = await postGetNoteById(
      {
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => {
          throw new Error("bad json")
        },
      } as unknown as Request,
      id,
    )

    expect(ok.status).toBe(200)
    expect(debugSpy).toHaveBeenCalled()
  })

  it("returns internal errors for create, metadata, and read failures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.doMock("./sqliteStore", () => ({
      insertNote: () => {
        throw new Error("insert failed")
      },
      getNoteRow: vi
        .fn()
        .mockReturnValueOnce({ data: "{bad-json", expires_at: null, created_at: Date.now() })
        .mockImplementationOnce(() => {
          throw new Error("read failed")
        }),
      getAttemptCount: () => {
        throw new Error("attempt failed")
      },
      setAttemptCount: vi.fn(),
      clearAttempts: vi.fn(),
      deleteNote: vi.fn(),
    }))

    const { getNoteMetadataById, postCreateNote, postGetNoteById } = await import(
      "./notes-handlers"
    )

    const create = await postCreateNote(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cipher: b64("c"), iv: b64("i") }),
      }),
    )
    expect(create.status).toBe(500)

    const metadata = await getNoteMetadataById(
      new Request("http://localhost/api/notes/meta"),
      NOTE_ID,
    )
    expect(metadata.status).toBe(500)

    const read = await postGetNoteById(
      new Request(`http://localhost/api/notes/${NOTE_ID}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      NOTE_ID,
    )
    expect(read.status).toBe(500)
    expect(errorSpy).toHaveBeenCalled()
  })
})
