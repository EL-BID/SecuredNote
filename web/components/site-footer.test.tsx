import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { SiteFooter } from "./site-footer"

const setLocale = vi.fn()

vi.mock("@/lib/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale,
    t: (key: string) => key,
  }),
}))

vi.mock("@/lib/github-repo", () => ({
  getGithubRepoUrl: vi.fn(() => "https://github.com/fallback/repo"),
}))

import { getGithubRepoUrl } from "@/lib/github-repo"

describe("SiteFooter", () => {
  it("renders language controls and github link", () => {
    render(<SiteFooter githubRepoUrl="https://github.com/org/repo" />)
    expect(screen.getAllByText("nav.language").length).toBeGreaterThan(0)
    expect(screen.getByLabelText("github.aria")).toHaveAttribute(
      "href",
      "https://github.com/org/repo",
    )
  })

  it("uses fallback repo url when prop is null", () => {
    const { container } = render(<SiteFooter githubRepoUrl={null} />)
    const link = container.querySelector("footer a")
    expect(link).toHaveAttribute("href", "https://github.com/fallback/repo")
  })

  it("omits the github link when neither runtime nor prop provides one", () => {
    vi.mocked(getGithubRepoUrl).mockReturnValueOnce(null)

    render(<SiteFooter githubRepoUrl={null} />)
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("switches locale from the language pills", () => {
    render(<SiteFooter githubRepoUrl="https://github.com/org/repo" />)
    screen.getByRole("button", { name: "nav.ariaEs" }).click()
    expect(setLocale).toHaveBeenCalledWith("es")
  })
})
