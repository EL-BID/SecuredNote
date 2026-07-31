import type { CSSProperties } from "react"
import type { ProjectBranding } from "@/lib/project-branding"

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.replace(/^#/, "")
  if (!/^[0-9a-f]{6}$/i.test(s)) return null
  const n = Number.parseInt(s, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${[c(r), c(g), c(b)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`
}

function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  if (!A || !B) return a
  return rgbToHex(
    A.r + (B.r - A.r) * t,
    A.g + (B.g - A.g) * t,
    A.b + (B.b - A.b) * t
  )
}

function luminance(hex: string): number {
  const o = hexToRgb(hex)
  if (!o) return 0
  const lin = (c: number) => {
    const x = c / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  const r = lin(o.r)
  const g = lin(o.g)
  const b = lin(o.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function getBrandingCssVariables(b: ProjectBranding): Record<string, string> {
  const { primary, accent, background } = b
  const lum = luminance(background)
  const isDarkBg = lum < 0.35
  const fg = isDarkBg ? "#f0f9ff" : "#0a0a0a"
  const fgMuted = isDarkBg ? mix(fg, accent, 0.35) : mix(fg, primary, 0.45)
  const card = mix(background, isDarkBg ? "#ffffff" : "#000000", isDarkBg ? 0.14 : 0.08)
  const muted = mix(background, primary, 0.45)
  const input = mix(background, primary, 0.38)
  const popover = card

  return {
    "--background": background,
    "--foreground": fg,
    "--card": card,
    "--card-foreground": fg,
    "--popover": popover,
    "--popover-foreground": fg,
    "--primary": primary,
    "--primary-foreground": "#ffffff",
    "--secondary": accent,
    "--secondary-foreground": "#ffffff",
    "--muted": muted,
    "--muted-foreground": fgMuted,
    "--accent": accent,
    "--accent-foreground": "#ffffff",
    "--destructive": "#da3232",
    "--destructive-foreground": "#ffffff",
    "--border": primary,
    "--input": input,
    "--ring": accent,
    "--chart-1": accent,
    "--chart-2": primary,
    "--chart-3": "#308144",
    "--chart-4": "#ffda00",
    "--chart-5": "#8dba38",
    "--sidebar": card,
    "--sidebar-foreground": fg,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": "#ffffff",
    "--sidebar-accent": muted,
    "--sidebar-accent-foreground": fg,
    "--sidebar-border": primary,
    "--sidebar-ring": accent,
  }
}

export function brandingCssVariablesToInlineStyle(
  vars: Record<string, string>
): CSSProperties {
  const style: Record<string, string> = {}
  for (const [k, v] of Object.entries(vars)) {
    style[k] = v
  }
  return style as CSSProperties
}

export function applyBrandingTheme(b: ProjectBranding): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const vars = getBrandingCssVariables(b)
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v)
  }
}

const dummyBranding: ProjectBranding = {
  appName: "",
  logoDataUrl: null,
  primary: "#000000",
  accent: "#000000",
  background: "#000000",
  disclaimer: { mode: "default" },
}

export function clearBrandingThemeOverrides(): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  for (const k of Object.keys(getBrandingCssVariables(dummyBranding))) {
    root.style.removeProperty(k)
  }
}
