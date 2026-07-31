import { describe, expect, it } from "vitest"
import { GET } from "./route"

describe("GET /version", () => {
  it("returns version payload with uptime", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      version: expect.any(String),
      uptime: expect.any(Number),
    })
  })
})
