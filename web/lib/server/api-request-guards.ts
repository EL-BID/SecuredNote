import "server-only"
import { NextResponse } from "next/server"
import { applyApiHeaders } from "./api-headers"

export const MAX_BYTES_BODY_NOTE_CREATE = 256 * 1024
export const MAX_BYTES_BODY_NOTE_READ = 32 * 1024
export const MAX_BYTES_BODY_PROJECT_CONFIG = 1_000_000
export const MAX_BYTES_CSP_REPORT = 256 * 1024

function isJsonOrJsonSuffixContentType(contentType: string | null): boolean {
  if (!contentType) return false
  const base = contentType.split(";")[0].trim()
  if (/^application\/json$/i.test(base) || /^text\/json$/i.test(base)) return true
  if (/^application\/.+\+json$/i.test(base)) return true
  return false
}

/**
 * Cuerpos JSON (POST) deben anunciar `application/json` o un subtipo `application/…+json`.
 * Evita que proxies o clientes poco estrictos usen el parser JSON sin intención clara.
 */
export function requireJsonRequest(request: Request) {
  if (request.method !== "POST" && request.method !== "PUT" && request.method !== "PATCH") {
    return null
  }
  if (!isJsonOrJsonSuffixContentType(request.headers.get("content-type"))) {
    return applyApiHeaders(
      NextResponse.json({ error: "Se requiere Content-Type: application/json" }, { status: 415 }),
    )
  }
  return null
}

/**
 * Tamaño declarado por Content-Length (mitiga carga de cuerpos enormes y DoS aproximado).
 * Si no hay encabezado (p. ej. chunked), no se limita por aquí.
 */
export function rejectIfContentLengthExceeds(request: Request, maxBytes: number) {
  const cl = request.headers.get("content-length")
  if (!cl) return null
  const n = Number.parseInt(cl, 10)
  if (!Number.isFinite(n) || n < 0) return null
  if (n > maxBytes) {
    return applyApiHeaders(
      NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 }),
    )
  }
  return null
}

