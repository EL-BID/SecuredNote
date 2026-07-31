import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { describe, expect, it, vi } from "vitest"

const vitestConfigHref = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "vitest.config.ts"),
).href

async function loadConfig(tag: string) {
  vi.resetModules()
  return (await import(/* @vite-ignore */ `${vitestConfigHref}?case=${tag}`)).default
}

describe("vitest.config", () => {
  it("defines coverage, aliases and environments", async () => {
    const config = await loadConfig("fresh")
    expect(config.resolve?.alias).toHaveProperty("@")
    expect(config.esbuild?.jsxInject).toContain("import React")
    expect(config.test?.environment).toBe("node")
    expect(config.test?.environmentMatchGlobs).toEqual(
      expect.arrayContaining([
        ["**/*.test.tsx", "jsdom"],
        ["lib/brand-theme-css.test.ts", "jsdom"],
      ]),
    )
    expect(config.test?.setupFiles).toContain("./vitest.setup.ts")
    expect(config.test?.coverage?.include).toEqual(
      expect.arrayContaining([
        "*.{ts,tsx,mjs}",
        "scripts/**/*.{ts,mjs}",
        "test/**/*.{ts,tsx}",
      ]),
    )
    expect(config.test?.coverage?.exclude).toContain("**/*.test.{ts,tsx}")
    expect(config.test?.coverage?.thresholds).toMatchObject({
      lines: 30,
      statements: 30,
      functions: 30,
      branches: 25,
    })
  })
})
