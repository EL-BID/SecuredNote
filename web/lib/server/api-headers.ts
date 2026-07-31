import "server-only"
import type { NextResponse } from "next/server"

const API_JSON_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "Cache-Control": "no-store, no-cache, must-revalidate, private, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Download-Options": "noopen",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Referrer-Policy": "no-referrer",
}

export function applyApiHeaders(res: NextResponse) {
  for (const [k, v] of Object.entries(API_JSON_HEADERS)) {
    res.headers.set(k, v)
  }
  return res
}
