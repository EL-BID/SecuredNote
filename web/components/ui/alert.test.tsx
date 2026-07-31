import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { Alert, AlertDescription, AlertTitle } from "./alert"

describe("ui/alert", () => {
  it("renders default alerts", () => {
    render(
      <Alert className="alert-extra">
        <AlertTitle className="title-extra">Notice</AlertTitle>
        <AlertDescription className="desc-extra">
          <p>Alert body</p>
        </AlertDescription>
      </Alert>,
    )

    expect(screen.getByRole("alert").className).toContain("alert-extra")
    expect(screen.getByText("Notice")).toHaveAttribute("data-slot", "alert-title")
    expect(screen.getByText("Alert body").parentElement).toHaveAttribute(
      "data-slot",
      "alert-description",
    )
  })

  it("renders destructive variant", () => {
    render(<Alert variant="destructive">Danger</Alert>)
    expect(screen.getByRole("alert").className).toContain("text-destructive")
  })
})
