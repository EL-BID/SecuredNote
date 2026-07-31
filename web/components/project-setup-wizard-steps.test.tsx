import { describe, expect, it } from "vitest"
import {
  buildSuccessTips,
  buildWelcomeCards,
} from "./project-setup-wizard-steps"

describe("project-setup-wizard-steps helpers", () => {
  const t = (key: string) => key

  it("builds welcome cards", () => {
    const cards = buildWelcomeCards(t)
    expect(cards).toHaveLength(3)
    expect(cards[0].title).toBe("setup.welcomeBrandTitle")
  })

  it("builds success tips", () => {
    const tips = buildSuccessTips(t)
    expect(tips).toHaveLength(2)
    expect(tips[1].title).toBe("setup.successTipShare")
  })
})
