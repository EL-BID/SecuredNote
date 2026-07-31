import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { DisclaimerModal } from "./disclaimer-modal"
import { LocaleProvider } from "@/lib/locale-provider"
import { mockBrandingContext } from "@/test/mocks"

vi.mock("@/lib/branding-provider", () => ({
  useBranding: vi.fn(),
}))

import { useBranding } from "@/lib/branding-provider"

function renderModal() {
  return render(
    <LocaleProvider>
      <DisclaimerModal />
    </LocaleProvider>,
  )
}

describe("DisclaimerModal", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(useBranding).mockReturnValue(mockBrandingContext())
  })

  it("shows disclaimer when setup is complete and not remembered", async () => {
    renderModal()
    await waitFor(() => {
      expect(screen.getByText(/Important Notice|Aviso importante/i)).toBeInTheDocument()
    })
  })

  it("accept closes modal and can remember choice", async () => {
    renderModal()
    await waitFor(() => screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: /Accept|Aceptar/i }))
    expect(localStorage.getItem("secured-note-disclaimer-remembered")).toBe("1")
  })

  it("stays hidden when disclaimer mode is hidden", async () => {
    vi.mocked(useBranding).mockReturnValue(
      mockBrandingContext({
        branding: {
          ...mockBrandingContext().branding,
          disclaimer: { mode: "hidden" },
        },
      }),
    )
    renderModal()
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("stays hidden when disclaimer was already remembered", async () => {
    localStorage.setItem("secured-note-disclaimer-remembered", "1")
    renderModal()
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("reject clears remembered state and closes without history back fallback", async () => {
    localStorage.setItem("secured-note-disclaimer-remembered", "1")
    window.history.pushState({}, "", "/current")
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {})
    localStorage.removeItem("secured-note-disclaimer-remembered")

    renderModal()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Reject|Rechazar/i })).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole("button", { name: /Reject|Rechazar/i }))
    expect(localStorage.getItem("secured-note-disclaimer-remembered")).toBeNull()
    expect(backSpy).toHaveBeenCalled()
  })

  it("stays hidden until setup is ready and complete", async () => {
    vi.mocked(useBranding).mockReturnValue(
      mockBrandingContext({
        setupReady: false,
        setupComplete: false,
      }),
    )

    renderModal()

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("stays hidden when setup is ready but not complete", async () => {
    vi.mocked(useBranding).mockReturnValue(
      mockBrandingContext({
        setupReady: true,
        setupComplete: false,
      }),
    )

    renderModal()

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("renders custom disclaimer copy and toggles locale pills", async () => {
    vi.mocked(useBranding).mockReturnValue(
      mockBrandingContext({
        branding: {
          ...mockBrandingContext().branding,
          disclaimer: {
            mode: "custom",
            content: {
              en: {
                title: "Custom Title",
                body: "First paragraph.\n\nSecond paragraph.",
              },
              es: {
                title: "Titulo personalizado",
                body: "Primer parrafo.\n\nSegundo parrafo.",
              },
            },
          },
        },
      }),
    )

    renderModal()

    await waitFor(() => {
      expect(screen.getByText("Custom Title")).toBeInTheDocument()
    })
    expect(screen.getByText("First paragraph.")).toBeInTheDocument()
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Switch to Spanish|Cambiar a español/i }))
    expect(screen.getByText("Titulo personalizado")).toBeInTheDocument()
    expect(screen.getByText("Primer parrafo.")).toBeInTheDocument()
    expect(screen.getByText("Segundo parrafo.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Switch to English|Cambiar a inglés/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
  })

  it("accepts without remember and clears any stored flag", async () => {
    renderModal()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Accept|Aceptar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /Accept|Aceptar/i }))
    expect(localStorage.getItem("secured-note-disclaimer-remembered")).toBeNull()
  })

  it("reject closes locally when history cannot go back", async () => {
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {})
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 1,
    })

    renderModal()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Reject|Rechazar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /Reject|Rechazar/i }))
    expect(backSpy).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
