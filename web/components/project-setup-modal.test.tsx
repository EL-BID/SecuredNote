import { describe, expect, it, vi, afterEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ProjectSetupModal } from "./project-setup-modal"
import { LocaleProvider } from "@/lib/locale-provider"
import * as localeProviderModule from "@/lib/locale-provider"
import {
  DEFAULT_PROJECT_BRANDING,
  type ProjectBranding,
} from "@/lib/project-branding"

type ModalProps = {
  open?: boolean
  initialBranding?: ProjectBranding
  onSave?: (b: ProjectBranding) => Promise<void>
  onDismiss?: () => void
}

function renderModal({
  open = true,
  initialBranding = DEFAULT_PROJECT_BRANDING,
  onSave = vi.fn().mockResolvedValue(undefined),
  onDismiss = vi.fn(),
}: ModalProps = {}) {
  const save = onSave
  const dismiss = onDismiss
  const view = render(
    <LocaleProvider>
      <ProjectSetupModal
        open={open}
        initialBranding={initialBranding}
        onSave={save}
        onDismiss={dismiss}
      />
    </LocaleProvider>,
  )
  return { onSave: save, onDismiss: dismiss, ...view }
}

function continueBtn() {
  return screen.getByRole("button", { name: /Continue|Continuar/i })
}

function nextBtn() {
  return screen.getByRole("button", { name: /Next|Siguiente/i })
}

function backBtn() {
  return screen.getByRole("button", { name: /Back|Atrás/i })
}

function saveBtn() {
  return screen.getByRole("button", { name: /Save and finish|Guardar y finalizar/i })
}

function appNameInput() {
  return screen.getByLabelText(/App name|Nombre de la aplicación/i)
}

function goToBrandStep() {
  fireEvent.click(continueBtn())
}

function goToLegalStep(appName = "My Site") {
  goToBrandStep()
  fireEvent.change(appNameInput(), { target: { value: appName } })
  fireEvent.click(nextBtn())
}

type LogoMockOptions = {
  fileType?: string
  readerFails?: boolean
  imageFails?: boolean
  noCanvasContext?: boolean
  naturalWidth?: number
  naturalHeight?: number
  dataUrl?: string
  hugeOutput?: boolean
}

function setupLogoUploadMocks({
  fileType = "image/png",
  readerFails = false,
  imageFails = false,
  noCanvasContext = false,
  naturalWidth = 64,
  naturalHeight = 64,
  dataUrl = "data:image/png;base64,abc",
  hugeOutput = false,
}: LogoMockOptions = {}) {
  class MockFileReader {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    result: string | ArrayBuffer | null = null

    readAsDataURL() {
      if (readerFails) {
        this.onerror?.()
        return
      }
      this.result = dataUrl
      this.onload?.()
    }
  }

  class MockImage {
    naturalWidth = naturalWidth
    naturalHeight = naturalHeight
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    set src(_value: string) {
      if (imageFails) {
        this.onerror?.()
        return
      }
      this.onload?.()
    }
  }

  vi.stubGlobal("FileReader", MockFileReader)
  vi.stubGlobal("Image", MockImage)

  const drawImage = vi.fn()
  const getContext = vi.fn(() =>
    noCanvasContext ? null : ({ drawImage } as unknown as CanvasRenderingContext2D),
  )
  const toDataURL = vi.fn(() =>
    hugeOutput ? `data:image/jpeg;base64,${"x".repeat(500_000)}` : "data:image/jpeg;base64,ok",
  )

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(getContext)
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(toDataURL)

  const file = new File(["pixels"], "logo.png", { type: fileType })
  return { file, drawImage, getContext, toDataURL }
}

function uploadLogo(file: File) {
  const input = document.getElementById("setup-logo") as HTMLInputElement
  Object.defineProperty(input, "files", {
    value: [file],
    configurable: true,
  })
  fireEvent.change(input)
}

