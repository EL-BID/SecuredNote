export type DisclaimerLocale = "en" | "es"

export type DisclaimerTranslation = {
  title: string
  body: string
}

export type LocalizedDisclaimerContent = Record<DisclaimerLocale, DisclaimerTranslation>

export type DisclaimerConfig =
  | { mode: "hidden" }
  | { mode: "default" }
  | { mode: "custom"; content: LocalizedDisclaimerContent }

export type ProjectBranding = {
  appName: string
  logoDataUrl: string | null
  primary: string
  accent: string
  background: string
  disclaimer: DisclaimerConfig
}

export const PROJECT_SETUP_DONE_KEY = "secured-note-project-setup-done"
export const PROJECT_BRANDING_KEY = "secured-note-branding"
const MAX_STORED_LOGO_CHARS = 450_000
const MAX_DISCLAIMER_TITLE = 200
const MAX_DISCLAIMER_BODY = 12_000
const MAX_APP_NAME = 200
const DISCLAIMER_LOCALES: DisclaimerLocale[] = ["en", "es"]

const STOCK_PRIMARY = "#004e70"
const STOCK_ACCENT = "#009ade"
const STOCK_BACKGROUND = "#001a28"
const STOCK_APP_NAME = "Secured Note"

function readEnvBrandColor(key: string, fallback: string): string {
  const raw = process.env[key]?.trim()
  if (!raw) return fallback
  let s = raw
  if (!s.startsWith("#")) s = `#${s}`
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase()
  return fallback
}

function readEnvAppName(fallback: string): string {
  const s = process.env.NEXT_PUBLIC_BRAND_APP_NAME?.trim()
  if (!s) return fallback
  return s.slice(0, MAX_APP_NAME)
}

export const DEFAULT_PROJECT_BRANDING: ProjectBranding = {
  appName: readEnvAppName(STOCK_APP_NAME),
  logoDataUrl: null,
  primary: readEnvBrandColor("NEXT_PUBLIC_BRAND_PRIMARY", STOCK_PRIMARY),
  accent: readEnvBrandColor("NEXT_PUBLIC_BRAND_ACCENT", STOCK_ACCENT),
  background: readEnvBrandColor("NEXT_PUBLIC_BRAND_BACKGROUND", STOCK_BACKGROUND),
  disclaimer: { mode: "default" },
}

function sanitizeDisclaimerTranslation(
  raw: unknown
): DisclaimerTranslation | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const title =
    typeof o.title === "string"
      ? o.title.trim().slice(0, MAX_DISCLAIMER_TITLE)
      : ""
  const body =
    typeof o.body === "string"
      ? o.body.trim().slice(0, MAX_DISCLAIMER_BODY)
      : ""
  if (!title || !body) return null
  return { title, body }
}

function duplicateDisclaimerTranslation(
  translation: DisclaimerTranslation
): LocalizedDisclaimerContent {
  return {
    en: { ...translation },
    es: { ...translation },
  }
}

export function parseLocalizedDisclaimerContent(
  raw: unknown
): LocalizedDisclaimerContent | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  const legacy = sanitizeDisclaimerTranslation(o)
  if (legacy) {
    return duplicateDisclaimerTranslation(legacy)
  }

  let contentSource: Record<string, unknown> | null = null
  if (o.content && typeof o.content === "object") {
    contentSource = o.content as Record<string, unknown>
  } else if (o.locales && typeof o.locales === "object") {
    contentSource = o.locales as Record<string, unknown>
  }

  if (!contentSource) return null

  const localized = Object.fromEntries(
    DISCLAIMER_LOCALES.map((locale) => [
      locale,
      sanitizeDisclaimerTranslation(contentSource[locale]),
    ])
  ) as Record<DisclaimerLocale, DisclaimerTranslation | null>

  if (!localized.en || !localized.es) return null

  return {
    en: localized.en,
    es: localized.es,
  }
}

export function parseDisclaimerField(raw: unknown): DisclaimerConfig {
  if (!raw || typeof raw !== "object") {
    return { mode: "default" }
  }
  const o = raw as Record<string, unknown>
  if (o.mode === "hidden") return { mode: "hidden" }
  if (o.mode === "default") return { mode: "default" }
  if (o.mode === "custom") {
    const content = parseLocalizedDisclaimerContent(o)
    if (!content) return { mode: "default" }
    return { mode: "custom", content }
  }
  return { mode: "default" }
}

