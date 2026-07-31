import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = { ...process.env }
const nextConfigHref = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "next.config.mjs"),
).href

async function loadConfig(tag: string) {
  vi.resetModules()
  return (await import(/* @vite-ignore */ `${nextConfigHref}?case=${tag}`)).default
}

describe("next.config", () => {
  beforeEach(() => {
    Object.assign(process.env, ORIGINAL_ENV)
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) delete process.env[key]
    }
    Object.assign(process.env, ORIGINAL_ENV)
    vi.restoreAllMocks()
  })

  it("builds production headers with reporting, ga and hsts", async () => {
    process.env.NODE_ENV = "production"
    process.env.NEXT_PUBLIC_SITE_URL = "https://secured.example.com/app"
    process.env.NEXT_PUBLIC_API_BASE = "https://api.example.com/v1"
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-ABCD1234"
    process.env.HSTS_MAX_AGE_SECONDS = "40000000"
    process.env.HSTS_PRELOAD = "true"

    const config = await loadConfig("prod")
    const headers = await config.headers()
    const securityHeaders = headers[0].headers
    const csp = securityHeaders.find((entry) => entry.key === "Content-Security-Policy")
    const hsts = securityHeaders.find(
      (entry) => entry.key === "Strict-Transport-Security",
    )
    const reporting = securityHeaders.find(
      (entry) => entry.key === "Reporting-Endpoints",
    )

    expect(config.images.formats).toEqual(["image/avif", "image/webp"])
    expect(config.experimental.optimizePackageImports).toContain("lucide-react")
    expect(csp?.value).toContain("https://www.google-analytics.com")
    expect(csp?.value).toContain("connect-src 'self' https://api.example.com")
    expect(csp?.value).toContain("block-all-mixed-content")
    expect(hsts?.value).toBe("max-age=40000000; includeSubDomains; preload")
    expect(reporting?.value).toContain("https://secured.example.com/api/csp-report")
  })

  it("builds development headers without reporting and warns on invalid api base", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    process.env.NODE_ENV = "development"
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000"
    process.env.NEXT_PUBLIC_API_BASE = "not a url"
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "invalid"
    process.env.HSTS_MAX_AGE_SECONDS = "10"

    const config = await loadConfig("dev")
    const headers = await config.headers()
    const securityHeaders = headers[0].headers
    const csp = securityHeaders.find((entry) => entry.key === "Content-Security-Policy")
    const hsts = securityHeaders.find(
      (entry) => entry.key === "Strict-Transport-Security",
    )
    const reporting = securityHeaders.find(
      (entry) => entry.key === "Reporting-Endpoints",
    )

    expect(csp?.value).toContain("'unsafe-eval'")
    expect(csp?.value).toContain("ws://localhost:3000")
    expect(csp?.value).not.toContain("https://www.google-analytics.com")
    expect(hsts).toBeUndefined()
    expect(reporting).toBeUndefined()
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it("falls back to CSP_REPORT_BASE when site url is invalid", async () => {
    process.env.NODE_ENV = "production"
    process.env.NEXT_PUBLIC_SITE_URL = "://bad-url"
    process.env.CSP_REPORT_BASE = "https://reports.example.com/base"

    const config = await loadConfig("fallback")
    const headers = await config.headers()
    const reporting = headers[0].headers.find(
      (entry) => entry.key === "Reporting-Endpoints",
    )

    expect(reporting?.value).toContain("https://reports.example.com/api/csp-report")
  })

  it("enables mixed-content protection for malformed https-like site urls", async () => {
    process.env.NODE_ENV = "production"
    process.env.NEXT_PUBLIC_SITE_URL = "https:bad-url"

    const config = await loadConfig("https-like-invalid")
    const headers = await config.headers()
    const csp = headers[0].headers.find(
      (entry) => entry.key === "Content-Security-Policy",
    )

    expect(csp?.value).toContain("block-all-mixed-content")
    expect(csp?.value).toContain("upgrade-insecure-requests")
  })

  it("omits hsts when the configured max-age is invalid or too small", async () => {
    process.env.NODE_ENV = "production"
    process.env.NEXT_PUBLIC_SITE_URL = "https://secured.example.com"
    process.env.HSTS_MAX_AGE_SECONDS = "not-a-number"

    const invalidConfig = await loadConfig("hsts-invalid")
    const invalidHeaders = await invalidConfig.headers()
    expect(
      invalidHeaders[0].headers.find((entry) => entry.key === "Strict-Transport-Security"),
    ).toBeUndefined()

    process.env.HSTS_MAX_AGE_SECONDS = "299"
    const tooSmallConfig = await loadConfig("hsts-too-small")
    const tooSmallHeaders = await tooSmallConfig.headers()
    expect(
      tooSmallHeaders[0].headers.find((entry) => entry.key === "Strict-Transport-Security"),
    ).toBeUndefined()
  })

  it("treats an undefined site url as non-https when reporting is also absent", async () => {
    process.env.NODE_ENV = "production"
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.CSP_REPORT_BASE

    const config = await loadConfig("no-site-url")
    const headers = await config.headers()
    const csp = headers[0].headers.find(
      (entry) => entry.key === "Content-Security-Policy",
    )

    expect(csp?.value).not.toContain("block-all-mixed-content")
    expect(csp?.value).not.toContain("upgrade-insecure-requests")
  })
})
