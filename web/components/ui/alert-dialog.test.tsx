import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog"

describe("ui/alert-dialog", () => {
  it("renders the trigger and open content primitives", () => {
    render(
      <AlertDialog open>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent className="custom-content">
          <AlertDialogHeader className="custom-header">
            <AlertDialogTitle className="custom-title">Confirm</AlertDialogTitle>
            <AlertDialogDescription className="custom-description">
              Message
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="custom-footer">
            <AlertDialogCancel className="custom-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction className="custom-action">Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    )

    expect(screen.getByText("Open")).toHaveAttribute("data-slot", "alert-dialog-trigger")
    expect(screen.getByRole("alertdialog")).toHaveClass("custom-content")
    expect(screen.getByText("Confirm")).toHaveClass("custom-title")
    expect(screen.getByText("Message")).toHaveClass("custom-description")
    expect(screen.getByText("Cancel")).toHaveClass("custom-cancel")
    expect(screen.getByText("Continue")).toHaveClass("custom-action")
    expect(document.querySelector('[data-slot="alert-dialog-overlay"]')).not.toBeNull()
  })

  it("forwards action and cancel handlers", () => {
    const onAction = vi.fn()
    const onCancel = vi.fn()

    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogDescription>Message</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onAction}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onAction).toHaveBeenCalledOnce()
  })
})
