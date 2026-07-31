import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Providers } from "./providers"

vi.mock("@/lib/locale-provider", () => ({
  LocaleProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/lib/branding-provider", () => ({
  BrandingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/components/home-only-footer", () => ({
  HomeOnlyFooter: () => <footer data-testid="footer" />,
}))

vi.mock("sonner", () => ({
  Toaster: () => <div data-testid="toaster" />,
}))

describe("Providers", () => {
  it("wraps children with layout shell", () => {
    const { container } = render(
      <Providers githubRepoUrl="https://github.com/x/y">
        <main data-testid="child">hi</main>
      </Providers>,
    )
    expect(screen.getByTestId("child")).toBeInTheDocument()
    expect(screen.getByTestId("footer")).toBeInTheDocument()
    expect(screen.getByTestId("toaster")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("min-h-dvh")
    expect(container.firstElementChild).not.toHaveClass("min-h-screen")
  })
})
