import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog"

describe("ui/dialog", () => {
  it("renders dialog primitives and optional close button", () => {
    render(
      <Dialog open>
        <DialogTrigger>open</DialogTrigger>
        <DialogPortal>
          <DialogOverlay className="overlay-extra" />
          <DialogContent className="content-extra">
            <DialogHeader className="header-extra">
              <DialogTitle>Dialog title</DialogTitle>
              <DialogDescription>Description</DialogDescription>
            </DialogHeader>
            <DialogFooter className="footer-extra">Footer</DialogFooter>
            <DialogClose>Close custom</DialogClose>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    )

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(document.querySelector('[data-slot="dialog-overlay"]')?.className).toContain(
      "overlay-extra",
    )
    expect(document.querySelector('[data-slot="dialog-content"]')?.className).toContain(
      "content-extra",
    )
    expect(screen.getByText("Dialog title")).toHaveAttribute("data-slot", "dialog-title")
    expect(screen.getByText("Description")).toHaveAttribute(
      "data-slot",
      "dialog-description",
    )
    expect(screen.getByText("Close")).toBeInTheDocument()
  })

  it("can hide the default close button", () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>Body</DialogContent>
      </Dialog>,
    )

    expect(screen.queryByText("Close")).not.toBeInTheDocument()
    expect(screen.getByText("Body")).toBeInTheDocument()
  })
})
