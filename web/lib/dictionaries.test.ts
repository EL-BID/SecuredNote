import { describe, expect, it } from "vitest"
import { translate } from "./dictionaries"

describe("dictionaries translate", () => {
  it("returns english string for known key", () => {
    expect(translate("en", "home.title")).toBe("Secured Note")
  })

  it("returns spanish string for known key", () => {
    expect(translate("es", "home.title")).toBe("Secured Note")
  })

  it("interpolates variables", () => {
    const s = translate("en", "countdown.line", {
      minutes: 1,
      minutesLabel: "minute",
      seconds: 5,
      secondsLabel: "seconds",
    })
    expect(s).toContain("1")
    expect(s).toContain("5")
  })

  it("falls back to key when missing", () => {
    expect(translate("en", "missing.key.xyz")).toBe("missing.key.xyz")
  })

  it("falls back to english when locale key missing", () => {
    expect(translate("es", "home.title")).toBeTruthy()
  })
})
