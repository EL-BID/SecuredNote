import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"

const NOTE_ID = "550e8400-e29b-41d4-a716-446655440000"

describe("NotePage fallback state", () => {
  it("returns null for an unknown internal view state", async () => {
    vi.resetModules()
    vi.doMock("next/navigation", () => ({
      useParams: () => ({ id: NOTE_ID }),
      useRouter: () => ({ push: vi.fn() }),
    }))
    vi.doMock("@/lib/locale-provider", () => ({
      useLocale: () => ({ t: (key: string) => key }),
    }))
    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react")
      return {
        ...actual,
        useState: (initial: unknown) =>
          initial === "loading-metadata"
            ? ["unexpected-view-state", vi.fn()]
            : actual.useState(initial),
      }
    })

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })))

    const { default: NotePage } = await import("./page")
    const { container } = render(<NotePage />)

    expect(container).toBeEmptyDOMElement()
  })
})
