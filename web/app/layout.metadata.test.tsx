import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getSafeGa4MeasurementId } from "@/lib/ga"

vi.mock("next/font/google", () => ({
  Open_Sans: () => ({ variable: "font-open-sans" }),
}))

vi.mock("next/script", () => ({
  default: () => null,
}))

vi.mock("@/lib/ga", () => ({
  getSafeGa4MeasurementId: vi.fn(() => null),
}))

vi.mock("@/lib/branding-bootstrap-inline", () => ({
  getBrandingBootstrapInlineScript: vi.fn(() => ""),
}))

vi.mock("@/lib/brand-theme-css", () => ({
  getBrandingCssVariables: vi.fn(() => ({ "--brand-primary": "#001a28" })),
  brandingCssVariablesToInlineStyle: vi.fn(() => ({ "--brand-primary": "#001a28" })),
}))

vi.mock("@/lib/github-repo", () => ({
  getGithubRepoUrlFromRuntimeEnv: vi.fn(() => null),
}))

vi.mock("@/app/providers", () => ({
  Providers: ({ children }: { children: unknown }) => children,
}))

const ORIGINAL_ENV = { ...process.env }
const layoutHref = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "layout.tsx"),
).href

async function loadLayout(tag: string) {
  vi.resetModules()
  return await import(/* @vite-ignore */ `${layoutHref}?case=${tag}`)
}

describe("app/layout metadata", () => {
  beforeEach(() => {
    Object.assign(process.env, ORIGINAL_ENV)
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) delete process.env[key]
    }
    Object.assign(process.env, ORIGINAL_ENV)
  })

  it("omits url metadata when NEXT_PUBLIC_SITE_URL is blank", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "   "

    const {
      default: RootLayout,
      metadata,
      normalizeSiteUrl,
      buildSiteMetadata,
    } = await loadLayout("blank-site-url")
    expect(normalizeSiteUrl(undefined)).toBeUndefined()
    expect(buildSiteMetadata(undefined).metadataBase).toBeUndefined()
    expect(metadata.metadataBase).toBeUndefined()
    expect(metadata.openGraph).not.toHaveProperty("url")
    const tree = RootLayout({ children: "child" })
    expect(tree.type).toBe("html")
  })

  it("uses a normalized metadataBase and openGraph url when site url is set", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://secured.example.com/app/"
    vi.mocked(getSafeGa4MeasurementId).mockReturnValue("G-TEST123")

    const {
      default: RootLayout,
      metadata,
      normalizeSiteUrl,
      buildSiteMetadata,
      buildGaScriptSrc,
      buildGaConfigScript,
      renderGaScripts,
    } = await loadLayout("with-site-url")
    expect(normalizeSiteUrl("https://secured.example.com/app/")).toBe(
      "https://secured.example.com/app",
    )
    expect(buildSiteMetadata("https://secured.example.com/app").openGraph).toMatchObject({
      url: "https://secured.example.com/app",
    })
    expect(buildGaScriptSrc("G-TEST123")).toContain(
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
    )
    expect(buildGaConfigScript("G-TEST123")).toContain("gtag('config',\"G-TEST123\")")
    const gaFragment = renderGaScripts("G-TEST123")
    expect(gaFragment.props.children[0].props.src).toContain("G-TEST123")
    expect(gaFragment.props.children[1].props.children).toContain("G-TEST123")
    expect(metadata.metadataBase?.href).toBe("https://secured.example.com/app")
    expect(metadata.openGraph).toMatchObject({
      url: "https://secured.example.com/app",
    })
    const tree = RootLayout({ children: "child" })
    expect(tree.props.lang).toBe("en")
  })
})
