import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/notes-handlers", () => ({
  postGetNoteById: vi.fn(),
}))

import { POST, dynamic } from "./route"
import { postGetNoteById } from "@/lib/server/notes-handlers"

describe("/api/notes/[id] route", () => {
  it("exports force-dynamic mode", () => {
    expect(dynamic).toBe("force-dynamic")
  })

  it("delegates POST to the note handler with resolved params", async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 })
    vi.mocked(postGetNoteById).mockResolvedValue(response)
    const request = new Request("http://localhost/api/notes/abc", { method: "POST" })

    const result = await POST(request, { params: Promise.resolve({ id: "abc" }) })

    expect(postGetNoteById).toHaveBeenCalledWith(request, "abc")
    expect(result).toBe(response)
  })
})
