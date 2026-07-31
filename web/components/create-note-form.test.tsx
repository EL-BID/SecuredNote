import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CreateNoteForm } from "./create-note-form"
import { LocaleProvider } from "@/lib/locale-provider"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock("@/lib/crypto", () => ({
  bytesToBase64Url: vi.fn(() => "mock-key"),
  encrypt: vi.fn(async () => ({
    cipher: "mock-cipher",
    iv: "mock-iv",
    salt: "mock-salt",
  })),
}))

import { bytesToBase64Url, encrypt } from "@/lib/crypto"
import { toast } from "sonner"

function renderForm() {
  return render(
    <LocaleProvider>
      <CreateNoteForm />
    </LocaleProvider>,
  )
}

function createButton() {
  return screen.getByRole("button", { name: /^Create Secure Note$|^Crear nota segura$/i })
}

describe("CreateNoteForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn())
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        subtle: {
          generateKey: vi.fn().mockResolvedValue({}),
          exportKey: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
        },
      },
    })
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it("disables submit when content is empty", () => {
    renderForm()
    expect(createButton()).toBeDisabled()
  })

  it("creates a note and shows result panel", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ id: "550e8400-e29b-41d4-a716-446655440000", hasPassword: false }),
        { status: 201 },
      ),
    )
    renderForm()
    fireEvent.change(screen.getByLabelText(/Note Content|Contenido de la nota/i), {
      target: { value: "secret message" },
    })
    fireEvent.click(createButton())
    expect(
      await screen.findByText(/Note Created Successfully|Nota creada correctamente/i),
    ).toBeInTheDocument()
    expect(encrypt).toHaveBeenCalledWith("secret message", "mock-key")
    expect(bytesToBase64Url).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalled()
  })

  it("validates password fields when protection enabled", async () => {
    renderForm()
    fireEvent.click(screen.getByRole("switch", { name: /Protect with Password|Proteger con contraseña/i }))
    fireEvent.change(screen.getByLabelText(/Note Content|Contenido de la nota/i), {
      target: { value: "x" },
    })
    fireEvent.click(createButton())
    expect(toast.error).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(
      screen.getByText(/Both password fields are required|Ambos campos de contraseña son obligatorios/i),
    ).toBeInTheDocument()
  })

  it("validates mismatched passwords", () => {
    renderForm()
    fireEvent.click(screen.getByRole("switch", { name: /Protect with Password|Proteger con contraseña/i }))
    fireEvent.change(screen.getByLabelText(/Note Content|Contenido de la nota/i), {
      target: { value: "secret" },
    })
    fireEvent.change(screen.getByLabelText(/^Password$|^Contraseña$/i), {
      target: { value: "abc12345" },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password|Confirmar contraseña/i), {
      target: { value: "different" },
    })

    fireEvent.click(createButton())

    expect(
      screen.getByText(/Passwords do not match|Las contraseñas no coinciden/i),
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows API errors and resets loading state", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 500 }))
    renderForm()

    fireEvent.change(screen.getByLabelText(/Note Content|Contenido de la nota/i), {
      target: { value: "secret message" },
    })
    fireEvent.click(createButton())

    expect(await screen.findByRole("button", { name: /^Create Secure Note$|^Crear nota segura$/i })).toBeEnabled()
    expect(toast.error).toHaveBeenCalled()
  })

  it("shows copy errors when clipboard access fails", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    })
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ id: "550e8400-e29b-41d4-a716-446655440000", hasPassword: false }),
        { status: 201 },
      ),
    )
    renderForm()

    fireEvent.change(screen.getByLabelText(/Note Content|Contenido de la nota/i), {
      target: { value: "secret message" },
    })
    fireEvent.click(createButton())
    await screen.findByText(/Note Created Successfully|Nota creada correctamente/i)

    fireEvent.click(screen.getAllByRole("button")[0])
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })

  it("calls onSuccess and renders password result tools", async () => {
    const onSuccess = vi.fn()
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ id: "550e8400-e29b-41d4-a716-446655440000", hasPassword: true }),
        { status: 201 },
      ),
    )

    render(
      <LocaleProvider>
        <CreateNoteForm onSuccess={onSuccess} />
      </LocaleProvider>,
    )

    fireEvent.change(screen.getByLabelText(/Note Content|Contenido de la nota/i), {
      target: { value: "secret message" },
    })
    fireEvent.click(screen.getByRole("switch", { name: /Protect with Password|Proteger con contraseña/i }))
    fireEvent.change(screen.getByLabelText(/^Password$|^Contraseña$/i), {
      target: { value: "abc12345" },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password|Confirmar contraseña/i), {
      target: { value: "abc12345" },
    })
    fireEvent.click(createButton())

    expect(await screen.findByText(/Note Created Successfully|Nota creada correctamente/i)).toBeInTheDocument()
    expect(onSuccess).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000")

    const passwordField = screen.getByDisplayValue("abc12345") as HTMLInputElement
    expect(passwordField.type).toBe("password")
    fireEvent.click(screen.getAllByRole("button")[1])
    expect(passwordField.type).toBe("text")
  })

  it("copies link and password, then resets the form", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ id: "550e8400-e29b-41d4-a716-446655440000", hasPassword: true }),
        { status: 201 },
      ),
    )
    renderForm()

    fireEvent.change(screen.getByLabelText(/Note Content|Contenido de la nota/i), {
      target: { value: "secret message" },
    })
    fireEvent.click(screen.getByRole("switch", { name: /Protect with Password|Proteger con contraseña/i }))
    fireEvent.change(screen.getByLabelText(/^Password$|^Contraseña$/i), {
      target: { value: "abc12345" },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password|Confirmar contraseña/i), {
      target: { value: "abc12345" },
    })
    fireEvent.click(createButton())
    await screen.findByText(/Note Created Successfully|Nota creada correctamente/i)

    fireEvent.click(screen.getAllByRole("button")[0])
    fireEvent.click(screen.getAllByRole("button")[2])
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(3))

    fireEvent.click(screen.getByRole("button", { name: /Create Another|Crear otra/i }))

    expect(screen.getByLabelText(/Note Content|Contenido de la nota/i)).toHaveValue("")
    expect(screen.getByRole("button", { name: /^Create Secure Note$|^Crear nota segura$/i })).toBeDisabled()
  })

  it("shows the expiration summary when ttl is configured", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ id: "550e8400-e29b-41d4-a716-446655440000", hasPassword: false }),
        { status: 201 },
      ),
    )
    renderForm()

    fireEvent.change(screen.getByLabelText(/Note Content|Contenido de la nota/i), {
      target: { value: "secret message" },
    })
    const expirationButton = screen.getByRole("button", { name: /Expiration Settings|Configuración de expiración/i })
    fireEvent.click(expirationButton)
    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.click(screen.getByRole("option", { name: /1 hour|1 hora/i }))
    fireEvent.click(expirationButton)
    fireEvent.click(createButton())

    expect(
      await screen.findByText(
        /This note will automatically expire Within 1 hour\.|Esta nota expirará automáticamente en 1 hora\./i,
      ),
    ).toBeInTheDocument()
  })

  it("clears password fields when protection is disabled", () => {
    renderForm()
    const toggle = screen.getByRole("switch", { name: /Protect with Password|Proteger con contraseña/i })
    fireEvent.click(toggle)
    fireEvent.change(screen.getByLabelText(/^Password$|^Contraseña$/i), {
      target: { value: "abc12345" },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password|Confirmar contraseña/i), {
      target: { value: "abc12345" },
    })

    fireEvent.click(toggle)
    fireEvent.click(toggle)

    expect(screen.getByLabelText(/^Password$|^Contraseña$/i)).toHaveValue("")
    expect(screen.getByLabelText(/Confirm Password|Confirmar contraseña/i)).toHaveValue("")
  })
})
