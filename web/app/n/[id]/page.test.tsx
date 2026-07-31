import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import NotePage from "./page"
import { LocaleProvider } from "@/lib/locale-provider"

const NOTE_ID = "550e8400-e29b-41d4-a716-446655440000"
const KEY_HASH = "dGVzdC1rZXktYmFzZTY0LXVybA"

const push = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: NOTE_ID }),
  useRouter: () => ({ push }),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn(),
}))

vi.mock("@/components/expiration-countdown", () => ({
  ExpirationCountdown: ({
    expiresIn,
    noteLink,
    onExpired,
  }: {
    expiresIn: number
    noteLink: string
    onExpired: () => void
  }) => (
    <button type="button" onClick={onExpired}>
      expire {expiresIn} {noteLink}
    </button>
  ),
}))

import { decrypt } from "@/lib/crypto"
import { toast } from "sonner"

function renderPage() {
  return render(
    <LocaleProvider>
      <NotePage />
    </LocaleProvider>,
  )
}

function metadataResponse(overrides: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      id: NOTE_ID,
      hasPassword: false,
      expiresIn: null,
      createdAt: Date.now(),
      ...overrides,
    }),
    { status: 200 },
  )
}

describe("NotePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn())
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    globalThis.history.replaceState(null, "", `/n/${NOTE_ID}#${KEY_HASH}`)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("shows not found when metadata returns 404", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Note Not Available|Nota no disponible/i)).toBeInTheDocument()
    })
  })

  it("shows confirm dialog after metadata loads", async () => {
    vi.mocked(fetch).mockResolvedValue(metadataResponse())
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByRole("alertdialog", { name: /Read and Destroy|Leer y destruir/i }),
      ).toBeInTheDocument()
    })
  })

  it("shows connection error when metadata fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network"))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Connection Lost|Conexión perdida/i)).toBeInTheDocument()
    })
  })

  it("shows metadata error when response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("broken", { status: 500 }))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Connection Lost|Conexión perdida/i)).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: /Retry Now|Reintentar ahora/i })).toBeInTheDocument()
  })

  it("decrypts and displays note after confirmation", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            cipher: "cipher",
            iv: "iv",
            salt: null,
          }),
          { status: 200 },
        ),
      )
    vi.mocked(decrypt).mockResolvedValue("decrypted secret")

    renderPage()
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))

    await waitFor(() => {
      expect(screen.getByText("decrypted secret")).toBeInTheDocument()
    })
    expect(decrypt).toHaveBeenCalled()
  })

  it("shows connection error when hash is missing", async () => {
    vi.mocked(fetch).mockResolvedValue(metadataResponse())
    globalThis.history.replaceState(null, "", `/n/${NOTE_ID}`)

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))

    await waitFor(() => {
      expect(screen.getByText(/Connection Lost|Conexión perdida/i)).toBeInTheDocument()
    })
  })

  it("reloads the page from the retry action", async () => {
    const reload = vi.fn()
    const originalLocation = globalThis.location
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { ...originalLocation, reload, hash: `#${KEY_HASH}`, pathname: `/n/${NOTE_ID}` },
    })
    vi.mocked(fetch).mockRejectedValue(new Error("network"))

    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Connection Lost|Conexión perdida/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /Retry Now|Reintentar ahora/i }))
    expect(reload).toHaveBeenCalled()

    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: originalLocation,
    })
  })

  it("shows password form when note is protected", async () => {
    vi.mocked(fetch).mockResolvedValue(
      metadataResponse({ hasPassword: true }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Password|Contraseña/i)).toBeInTheDocument()
    })
  })

  it("requires password before submit", async () => {
    vi.mocked(fetch).mockResolvedValue(
      metadataResponse({ hasPassword: true }),
    )
    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))

    await waitFor(() => screen.getByRole("button", { name: /Proceed|Continuar/i }))
    fireEvent.submit(screen.getByRole("button", { name: /Proceed|Continuar/i }).closest("form")!)

    expect(
      screen.getByText(/Password is required|La contraseña es obligatoria/i),
    ).toBeInTheDocument()
  })

  it("shows remaining attempts after wrong password", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse({ hasPassword: true }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ attemptsRemaining: 1 }), { status: 401 }),
      )

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))
    await waitFor(() => screen.getByLabelText(/Password|Contraseña/i))
    fireEvent.change(screen.getByLabelText(/Password|Contraseña/i), {
      target: { value: "wrong" },
    })
    fireEvent.submit(screen.getByRole("button", { name: /Proceed|Continuar/i }).closest("form")!)

    await waitFor(() => {
      expect(screen.getByText(/Incorrect password|Contraseña incorrecta/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Attempts remaining|Intentos restantes/i)).toBeInTheDocument()
  })

  it("falls back to two remaining attempts when the API omits that field", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse({ hasPassword: true }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 401 }),
      )

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))
    await waitFor(() => screen.getByLabelText(/Password|Contraseña/i))
    fireEvent.change(screen.getByLabelText(/Password|Contraseña/i), {
      target: { value: "wrong" },
    })
    fireEvent.submit(screen.getByRole("button", { name: /Proceed|Continuar/i }).closest("form")!)

    await waitFor(() => {
      expect(screen.getByText(/Attempts remaining: 2|Intentos restantes: 2/i)).toBeInTheDocument()
    })
  })

  it("shows lockout state after too many attempts", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse({ hasPassword: true }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ retryAfter: 30 }), { status: 429 }),
      )

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))
    await waitFor(() => screen.getByLabelText(/Password|Contraseña/i))
    fireEvent.change(screen.getByLabelText(/Password|Contraseña/i), {
      target: { value: "wrong" },
    })
    fireEvent.submit(screen.getByRole("button", { name: /Proceed|Continuar/i }).closest("form")!)

    await waitFor(() => {
      expect(screen.getByText(/Temporarily locked|Bloqueado temporalmente/i)).toBeInTheDocument()
    })
  })

  it("falls back to a 60 second lockout when retryAfter is missing", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse({ hasPassword: true }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 429 }),
      )

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))
    await waitFor(() => screen.getByLabelText(/Password|Contraseña/i))
    fireEvent.change(screen.getByLabelText(/Password|Contraseña/i), {
      target: { value: "wrong" },
    })
    fireEvent.submit(screen.getByRole("button", { name: /Proceed|Continuar/i }).closest("form")!)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Wait 60s|Espera 60s/i })).toBeDisabled()
    })
  })

  it("does not submit again while the password flow is locked out", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse({ hasPassword: true }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ retryAfter: 30 }), { status: 429 }),
      )

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))
    await waitFor(() => screen.getByLabelText(/Password|Contraseña/i))
    fireEvent.change(screen.getByLabelText(/Password|Contraseña/i), {
      target: { value: "wrong" },
    })
    fireEvent.submit(screen.getByRole("button", { name: /Proceed|Continuar/i }).closest("form")!)

    await waitFor(() => {
      expect(screen.getByText(/Temporarily locked|Bloqueado temporalmente/i)).toBeInTheDocument()
    })

    fireEvent.submit(screen.getByRole("button", { name: /Wait|Espera/i }).closest("form")!)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
  })

  it("counts down the lockout timer until the form is usable again", async () => {
    const intervalCallbackRef: { current: (() => void) | null } = { current: null }
    const setIntervalSpy = vi
      .spyOn(globalThis, "setInterval")
      .mockImplementation((callback: TimerHandler) => {
        intervalCallbackRef.current = callback as () => void
        return 1 as unknown as ReturnType<typeof setInterval>
      })
    const clearIntervalSpy = vi
      .spyOn(globalThis, "clearInterval")
      .mockImplementation(() => undefined)

    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse({ hasPassword: true }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ retryAfter: 2 }), { status: 429 }),
      )

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))
    await waitFor(() => screen.getByLabelText(/Password|Contraseña/i))
    fireEvent.change(screen.getByLabelText(/Password|Contraseña/i), {
      target: { value: "wrong" },
    })
    fireEvent.submit(screen.getByRole("button", { name: /Proceed|Continuar/i }).closest("form")!)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Wait 2s|Espera 2s/i })).toBeDisabled()
    })

    expect(intervalCallbackRef.current).not.toBeNull()

    act(() => {
      intervalCallbackRef.current?.()
    })
    expect(screen.getByRole("button", { name: /Wait 1s|Espera 1s/i })).toBeDisabled()

    act(() => {
      intervalCallbackRef.current?.()
    })

    expect(await screen.findByRole("button", { name: /Proceed|Continuar/i })).toBeEnabled()
    expect(clearIntervalSpy).toHaveBeenCalled()
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it("shows fetch error when note response is not ok", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(new Response("bad", { status: 500 }))

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))

    await waitFor(() => {
      expect(screen.getByText(/Connection Lost|Conexión perdida/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Could not load the note|No se pudo obtener la nota/i)).toBeInTheDocument()
  })

  it("shows not found when the note fetch returns 404 after confirmation", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(new Response(null, { status: 404 }))

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))

    await waitFor(() => {
      expect(screen.getByText(/Note Not Available|Nota no disponible/i)).toBeInTheDocument()
    })
  })

  it("handles decrypt failure", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ cipher: "c", iv: "i", salt: null }), { status: 200 }),
      )
    vi.mocked(decrypt).mockRejectedValue(new Error("decrypt failed"))

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))

    await waitFor(() => {
      expect(screen.getByText(/Connection Lost|Conexión perdida/i)).toBeInTheDocument()
    })
    expect(screen.getByText("decrypt failed")).toBeInTheDocument()
  })

  it("falls back to the translated decrypt error for non-Error throws", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ cipher: "c", iv: "i", salt: null }), { status: 200 }),
      )
    vi.mocked(decrypt).mockRejectedValue("boom")

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))

    await waitFor(() => {
      expect(screen.getByText(/Could not decrypt the note|No se pudo descifrar la nota/i)).toBeInTheDocument()
    })
  })

  it("copies decrypted content", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ cipher: "c", iv: "i", salt: null }),
          { status: 200 },
        ),
      )
    vi.mocked(decrypt).mockResolvedValue("copy me")

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))

    await waitFor(() => screen.getByText("copy me"))
    fireEvent.click(screen.getByRole("button", { name: /^Copy$|^Copiar$/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    })
  })

  it("shows copy failure toast", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("nope")) },
    })
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse({ expiresIn: 10 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ cipher: "c", iv: "i", salt: null }), { status: 200 }),
      )
    vi.mocked(decrypt).mockResolvedValue("copy me")

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))
    await waitFor(() => screen.getByText("copy me"))
    fireEvent.click(screen.getByRole("button", { name: /^Copy$|^Copiar$/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
    expect(screen.getByText(/http:\/\/localhost:3000\/n\//i)).toBeInTheDocument()
  })

  it("shows destroyed warning when expiresIn is already zero and can close", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse({ expiresIn: -1 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ cipher: "c", iv: "i", salt: null }), { status: 200 }),
      )
    vi.mocked(decrypt).mockResolvedValue("destroyed soon")

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))
    await waitFor(() => screen.getByText("destroyed soon"))

    expect(screen.getByText(/Warning: This note has been destroyed|Aviso: esta nota ha sido destruida/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Close|Cerrar/i }))
    expect(push).toHaveBeenCalledWith("/")
  })

  it("shows the expired state after the countdown callback fires", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(metadataResponse({ expiresIn: 10 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ cipher: "c", iv: "i", salt: null }), { status: 200 }),
      )
    vi.mocked(decrypt).mockResolvedValue("expiring")

    renderPage()
    await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(screen.getByRole("button", { name: /Yes, view the note|Sí, ver la nota/i }))
    await waitFor(() => screen.getByText("expiring"))

    fireEvent.click(screen.getByRole("button", { name: /expire 10/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Note Expired|Esta nota ha expirado/i),
      ).toBeInTheDocument()
    })
  })
})
