import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select"

describe("ui/select", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: vi.fn(),
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders an open select with label, items and separator", () => {
    render(
      <Select defaultOpen value="alpha">
        <SelectTrigger aria-label="Language" className="trigger-extra">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent className="content-extra">
          <SelectGroup>
            <SelectLabel>Options</SelectLabel>
            <SelectItem value="alpha" className="item-alpha">
              Alpha
            </SelectItem>
            <SelectSeparator className="sep-extra" />
            <SelectItem value="beta">Beta</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    )

    expect(document.querySelector('[role="combobox"]')?.className).toContain("trigger-extra")
    expect(screen.getByText("Options")).toBeInTheDocument()
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0)
    expect(screen.getByRole("option", { name: "Beta" })).toBeInTheDocument()
  })

  it("supports non-popper positioning", () => {
    render(
      <Select defaultOpen defaultValue="alpha" onValueChange={() => {}}>
        <SelectTrigger aria-label="Theme">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="item-aligned">
          <SelectItem value="alpha">Alpha</SelectItem>
          <SelectItem value="beta">Beta</SelectItem>
        </SelectContent>
      </Select>,
    )

    expect(screen.getByRole("listbox")).toBeInTheDocument()
    expect(screen.getByText("Beta")).toBeInTheDocument()
  })
})
