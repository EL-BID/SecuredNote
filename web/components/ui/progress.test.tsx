import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { Progress } from "./progress"

describe("ui/progress", () => {
  it("renders the indicator transform from an explicit value", () => {
    const { container } = render(<Progress value={25} />)

    const indicator = container.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).not.toBeNull()
    expect(indicator).toHaveStyle({ transform: "translateX(-75%)" })
  })

  it("defaults the indicator transform to zero progress", () => {
    const { container } = render(<Progress />)

    const indicator = container.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).not.toBeNull()
    expect(indicator).toHaveStyle({ transform: "translateX(-100%)" })
  })
})
