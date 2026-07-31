import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import {
  ConnectionErrorScreen,
  ExpiredScreen,
  NotFoundScreen,
} from "./note-state-screens"

vi.mock("@/lib/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
    t: (key: string) => key,
  }),
}))

describe("note-state-screens", () => {
  it("NotFoundScreen calls onClose", () => {
    const onClose = vi.fn()
    render(<NotFoundScreen onClose={onClose} />)
    fireEvent.click(screen.getByRole("button"))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("ExpiredScreen shows note id", () => {
    render(<ExpiredScreen noteId="abc-123" onClose={vi.fn()} />)
    expect(screen.getByText("abc-123")).toBeInTheDocument()
  })

  it("ConnectionErrorScreen retries", () => {
    const onRetry = vi.fn()
    render(<ConnectionErrorScreen onRetry={onRetry} />)
    fireEvent.click(screen.getByText("connection.retry"))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
