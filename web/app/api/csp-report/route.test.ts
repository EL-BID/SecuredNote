import { describe, expect, it, vi } from "vitest"
import { POST } from "./route"

describe("POST /api/csp-report", () => {
  it("returns 204 for valid report", async () => {
    const res = await POST(
      new Request("http://localhost/api/csp-report", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "10" },
        body: '{"csp":1}',
      }),
    )
    expect(res.status).toBe(204)
  })

  it("rejects oversized body", async () => {
    const res = await POST(
      new Request("http://localhost/api/csp-report", {
        method: "POST",
        headers: { "content-length": "999999" },
      }),
    )
    expect(res.status).toBe(413)
  })

  it("still returns 204 when reading the report body fails", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const res = await POST({
      headers: new Headers({ "content-length": "10" }),
      text: async () => {
        throw new Error("broken body")
      },
    } as unknown as Request)

    expect(res.status).toBe(204)
    expect(debugSpy).toHaveBeenCalled()
  })
})
