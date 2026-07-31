import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ConfirmReadDialog } from "./confirm-read-dialog"
import { LocaleProvider } from "@/lib/locale-provider"

describe("ConfirmReadDialog", () => {
  it("renders password flow copy", () => {
    const onConfirm = vi.fn()
    render(
      <LocaleProvider>
        <ConfirmReadDialog
          open
          onOpenChange={vi.fn()}
          noteId="abc-123"
          hasPassword
          onConfirm={onConfirm}
        />
      </LocaleProvider>,
    )
    expect(screen.getByText("abc-123")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("renders no-password copy", () => {
    render(
      <LocaleProvider>
        <ConfirmReadDialog
          open
          onOpenChange={vi.fn()}
          noteId="xyz"
          hasPassword={false}
          onConfirm={vi.fn()}
        />
      </LocaleProvider>,
    )
    expect(screen.getByText("xyz")).toBeInTheDocument()
  })

  it("prevents escape close and routes home from cancel", () => {
    const originalLocation = globalThis.location
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { ...originalLocation, href: "/n/abc-123" },
    })

    render(
      <LocaleProvider>
        <ConfirmReadDialog
          open
          onOpenChange={vi.fn()}
          noteId="abc-123"
          hasPassword={false}
          onConfirm={vi.fn()}
        />
      </LocaleProvider>,
    )

    const dialog = screen.getByRole("alertdialog")
    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
    expect(dialog.dispatchEvent(escapeEvent)).toBe(false)
    expect(escapeEvent.defaultPrevented).toBe(true)

    fireEvent.click(screen.getByRole("button", { name: /No, not now|Ahora no/i }))
    expect(globalThis.location.href).toBe("/")

    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: originalLocation,
    })
  })
})
