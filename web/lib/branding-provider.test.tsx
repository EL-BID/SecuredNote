import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, render, screen, waitFor } from "@testing-library/react"
import { BrandingProvider, useBranding } from "./branding-provider"
import { mockBranding } from "@/test/mocks"

function Probe() {
  const { setupComplete, branding, setupReady } = useBranding()
  return (
    <div>
      <span data-testid="ready">{String(setupReady)}</span>
      <span data-testid="complete">{String(setupComplete)}</span>
      <span data-testid="name">{branding.appName}</span>
    </div>
  )
}

describe("BrandingProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("loads configured project from API", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          configured: true,
          version: 1,
          branding: mockBranding,
        }),
        { status: 200 },
      ),
    )
    render(
      <BrandingProvider>
        <Probe />
      </BrandingProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("complete")).toHaveTextContent("true")
    })
    expect(screen.getByTestId("name")).toHaveTextContent("Test Notes")
  })

  it("opens wizard when unconfigured", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ configured: false }), { status: 200 }),
    )
    render(
      <BrandingProvider>
        <Probe />
      </BrandingProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("complete")).toHaveTextContent("false")
    })
  })

  it("falls back to localStorage when fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"))
    localStorage.setItem("secured-note-project-setup-done", "1")
    localStorage.setItem("secured-note-branding", JSON.stringify(mockBranding))
    render(
      <BrandingProvider>
        <Probe />
      </BrandingProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("true")
    })
    expect(screen.getByTestId("name")).toHaveTextContent("Test Notes")
  })

  it("ignores a successful bootstrap response after unmount", async () => {
    let resolveFetch: ((value: Response) => void) | null = null
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve
          }),
      ),
    )

    const { unmount } = render(
      <BrandingProvider>
        <Probe />
      </BrandingProvider>,
    )

    unmount()
    resolveFetch?.(
      new Response(
        JSON.stringify({
          configured: true,
          version: 1,
          branding: mockBranding,
        }),
        { status: 200 },
      ),
    )

    await Promise.resolve()
    expect(document.body).toBeTruthy()
  })

  it("ignores a failed bootstrap response after unmount", async () => {
    let rejectFetch: ((reason?: unknown) => void) | null = null
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((_resolve, reject) => {
            rejectFetch = reject
          }),
      ),
    )

    const { unmount } = render(
      <BrandingProvider>
        <Probe />
      </BrandingProvider>,
    )

    unmount()
    rejectFetch?.(new Error("offline"))

    await Promise.resolve()
    expect(debugSpy).toHaveBeenCalled()
  })
})

describe("useBranding", () => {
  it("throws outside provider", () => {
    expect(() => render(<Probe />)).toThrow(/BrandingProvider/)
  })
})

