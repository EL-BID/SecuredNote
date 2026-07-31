import { describe, expect, it } from "vitest"
import {
  MAX_BYTES_BODY_NOTE_CREATE,
  rejectIfContentLengthExceeds,
  requireJsonRequest,
} from "./api-request-guards"

describe("api-request-guards", () => {
  it("requires JSON content type on POST", async () => {
    const req = new Request("http://localhost/api/notes", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    })
    const res = requireJsonRequest(req)
    expect(res?.status).toBe(415)
  })

  it("accepts application/json and +json suffixes", () => {
    const okReq = new Request("http://localhost/api/notes", {
      method: "POST",
      headers: { "content-type": "application/vnd.api+json" },
    })
    expect(requireJsonRequest(okReq)).toBeNull()
  })

  it("rejects POST requests that omit content-type", () => {
    const req = new Request("http://localhost/api/notes", {
      method: "POST",
    })
    const res = requireJsonRequest(req)
    expect(res?.status).toBe(415)
  })

  it("rejects oversized content-length", () => {
    const req = new Request("http://localhost/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(MAX_BYTES_BODY_NOTE_CREATE + 1),
      },
    })
    const res = rejectIfContentLengthExceeds(req, MAX_BYTES_BODY_NOTE_CREATE)
    expect(res?.status).toBe(413)
  })

  it("allows missing content-length", () => {
    const req = new Request("http://localhost/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
    })
    expect(rejectIfContentLengthExceeds(req, 1024)).toBeNull()
  })

  it("ignores invalid or negative content-length values", () => {
    const invalid = new Request("http://localhost/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "abc",
      },
    })
    const negative = new Request("http://localhost/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "-1",
      },
    })

    expect(rejectIfContentLengthExceeds(invalid, 1024)).toBeNull()
    expect(rejectIfContentLengthExceeds(negative, 1024)).toBeNull()
  })
})
