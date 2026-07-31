import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock("@/lib/crypto", () => ({
  bytesToBase64Url: vi.fn(() => "mock-key"),
  encrypt: vi.fn(),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

import { toast } from "sonner"
import { CreateNoteForm } from "./create-note-form"
import { LocaleProvider } from "@/lib/locale-provider"

describe("CreateNoteForm guard rails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("guards against empty content even if the UI button wrapper ignores disabled", () => {
    render(
      <LocaleProvider>
        <CreateNoteForm />
      </LocaleProvider>,
    )

    fireEvent.click(
      screen.getByRole("button", { name: /^Create Secure Note$|^Crear nota segura$/i }),
    )

    expect(toast.error).toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
})
