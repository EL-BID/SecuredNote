import { afterEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_PROJECT_BRANDING } from "@/lib/project-branding"

function findElementByProp(node: unknown, propName: string): { props: Record<string, unknown> } | null {
  if (!node || typeof node !== "object") return null
  const element = node as { props?: Record<string, unknown> }
  if (element.props && propName in element.props) return element as { props: Record<string, unknown> }

  const children = element.props?.children
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findElementByProp(child, propName)
      if (found) return found
    }
  } else if (children) {
    return findElementByProp(children, propName)
  }

  return null
}

describe("ProjectSetupModal internal branches", () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock("react")
  })

  it("only initializes on the first open transition", async () => {
    const { shouldInitializeProjectSetup } = await import("./project-setup-modal")

    expect(shouldInitializeProjectSetup(true, false)).toBe(true)
    expect(shouldInitializeProjectSetup(true, true)).toBe(false)
    expect(shouldInitializeProjectSetup(false, false)).toBe(false)
  })

  it("returns early when already initialized during an open cycle", async () => {
    const setStep = vi.fn()
    const setAppName = vi.fn()

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react")
      const states: unknown[] = [
        [0, setStep],
        ["Secured Note", setAppName],
        [null, vi.fn()],
        ["#004e70", vi.fn()],
        ["#009ade", vi.fn()],
        ["#001a28", vi.fn()],
        [null, vi.fn()],
        [false, vi.fn()],
        ["default", vi.fn()],
        [{ en: { title: "", body: "" }, es: { title: "", body: "" } }, vi.fn()],
        [false, vi.fn()],
        [false, vi.fn()],
        [null, vi.fn()],
      ]

      return {
        ...actual,
        useRef: vi.fn(() => ({ current: true })),
        useState: vi.fn(() => states.shift()),
        useEffect: vi.fn((cb: () => void) => cb()),
        useCallback: vi.fn((fn: unknown) => fn),
      }
    })
    vi.doMock("@/lib/locale-provider", () => ({
      useLocale: () => ({
        locale: "en",
        setLocale: vi.fn(),
        t: (key: string) => key,
      }),
    }))

    const { ProjectSetupModal } = await import("./project-setup-modal")
    ProjectSetupModal({
      open: true,
      initialBranding: DEFAULT_PROJECT_BRANDING,
      onSave: vi.fn(),
      onDismiss: vi.fn(),
    })

    expect(setStep).not.toHaveBeenCalled()
    expect(setAppName).not.toHaveBeenCalled()
  })

  it("marks the name as invalid when save runs with a blank app name", async () => {
    const setStep = vi.fn()
    const setNameError = vi.fn()

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react")
      const states: unknown[] = [
        [2, setStep],
        ["", vi.fn()],
        [null, vi.fn()],
        ["#004e70", vi.fn()],
        ["#009ade", vi.fn()],
        ["#001a28", vi.fn()],
        [null, vi.fn()],
        [false, setNameError],
        ["default", vi.fn()],
        [{ en: { title: "", body: "" }, es: { title: "", body: "" } }, vi.fn()],
        [false, vi.fn()],
        [false, vi.fn()],
        [null, vi.fn()],
      ]

      return {
        ...actual,
        useRef: vi.fn(() => ({ current: false })),
        useState: vi.fn(() => states.shift()),
        useEffect: vi.fn(),
        useCallback: vi.fn((fn: unknown) => fn),
      }
    })
    vi.doMock("@/lib/locale-provider", () => ({
      useLocale: () => ({
        locale: "en",
        setLocale: vi.fn(),
        t: (key: string) => key,
      }),
    }))

    const { ProjectSetupModal } = await import("./project-setup-modal")
    const tree = ProjectSetupModal({
      open: true,
      initialBranding: DEFAULT_PROJECT_BRANDING,
      onSave: vi.fn(),
      onDismiss: vi.fn(),
    })

    const footer = findElementByProp(tree, "onSave")
    expect(footer).not.toBeNull()
    await (footer!.props.onSave as () => Promise<void>)()

    expect(setNameError).toHaveBeenCalledWith(true)
    expect(setStep).toHaveBeenCalledWith(1)
  })
})
