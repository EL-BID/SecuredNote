import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { PasswordInputField } from "./password-input-field"

describe("PasswordInputField", () => {
  it("toggles visibility and forwards value changes", () => {
    const onChange = vi.fn()
    render(
      <PasswordInputField
        id="pwd"
        label="Secret"
        value="abc"
        onChange={onChange}
      />,
    )
    const input = screen.getByLabelText("Secret") as HTMLInputElement
    expect(input.type).toBe("password")
    fireEvent.click(screen.getByRole("button"))
    expect(input.type).toBe("text")
    fireEvent.change(input, { target: { value: "xyz" } })
    expect(onChange).toHaveBeenCalledWith("xyz")
  })
})
