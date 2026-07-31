import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { HomePageClient } from "./home-page-client"
import { LocaleProvider } from "@/lib/locale-provider"
import { mockBrandingContext } from "@/test/mocks"

vi.mock("@/lib/branding-provider", () => ({
  useBranding: vi.fn(),
}))

vi.mock("@/components/disclaimer-modal", () => ({
  DisclaimerModal: () => <div data-testid="disclaimer" />,
}))

vi.mock("@/components/create-note-form", () => ({
  CreateNoteForm: () => <div data-testid="create-form" />,
}))

vi.mock("@/components/project-setup-modal", () => ({
  ProjectSetupModal: () => <div data-testid="setup-wizard" />,
}))

import { useBranding } from "@/lib/branding-provider"

describe("HomePageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows setup wizard when setup is incomplete", () => {
    vi.mocked(useBranding).mockReturnValue(
      mockBrandingContext({ setupComplete: false, setupReady: true }),
    )
    const { container } = render(
      <LocaleProvider>
        <HomePageClient />
      </LocaleProvider>,
    )
    expect(
      screen.getByText(/finish the first-time setup|termina la configuración inicial/i),
    ).toBeInTheDocument()
    expect(screen.getByTestId("setup-wizard")).toBeInTheDocument()
    expect(screen.queryByTestId("create-form")).not.toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("flex-1")
    expect(container.firstElementChild).not.toHaveClass("min-h-screen")
  })

  it("shows the main app when configured", () => {
    vi.mocked(useBranding).mockReturnValue(mockBrandingContext())
    render(
      <LocaleProvider>
        <HomePageClient />
      </LocaleProvider>,
    )
    expect(
      screen.queryByTestId("setup-wizard"),
    ).not.toBeInTheDocument()
    expect(screen.getByText("Test Notes")).toBeInTheDocument()
    expect(screen.getByTestId("create-form")).toBeInTheDocument()
  })

  it("renders the uploaded logo when branding provides one", () => {
    vi.mocked(useBranding).mockReturnValue(
      mockBrandingContext({
        branding: {
          ...mockBrandingContext().branding,
          logoDataUrl: "data:image/png;base64,abc",
        },
      }),
    )
    render(
      <LocaleProvider>
        <HomePageClient />
      </LocaleProvider>,
    )
    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      "data:image/png;base64,abc",
    )
  })
})
