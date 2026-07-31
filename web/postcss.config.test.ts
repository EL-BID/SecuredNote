import { describe, expect, it } from "vitest"

describe("postcss.config", () => {
  it("exports the tailwind postcss plugin", async () => {
    const config = (await import("./postcss.config.mjs")).default
    expect(config.plugins).toHaveProperty("@tailwindcss/postcss")
  })
})
