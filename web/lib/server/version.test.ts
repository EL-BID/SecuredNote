import { describe, expect, it } from "vitest"
import { appVersionInfo } from "./version"

describe("version", () => {
  it("exposes app name and version", () => {
    expect(appVersionInfo.name).toBe("secured-note")
    expect(appVersionInfo.version).toBe("1.0.0")
    expect(typeof appVersionInfo.gitSha).toBe("string")
  })
})