describe("ProjectSetupModal", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("walks through wizard steps and saves with default disclaimer", async () => {
    const { onSave, onDismiss } = renderModal()

    goToLegalStep("My Site")
    fireEvent.click(saveBtn())

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave.mock.calls[0][0]).toMatchObject({
      appName: "My Site",
      disclaimer: { mode: "default" },
    })

    fireEvent.click(
      screen.getByRole("button", { name: /Open Secured Notes|Abrir Secured Notes/i }),
    )
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it("initializes from custom disclaimer branding on open", async () => {
    const customBranding: ProjectBranding = {
      ...DEFAULT_PROJECT_BRANDING,
      appName: "Custom App",
      disclaimer: {
        mode: "custom",
        content: {
          en: { title: "Legal title", body: "Legal body" },
          es: { title: "Titulo legal", body: "Texto legal" },
        },
      },
    }

    renderModal({ initialBranding: customBranding })
    goToLegalStep("Custom App")

    expect(screen.getByDisplayValue("Legal title")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Legal body")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Titulo legal")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Texto legal")).toBeInTheDocument()
  })

  it("omits the step description when the translator returns an empty string", () => {
    const useLocaleSpy = vi
      .spyOn(localeProviderModule, "useLocale")
      .mockReturnValue({
        locale: "en",
        setLocale: vi.fn(),
        t: (key: string) => (key === "setup.welcomeSubtitle" ? "" : key),
      })

    renderModal()

    expect(screen.queryByText("setup.welcomeSubtitle")).not.toBeInTheDocument()
    useLocaleSpy.mockRestore()
  })

  it("does not reset state while modal stays open", () => {
    const brandingA: ProjectBranding = {
      ...DEFAULT_PROJECT_BRANDING,
      appName: "First",
    }
    const brandingB: ProjectBranding = {
      ...DEFAULT_PROJECT_BRANDING,
      appName: "Second",
    }

    const onSave = vi.fn().mockResolvedValue(undefined)
    const onDismiss = vi.fn()

    const ui = (
      <LocaleProvider>
        <ProjectSetupModal
          open
          initialBranding={brandingA}
          onSave={onSave}
          onDismiss={onDismiss}
        />
      </LocaleProvider>
    )

    const { rerender } = render(ui)
    goToBrandStep()
    fireEvent.change(appNameInput(), { target: { value: "Edited" } })

    rerender(
      <LocaleProvider>
        <ProjectSetupModal
          open
          initialBranding={brandingB}
          onSave={onSave}
          onDismiss={onDismiss}
        />
      </LocaleProvider>,
    )

    expect(appNameInput()).toHaveValue("Edited")
  })

  it("does nothing when rerendered open after initialization", () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onDismiss = vi.fn()

    const ui = (
      <LocaleProvider>
        <ProjectSetupModal
          open
          initialBranding={DEFAULT_PROJECT_BRANDING}
          onSave={onSave}
          onDismiss={onDismiss}
        />
      </LocaleProvider>
    )

    const { rerender } = render(ui)
    goToBrandStep()
    fireEvent.change(appNameInput(), { target: { value: "Keep me" } })

    rerender(ui)
    expect(appNameInput()).toHaveValue("Keep me")
  })

  it("re-initializes when modal closes and reopens", () => {
    const branding: ProjectBranding = {
      ...DEFAULT_PROJECT_BRANDING,
      appName: "Reopened",
    }
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onDismiss = vi.fn()

    const ui = (open: boolean) => (
      <LocaleProvider>
        <ProjectSetupModal
          open={open}
          initialBranding={branding}
          onSave={onSave}
          onDismiss={onDismiss}
        />
      </LocaleProvider>
    )

    const { rerender } = render(ui(true))
    goToBrandStep()
    fireEvent.change(appNameInput(), { target: { value: "Changed" } })

    rerender(ui(false))
    rerender(ui(true))
    goToBrandStep()
    expect(appNameInput()).toHaveValue("Reopened")
  })

  it("switches locale with language pills", () => {
    renderModal()
    fireEvent.click(screen.getByRole("button", { name: /Switch to Spanish|Cambiar a español/i }))
    expect(screen.getByRole("button", { name: /Continuar/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Switch to English|Cambiar a inglés/i }))
    expect(continueBtn()).toBeInTheDocument()
  })

  it("shows name error when brand step next is clicked without app name", () => {
    renderModal({
      initialBranding: { ...DEFAULT_PROJECT_BRANDING, appName: "" },
    })
    goToBrandStep()
    fireEvent.click(nextBtn())
    expect(screen.getByText(/Enter an app name\.|Introduce un nombre para la aplicación\./i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Save and finish|Guardar y finalizar/i })).toBeNull()
  })

  it("navigates back from brand and legal steps", () => {
    renderModal()
    goToLegalStep()
    fireEvent.click(backBtn())
    expect(appNameInput()).toBeInTheDocument()

    fireEvent.click(backBtn())
    expect(continueBtn()).toBeInTheDocument()
  })

  it("uploads and removes a logo successfully", async () => {
    const { file } = setupLogoUploadMocks({ naturalWidth: 256, naturalHeight: 128 })
    renderModal()
    goToBrandStep()

    uploadLogo(file)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Remove logo|Quitar logo/i })).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole("button", { name: /Remove logo|Quitar logo/i }))
    expect(screen.queryByRole("button", { name: /Remove logo|Quitar logo/i })).toBeNull()
  })

  it("shows logo error for non-image files", async () => {
    const { file } = setupLogoUploadMocks({ fileType: "text/plain" })
    renderModal()
    goToBrandStep()
    uploadLogo(file)

    await waitFor(() =>
      expect(
        screen.getByText(
          /Could not use this image|No se pudo usar esta imagen/i,
        ),
      ).toBeInTheDocument(),
    )
  })

  it("ignores logo change events with no selected file", () => {
    renderModal()
    goToBrandStep()

    const input = document.getElementById("setup-logo") as HTMLInputElement
    Object.defineProperty(input, "files", {
      value: [],
      configurable: true,
    })
    fireEvent.change(input)

    expect(screen.queryByText(/Could not use this image|No se pudo usar esta imagen/i)).toBeNull()
  })

  it("shows logo error when FileReader fails", async () => {
    const { file } = setupLogoUploadMocks({ readerFails: true })
    renderModal()
    goToBrandStep()
    uploadLogo(file)

    await waitFor(() =>
      expect(
        screen.getByText(
          /Could not use this image|No se pudo usar esta imagen/i,
        ),
      ).toBeInTheDocument(),
    )
  })

  it("shows logo error when image decode fails", async () => {
    const { file } = setupLogoUploadMocks({ imageFails: true })
    renderModal()
    goToBrandStep()
    uploadLogo(file)

    await waitFor(() =>
      expect(
        screen.getByText(
          /Could not use this image|No se pudo usar esta imagen/i,
        ),
      ).toBeInTheDocument(),
    )
  })

  it("shows logo error when canvas context is unavailable", async () => {
    const { file } = setupLogoUploadMocks({ noCanvasContext: true })
    renderModal()
    goToBrandStep()
    uploadLogo(file)

    await waitFor(() =>
      expect(
        screen.getByText(
          /Could not use this image|No se pudo usar esta imagen/i,
        ),
      ).toBeInTheDocument(),
    )
  })

  it("shows logo error when compressed data URL is too large", async () => {
    const { file } = setupLogoUploadMocks({ hugeOutput: true })
    renderModal()
    goToBrandStep()
    uploadLogo(file)

    await waitFor(() =>
      expect(
        screen.getByText(
          /Could not use this image|No se pudo usar esta imagen/i,
        ),
      ).toBeInTheDocument(),
    )
  })

  it("resizes wide logos during compression", async () => {
    const { file, drawImage } = setupLogoUploadMocks({ naturalWidth: 400, naturalHeight: 100 })
    renderModal()
    goToBrandStep()
    uploadLogo(file)

    await waitFor(() => expect(drawImage).toHaveBeenCalled())
  })

  it("resizes tall logos during compression", async () => {
    const { file, drawImage } = setupLogoUploadMocks({ naturalWidth: 100, naturalHeight: 400 })
    renderModal()
    goToBrandStep()
    uploadLogo(file)

    await waitFor(() => expect(drawImage).toHaveBeenCalled())
  })

  it("saves with hidden disclaimer", async () => {
    const { onSave } = renderModal()
    goToLegalStep()

    fireEvent.click(screen.getByText(/Do not show a notice|No mostrar aviso/i))
    fireEvent.click(saveBtn())

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave.mock.calls[0][0].disclaimer).toEqual({ mode: "hidden" })
  })

  it("shows the built-in disclaimer preview for the selected app language", () => {
    renderModal()
    goToLegalStep()

    expect(screen.getByText(/Important notice|Aviso importante/i)).toBeInTheDocument()
    expect(
      screen.getByText(/This is provisional placeholder text|Este es un texto provisional de ejemplo/i),
    ).toBeInTheDocument()
  })

  it("shows error when custom disclaimer is incomplete", async () => {
    renderModal()
    goToLegalStep()

    fireEvent.click(screen.getByText(/Custom title and text|Título y texto personalizados/i))
    fireEvent.click(saveBtn())

    await waitFor(() =>
      expect(
        screen.getByText(
          /Enter both a title and body|Introduce título y texto/i,
        ),
      ).toBeInTheDocument(),
    )
  })

  it("saves with custom disclaimer when title and body are filled", async () => {
    const { onSave } = renderModal()
    goToLegalStep()

    fireEvent.click(screen.getByText(/Custom title and text|Título y texto personalizados/i))
    fireEvent.change(document.getElementById("disclaimer-custom-title-en") as HTMLElement, {
      target: { value: "Terms" },
    })
    fireEvent.change(document.getElementById("disclaimer-custom-body-en") as HTMLElement, {
      target: { value: "Please read carefully." },
    })
    fireEvent.change(document.getElementById("disclaimer-custom-title-es") as HTMLElement, {
      target: { value: "Términos" },
    })
    fireEvent.change(document.getElementById("disclaimer-custom-body-es") as HTMLElement, {
      target: { value: "Lee esto con cuidado." },
    })
    fireEvent.click(saveBtn())

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave.mock.calls[0][0].disclaimer).toEqual({
      mode: "custom",
      content: {
        en: { title: "Terms", body: "Please read carefully." },
        es: { title: "Términos", body: "Lee esto con cuidado." },
      },
    })
  })

  it("shows save error message when onSave rejects", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Network down"))
    renderModal({ onSave })
    goToLegalStep()
    fireEvent.click(saveBtn())

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Network down"))
  })

  it("shows generic save error when onSave rejects without message", async () => {
    const onSave = vi.fn().mockRejectedValue("network")
    renderModal({ onSave })
    goToLegalStep()
    fireEvent.click(saveBtn())

    await waitFor(() =>
      expect(screen.getByText(/Could not save|No se pudo guardar/i)).toBeInTheDocument(),
    )
  })

  it("returns to brand step when save is called with invalid brand fields", async () => {
    const mod = await import("@/lib/project-branding")
    const spy = vi.spyOn(mod, "normalizeHex")

    renderModal()
    goToLegalStep("Still named")
    spy.mockImplementation(() => null)
    fireEvent.click(saveBtn())

    await waitFor(() => expect(appNameInput()).toBeInTheDocument())
    spy.mockRestore()
  })

  it("clears name error when app name changes", () => {
    renderModal({
      initialBranding: { ...DEFAULT_PROJECT_BRANDING, appName: "" },
    })
    goToBrandStep()
    fireEvent.click(nextBtn())
    expect(screen.getByText(/Enter an app name\.|Introduce un nombre para la aplicación\./i)).toBeInTheDocument()

    fireEvent.change(appNameInput(), { target: { value: "Fixed" } })
    expect(screen.queryByText(/Enter an app name\.|Introduce un nombre para la aplicación\./i)).toBeNull()
  })

  it("clears disclaimer custom error when mode changes", async () => {
    renderModal()
    goToLegalStep()

    fireEvent.click(screen.getByText(/Custom title and text|Título y texto personalizados/i))
    fireEvent.click(saveBtn())
    await waitFor(() =>
      expect(
        screen.getByText(
          /Enter both a title and body|Introduce título y texto/i,
        ),
      ).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByText(/Use built-in template|Usar plantilla integrada/i))
    expect(
      screen.queryByText(/Enter both a title and body|Introduce título y texto/i),
    ).toBeNull()
  })
})
