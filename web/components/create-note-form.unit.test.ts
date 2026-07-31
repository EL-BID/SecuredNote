import { describe, expect, it } from "vitest"
import { getTtlLabel } from "./create-note-form"

describe("CreateNoteForm helper branches", () => {
  const ttlOptions = [
    { value: 0, label: "delete immediately" },
    { value: 3600, label: "1 hour" },
  ] as const

  it("returns the matched ttl label and falls back to an empty string", () => {
    expect(getTtlLabel(3600, ttlOptions)).toBe("1 hour")
    expect(getTtlLabel(123, ttlOptions)).toBe("")
  })
})
