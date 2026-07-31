import type { ProjectBranding } from "@/lib/project-branding"

export const mockBranding: ProjectBranding = {
  appName: "Test Notes",
  logoDataUrl: null,
  primary: "#111111",
  accent: "#222222",
  background: "#333333",
  disclaimer: { mode: "default" },
}

export function mockBrandingContext(
  overrides: Partial<{
    branding: ProjectBranding
    setupReady: boolean
    setupComplete: boolean
    saveProjectSetup: (b: ProjectBranding) => Promise<void>
    dismissProjectSetup: () => void
  }> = {},
) {
  return {
    branding: mockBranding,
    setupReady: true,
    setupComplete: true,
    saveProjectSetup: async () => {},
    dismissProjectSetup: () => {},
    ...overrides,
  }
}
