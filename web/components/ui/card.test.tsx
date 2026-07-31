import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card"

describe("ui/card", () => {
  it("renders all slots and merges custom classes", () => {
    render(
      <Card className="outer-card" data-testid="card">
        <CardHeader className="hdr">
          <CardTitle className="ttl">Title</CardTitle>
          <CardDescription className="desc">Description</CardDescription>
          <CardAction className="act">Action</CardAction>
        </CardHeader>
        <CardContent className="cnt">Body</CardContent>
        <CardFooter className="ftr">Footer</CardFooter>
      </Card>,
    )

    expect(screen.getByTestId("card")).toHaveAttribute("data-slot", "card")
    expect(screen.getByTestId("card").className).toContain("outer-card")
    expect(screen.getByText("Title")).toHaveAttribute("data-slot", "card-title")
    expect(screen.getByText("Description")).toHaveAttribute(
      "data-slot",
      "card-description",
    )
    expect(screen.getByText("Action")).toHaveAttribute("data-slot", "card-action")
    expect(screen.getByText("Body")).toHaveAttribute("data-slot", "card-content")
    expect(screen.getByText("Footer")).toHaveAttribute("data-slot", "card-footer")
  })
})
