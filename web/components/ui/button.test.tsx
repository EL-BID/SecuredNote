import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { Button, buttonVariants } from "./button"

describe("ui/button", () => {
  it("renders a native button with variant classes", () => {
    render(<Button variant="destructive">Delete</Button>)

    const button = screen.getByRole("button", { name: "Delete" })
    expect(button).toHaveAttribute("data-slot", "button")
    expect(button.className).toContain("bg-destructive")
    expect(buttonVariants({ size: "lg" })).toContain("h-10")
  })

  it("renders through Slot when asChild is enabled", () => {
    render(
      <Button asChild variant="link">
        <a href="/docs">Docs</a>
      </Button>,
    )

    const link = screen.getByRole("link", { name: "Docs" })
    expect(link).toHaveAttribute("href", "/docs")
    expect(link.className).toContain("underline-offset-4")
  })
})
