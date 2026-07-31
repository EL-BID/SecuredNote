import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { HomeOnlyFooter } from "./home-only-footer"

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}))

vi.mock("@/components/site-footer", () => ({
  SiteFooter: ({ githubRepoUrl }: { githubRepoUrl: string | null }) => (
    <footer data-testid="site-footer">{githubRepoUrl ?? "none"}</footer>
  ),
}))

describe("HomeOnlyFooter", () => {
  it("renders footer on home path", async () => {
    const { usePathname } = await import("next/navigation")
    vi.mocked(usePathname).mockReturnValue("/")
    render(<HomeOnlyFooter githubRepoUrl="https://github.com/x/y" />)
    expect(screen.getByTestId("site-footer")).toHaveTextContent("https://github.com/x/y")
  })

  it("renders nothing off home path", async () => {
    const { usePathname } = await import("next/navigation")
    vi.mocked(usePathname).mockReturnValue("/n/abc")
    const { container } = render(<HomeOnlyFooter githubRepoUrl={null} />)
    expect(container.firstChild).toBeNull()
  })
})