describe("BrandingProvider saveProjectSetup", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("persists branding on successful POST", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ configured: false }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ version: 1, branding: mockBranding }),
            { status: 201 },
          ),
        ),
    )

    function Saver() {
      const { saveProjectSetup, branding } = useBranding()
      return (
        <button type="button" onClick={() => void saveProjectSetup(mockBranding)}>
          save:{branding.appName}
        </button>
      )
    }

    render(
      <BrandingProvider>
        <Saver />
      </BrandingProvider>,
    )
    await waitFor(() => screen.getByRole("button", { name: /save:/i }))
    await act(async () => {
      screen.getByRole("button", { name: /save:/i }).click()
    })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save:/i })).toHaveTextContent("save:Test Notes")
    })
  })

  it("uses conflict config payload on 409 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ configured: false }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              config: {
                version: 1,
                branding: {
                  ...mockBranding,
                  appName: "Conflict Notes",
                },
              },
            }),
            { status: 409 },
          ),
        ),
    )

    function Controls() {
      const { saveProjectSetup } = useBranding()
      return (
        <button type="button" onClick={() => void saveProjectSetup(mockBranding)}>
          save-conflict
        </button>
      )
    }

    render(
      <BrandingProvider>
        <Probe />
        <Controls />
      </BrandingProvider>,
    )

    await waitFor(() => screen.getByRole("button", { name: "save-conflict" }))
    await act(async () => {
      screen.getByRole("button", { name: "save-conflict" }).click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("Conflict Notes")
    })
  })

  it("falls back to requested branding when 409 body is not parseable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ configured: false }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response("{bad-json", { status: 409 })),
    )

    function Controls() {
      const { saveProjectSetup } = useBranding()
      return (
        <button type="button" onClick={() => void saveProjectSetup(mockBranding)}>
          save-fallback
        </button>
      )
    }

    render(
      <BrandingProvider>
        <Probe />
        <Controls />
      </BrandingProvider>,
    )

    await waitFor(() => screen.getByRole("button", { name: "save-fallback" }))
    await act(async () => {
      screen.getByRole("button", { name: "save-fallback" }).click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("Test Notes")
    })
  })

  it("logs parse failures for non-409 error bodies", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ configured: false }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response("{bad-json", { status: 500 })),
    )

    function Controls() {
      const { saveProjectSetup } = useBranding()
      const [error, setError] = React.useState("")
      return (
        <>
          <button
            type="button"
            onClick={async () => {
              try {
                await saveProjectSetup(mockBranding)
              } catch (err) {
                setError(err instanceof Error ? err.message : "unknown")
              }
            }}
          >
            broken-save
          </button>
          <span data-testid="save-error">{error}</span>
        </>
      )
    }

    render(
      <BrandingProvider>
        <Controls />
      </BrandingProvider>,
    )

    await waitFor(() => screen.getByRole("button", { name: "broken-save" }))
    await act(async () => {
      screen.getByRole("button", { name: "broken-save" }).click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("save-error")).toHaveTextContent("HTTP 500")
    })
    expect(debugSpy).toHaveBeenCalled()
  })

  it("surfaces parsed API errors and can dismiss the wizard", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ configured: false }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "Save blocked" }), { status: 500 }),
        ),
    )

    function Controls() {
      const { dismissProjectSetup, saveProjectSetup } = useBranding()
      const [error, setError] = React.useState("")
      return (
        <>
          <button
            type="button"
            onClick={async () => {
              try {
                await saveProjectSetup(mockBranding)
              } catch (err) {
                setError(err instanceof Error ? err.message : "unknown")
              }
            }}
          >
            direct-save
          </button>
          <button type="button" onClick={dismissProjectSetup}>
            direct-dismiss
          </button>
          <span data-testid="save-error">{error}</span>
        </>
      )
    }

    render(
      <BrandingProvider>
        <Controls />
        <Probe />
      </BrandingProvider>,
    )

    await waitFor(() => screen.getByRole("button", { name: "direct-save" }))
    await act(async () => {
      screen.getByRole("button", { name: "direct-save" }).click()
    })
    await waitFor(() => {
      expect(screen.getByTestId("save-error")).toHaveTextContent("Save blocked")
    })

    act(() => {
      screen.getByRole("button", { name: "direct-dismiss" }).click()
    })
    expect(screen.getByTestId("complete")).toHaveTextContent("true")
  })

  it("falls back to the requested branding when a successful save response is unparseable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ configured: false }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), { status: 201 }),
        ),
    )

    function Controls() {
      const { saveProjectSetup } = useBranding()
      return (
        <button type="button" onClick={() => void saveProjectSetup(mockBranding)}>
          save-unparseable
        </button>
      )
    }

    render(
      <BrandingProvider>
        <Probe />
        <Controls />
      </BrandingProvider>,
    )

    await waitFor(() => screen.getByRole("button", { name: "save-unparseable" }))
    await act(async () => {
      screen.getByRole("button", { name: "save-unparseable" }).click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("Test Notes")
    })
  })

  it("falls back to the requested branding when a successful save body is invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ configured: false }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response("{bad-json", { status: 201 })),
    )

    function Controls() {
      const { saveProjectSetup } = useBranding()
      return (
        <button type="button" onClick={() => void saveProjectSetup(mockBranding)}>
          save-invalid-json
        </button>
      )
    }

    render(
      <BrandingProvider>
        <Probe />
        <Controls />
      </BrandingProvider>,
    )

    await waitFor(() => screen.getByRole("button", { name: "save-invalid-json" }))
    await act(async () => {
      screen.getByRole("button", { name: "save-invalid-json" }).click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("Test Notes")
    })
  })

  it("marks setup complete through dismissProjectSetup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ configured: false }), { status: 200 }),
      ),
    )

    function Controls() {
      const { dismissProjectSetup } = useBranding()
      return (
        <button type="button" onClick={dismissProjectSetup}>
          direct-dismiss
        </button>
      )
    }

    render(
      <BrandingProvider>
        <Probe />
        <Controls />
      </BrandingProvider>,
    )

    await waitFor(() => screen.getByRole("button", { name: "direct-dismiss" }))
    act(() => {
      screen.getByRole("button", { name: "direct-dismiss" }).click()
    })

    expect(screen.getByTestId("complete")).toHaveTextContent("true")
  })
})
