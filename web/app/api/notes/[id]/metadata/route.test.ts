import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/notes-handlers", () => ({
  getNoteMetadataById: vi.fn(),
}))

import { GET, dynamic } from "./route"
import { getNoteMetadataById } from "@/lib/server/notes-handlers"

describe("/api/notes/[id]/metadata route", () => {
  it("exports force-dynamic mode", () => {
    expect(dynamic).toBe("force-dynamic")
  })

  it("delegates GET to the metadata handler with resolved params", async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 })
    vi.mocked(getNoteMetadataById).mockResolvedValue(response)
    const request = new Request("http://localhost/api/notes/abc/metadata")

    const result = await GET(request, { params: Promise.resolve({ id: "abc" }) })

    expect(getNoteMetadataById).toHaveBeenCalledWith(request, "abc")
    expect(result).toBe(response)
  })
})
