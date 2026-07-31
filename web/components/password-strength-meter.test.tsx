import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { PasswordStrengthMeter } from "./password-strength-meter"

vi.mock("@/lib/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
    t: (key: string) => key,
  }),
}))

describe("PasswordStrengthMeter", () => {
  it("renders nothing when password is empty", () => {
    const { container } = render(<PasswordStrengthMeter password="" />)
    expect(container.firstChild).toBeNull()
  })

  it("shows suggestions for weak password", () => {
    render(<PasswordStrengthMeter password="abc" />)
    expect(screen.getByText("strength.suggestionsTitle")).toBeInTheDocument()
  })

  it("rates strong password higher", () => {
    render(<PasswordStrengthMeter password="Str0ng!Passphrase2026" />)
    expect(screen.getByText("strength.veryStrong")).toBeInTheDocument()
  })

  it("covers the weak, acceptable and strong intermediate levels", () => {
    const { rerender } = render(<PasswordStrengthMeter password="xY1" />)
    expect(screen.getByText("strength.weak")).toBeInTheDocument()

    rerender(<PasswordStrengthMeter password="xYabcd12" />)
    expect(screen.getByText("strength.acceptable")).toBeInTheDocument()

    rerender(<PasswordStrengthMeter password="xYabcd12!" />)
    expect(screen.getByText("strength.strong")).toBeInTheDocument()
  })
})