export function parseBrandingObject(o: unknown): ProjectBranding {
  if (!o || typeof o !== "object") {
    return { ...DEFAULT_PROJECT_BRANDING }
  }
  const b = o as Partial<ProjectBranding> & { disclaimer?: unknown }
  return {
    appName:
      typeof b.appName === "string" && b.appName.trim()
        ? b.appName.trim()
        : DEFAULT_PROJECT_BRANDING.appName,
    logoDataUrl:
      typeof b.logoDataUrl === "string" &&
      b.logoDataUrl.startsWith("data:") &&
      b.logoDataUrl.length <= MAX_STORED_LOGO_CHARS
        ? b.logoDataUrl
        : null,
    primary: normalizeHex(b.primary) ?? DEFAULT_PROJECT_BRANDING.primary,
    accent: normalizeHex(b.accent) ?? DEFAULT_PROJECT_BRANDING.accent,
    background:
      normalizeHex(b.background) ?? DEFAULT_PROJECT_BRANDING.background,
    disclaimer: parseDisclaimerField(b.disclaimer),
  }
}

export function parseStoredBranding(raw: string | null): ProjectBranding {
  if (!raw) return { ...DEFAULT_PROJECT_BRANDING }
  try {
    return parseBrandingObject(JSON.parse(raw) as unknown)
  } catch {
    return { ...DEFAULT_PROJECT_BRANDING }
  }
}

export function parseProjectConfigResponse(data: unknown): ProjectBranding | null {
  if (!data || typeof data !== "object") return null
  const o = data as {
    version?: number
    branding?: unknown
    configured?: boolean
  }
  if (o.configured === true && o.version === 1 && o.branding !== undefined) {
    return parseBrandingObject(o.branding)
  }
  if (o.version === 1 && o.branding !== undefined) {
    return parseBrandingObject(o.branding)
  }
  return null
}

export type ProjectConfigGetResult =
  | { kind: "configured"; branding: ProjectBranding }
  | { kind: "unconfigured" }

export function parseProjectConfigGet(data: unknown): ProjectConfigGetResult | null {
  if (!data || typeof data !== "object") return null
  const o = data as Record<string, unknown>
  if (o.configured === true && o.version === 1 && o.branding != null) {
    return { kind: "configured", branding: parseBrandingObject(o.branding) }
  }
  if (o.configured === false) {
    return { kind: "unconfigured" }
  }
  if (o.version === 1 && o.branding !== undefined && o.configured === undefined) {
    return { kind: "configured", branding: parseBrandingObject(o.branding) }
  }
  return null
}

export function normalizeHex(v: unknown): string | null {
  if (typeof v !== "string") return null
  let s = v.trim()
  if (!s.startsWith("#")) s = `#${s}`
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase()
  return null
}


const MAX_API_APP_NAME = 80

export function parseDisclaimerStrict(raw: unknown): DisclaimerConfig | null {
  if (!raw || typeof raw !== "object") return null
  const d = raw as Record<string, unknown>
  if (d.mode === "hidden") return { mode: "hidden" }
  if (d.mode === "default") return { mode: "default" }
  if (d.mode === "custom") {
    const content = parseLocalizedDisclaimerContent(d)
    if (!content) return null
    return { mode: "custom", content }
  }
  return null
}

export function parseBrandingStrict(body: unknown): ProjectBranding | null {
  if (!body || typeof body !== "object") return null
  const b = body as Record<string, unknown>
  const appName =
    typeof b.appName === "string"
      ? b.appName.trim().slice(0, MAX_API_APP_NAME)
      : ""
  if (!appName) return null
  const primary = normalizeHex(b.primary)
  const accent = normalizeHex(b.accent)
  const background = normalizeHex(b.background)
  if (!primary || !accent || !background) return null
  let logoDataUrl: string | null = null
  if (
    typeof b.logoDataUrl === "string" &&
    b.logoDataUrl.startsWith("data:") &&
    b.logoDataUrl.length <= MAX_STORED_LOGO_CHARS
  ) {
    logoDataUrl = b.logoDataUrl
  }
  const disclaimer = parseDisclaimerStrict(b.disclaimer)
  if (!disclaimer) return null
  return {
    appName,
    logoDataUrl,
    primary,
    accent,
    background,
    disclaimer,
  }
}

export type ProjectConfigPayload = {
  version: 1
  branding: ProjectBranding
}

export function parseProjectConfigPayloadStrict(
  body: unknown,
): ProjectConfigPayload | null {
  if (!body || typeof body !== "object") return null
  const o = body as Record<string, unknown>
  if (o.version !== 1) return null
  const branding = parseBrandingStrict(o.branding)
  if (!branding) return null
  return { version: 1, branding }
}
