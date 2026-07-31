import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GA4_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/i
const IS_PROD = process.env.NODE_ENV === "production"

function getGa4IdForBuild() {
  const raw = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "").trim()
  return GA4_ID_PATTERN.test(raw) ? raw : ""
}

function getHttpsReportingOrigin() {
  const tryUrl = (s) => {
    if (!s?.trim()) return null
    try {
      const u = new URL(s.trim())
      return u.protocol === "https:" ? u.origin : null
    } catch {
      return null
    }
  }
  return (
    tryUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    tryUrl(process.env.CSP_REPORT_BASE) ||
    null
  )
}

function getCspReportingConfig() {
  const origin = getHttpsReportingOrigin()
  if (!origin) return null
  const reportUrl = `${origin}/api/csp-report`
  return {
    reportingEndpointsValue: `csp-endpoint="${reportUrl}"`,
    cspFragment: "; report-to csp-endpoint",
  }
}

function buildContentSecurityPolicy() {
  const connect = new Set(["'self'"])
  if (process.env.NODE_ENV === "development") {
    connect.add("http://localhost:3000")
    connect.add("http://127.0.0.1:3000")
    connect.add("http://localhost:3001")
    connect.add("http://127.0.0.1:3001")
    connect.add("ws://localhost:3000")
    connect.add("ws://127.0.0.1:3000")
  }
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE || "").trim()
  if (apiBase) {
    try {
      connect.add(new URL(apiBase).origin)
    } catch (err) {
      console.warn("Invalid NEXT_PUBLIC_API_BASE, skipping CSP connect-src entry:", err)
    }
  }
  const gaId = getGa4IdForBuild()
  if (gaId) {
    connect.add("https://www.google-analytics.com")
    connect.add("https://analytics.google.com")
    connect.add("https://www.googletagmanager.com")
    connect.add("https://region1.google-analytics.com")
  }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim()
  const httpsSite =
    getHttpsReportingOrigin() !== null || siteUrl.startsWith("https:")

  const scriptParts = ["'self'", "'unsafe-inline'"]
  if (!IS_PROD) {
    scriptParts.push("'unsafe-eval'")
  }
  if (gaId) {
    scriptParts.push(
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
    )
  }
  const scriptSrc = scriptParts.join(" ")

  const imgSrc =
    "'self' data: blob:" +
    (gaId
      ? " https://www.google-analytics.com https://www.googletagmanager.com"
      : "")

  const report = getCspReportingConfig()
  const parts = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' data: blob:",
    "connect-src " + [...connect].join(" "),
    "form-action 'self'",
  ]
  if (httpsSite) {
    parts.push("block-all-mixed-content", "upgrade-insecure-requests")
  }
  return parts.join("; ") + (report ? report.cspFragment : "")
}

function buildStrictTransportSecurityValue() {
  if (!IS_PROD) return null
  const raw = process.env.HSTS_MAX_AGE_SECONDS ?? "31536000"
  const maxAge = Number.parseInt(String(raw), 10)
  if (!Number.isFinite(maxAge) || maxAge <= 0) return null
  const capped = Math.min(Math.max(0, maxAge), 63072000)
  if (capped < 300) return null
  const parts = [`max-age=${capped}`, "includeSubDomains"]
  if (process.env.HSTS_PRELOAD === "true" && capped >= 31536000) {
    parts.push("preload")
  }
  return parts.join("; ")
}

const permissionsPolicy = [
  "accelerometer=()",
  "ambient-light-sensor=()",
  "autoplay=()",
  "battery=()",
  "bluetooth=()",
  "camera=()",
  "display-capture=()",
  "document-domain=()",
  "encrypted-media=()",
  "gamepad=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "publickey-credentials-get=()",
  "screen-wake-lock=()",
  "usb=()",
  "web-share=()",
  "xr-spatial-tracking=()",
  "interest-cohort=()",
].join(", ")

const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false,
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    const hsts = buildStrictTransportSecurityValue()
    const report = getCspReportingConfig()
    const securityHeaders = [
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      { key: "X-Download-Options", value: "noopen" },
      { key: "X-XSS-Protection", value: "0" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: permissionsPolicy },
      { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
    ]
    if (report) {
      securityHeaders.push({
        key: "Reporting-Endpoints",
        value: report.reportingEndpointsValue,
      })
    }
    if (hsts) {
      securityHeaders.splice(1, 0, {
        key: "Strict-Transport-Security",
        value: hsts,
      })
    }
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },

  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "bcrypt", "pino"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
}

export default nextConfig
