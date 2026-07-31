import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/components/home-page-client", () => ({
  HomePageClient: () => <div data-testid="home-page-client" />,
}))

import HomePage from "./page"

describe("app/page", () => {
  it("renders the home page client", () => {
    render(<HomePage />)
    expect(screen.getByTestId("home-page-client")).toBeInTheDocument()
  })
})
