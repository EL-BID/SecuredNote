import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"
import { ExpirationCountdown } from "./expiration-countdown"

vi.mock("@/lib/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
    t: (_key: string, vars?: Record<string, string | number>) =>
      vars ? `ttl:${vars.minutes}:${vars.seconds}` : "countdown",
  }),
}))

describe("ExpirationCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows note link and ticks down", async () => {
    const onExpired = vi.fn()
    render(
      <ExpirationCountdown
        expiresIn={3}
        noteLink="https://example.com/n/1"
        onExpired={onExpired}
      />,
    )
    expect(screen.getByText("https://example.com/n/1")).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(3500)
    })
    expect(onExpired).toHaveBeenCalled()
  })

  it("expires immediately at zero and copies the note link", () => {
    const onExpired = vi.fn()
    render(
      <ExpirationCountdown
        expiresIn={0}
        noteLink="https://example.com/n/2"
        onExpired={onExpired}
      />,
    )

    expect(onExpired).toHaveBeenCalledOnce()
    screen.getByRole("button", { name: /countdown|copy/i }).click()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://example.com/n/2")
  })

  it("renders singular minute and second labels", () => {
    render(
      <ExpirationCountdown
        expiresIn={61}
        noteLink="https://example.com/n/3"
        onExpired={vi.fn()}
      />,
    )

    expect(screen.getByText("ttl:1:1")).toBeInTheDocument()
  })
})
