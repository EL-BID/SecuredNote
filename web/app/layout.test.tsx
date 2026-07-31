import React, { type ReactNode } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Open_Sans: () => ({ variable: "font-open-sans" }),
}))

vi.mock("next/script", () => ({
  default: ({
    id,
    src,
    children,
  }: {
    id?: string
    src?: string
    children?: ReactNode
  }) => (
    <script data-testid={id ?? "script"} data-src={src}>
      {children}
    </script>
  ),
}))

vi.mock("@/lib/ga", () => ({
  getSafeGa4MeasurementId: vi.fn(),
}))

vi.mock("@/lib/branding-bootstrap-inline", () => ({
  getBrandingBootstrapInlineScript: vi.fn(() => "window.__brand=true;"),
}))

vi.mock("@/lib/brand-theme-css", () => ({
  getBrandingCssVariables: vi.fn(() => ({ "--brand-primary": "#001a28" })),
  brandingCssVariablesToInlineStyle: vi.fn(() => ({ "--brand-primary": "#001a28" })),
}))

vi.mock("@/lib/github-repo", () => ({
  getGithubRepoUrlFromRuntimeEnv: vi.fn(),
}))

vi.mock("@/app/providers", () => ({
  Providers: ({
    children,
    githubRepoUrl,
  }: {
    children: ReactNode
    githubRepoUrl: string | null
  }) => (
    <div data-testid="providers" data-github={githubRepoUrl ?? ""}>
      {children}
    </div>
  ),
}))

import RootLayout, { metadata, viewport } from "./layout"
import { getSafeGa4MeasurementId } from "@/lib/ga"
import { getGithubRepoUrlFromRuntimeEnv } from "@/lib/github-repo"

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function asElements(value: ReactNode | ReactNode[] | null | undefined) {
  return asArray(value).filter(
    (child): child is Exclude<ReactNode, null | undefined | boolean | string | number> =>
      React.isValidElement(child),
  )
}

describe("app/layout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSafeGa4MeasurementId).mockReturnValue(null)
    vi.mocked(getGithubRepoUrlFromRuntimeEnv).mockReturnValue(null)
  })

  it("exports metadata and viewport defaults", () => {
    expect(metadata.title).toContain("Secured Note")
    expect(viewport.initialScale).toBe(1)
    expect(viewport.themeColor).toHaveLength(2)
  })

  it("renders providers and bootstrap script without ga when id is missing", () => {
    const { container } = render(
      <RootLayout>
        <main data-testid="child">hello</main>
      </RootLayout>,
    )

    expect(screen.getByTestId("providers")).toHaveAttribute("data-github", "")
    expect(screen.getByTestId("child")).toBeInTheDocument()
    expect(screen.getByTestId("brand-bootstrap")).toHaveTextContent(
      "window.__brand=true;",
    )
    expect(screen.queryByTestId("ga4-config")).not.toBeInTheDocument()
  })

  it("renders ga scripts when a measurement id is available", () => {
    vi.mocked(getSafeGa4MeasurementId).mockReturnValue("G-TEST123")
    vi.mocked(getGithubRepoUrlFromRuntimeEnv).mockReturnValue(
      "https://github.com/example/repo",
    )

    render(
      <RootLayout>
        <main>hello</main>
      </RootLayout>,
    )

    expect(screen.getByTestId("providers")).toHaveAttribute(
      "data-github",
      "https://github.com/example/repo",
    )
    expect(screen.getByTestId("ga4-config")).toHaveTextContent("G-TEST123")
  })

  it("builds the expected element tree when ga is disabled", () => {
    const tree = RootLayout({
      children: <main data-testid="child">hello</main>,
    })

    expect(tree.type).toBe("html")
    expect(tree.props.lang).toBe("en")

    const [head, body] = asArray(tree.props.children)
    expect(head.type).toBe("head")
    expect(body.type).toBe("body")
    expect(tree.props.style["--brand-primary"]).toBe("#001a28")
    expect(body.props.className).toContain("font-open-sans")
    expect(body.props.className).toContain("antialiased")
    expect(body.props.className).toContain("font-sans")
    expect(head.props.children).toBeUndefined()

    const bodyChildren = asElements(body.props.children)
    expect(bodyChildren).toHaveLength(2)
    expect(bodyChildren[0].props.id).toBe("brand-bootstrap")
    expect(bodyChildren[1].props.githubRepoUrl).toBeNull()
  })

  it("builds the expected element tree when ga is enabled", () => {
    vi.mocked(getSafeGa4MeasurementId).mockReturnValue("G-TEST123")

    const tree = RootLayout({
      children: <main>hello</main>,
    })

    const [, body] = asArray(tree.props.children)
    const bodyChildren = asElements(body.props.children)
    expect(bodyChildren).toHaveLength(3)
    expect(bodyChildren[1].type).toBe(React.Fragment)

    const gaScripts = asElements(bodyChildren[1].props.children)
    expect(gaScripts[0].props.src).toContain("G-TEST123")
    expect(gaScripts[1].props.id).toBe("ga4-config")
  })
})
