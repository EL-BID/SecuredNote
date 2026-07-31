import "server-only"
import { NextResponse } from "next/server"
import { v4 as uuidv4, validate as isUuid } from "uuid"
import bcrypt from "bcrypt"
import {
  clearAttempts,
  deleteNote,
  getAttemptCount,
  getNoteRow,
  insertNote,
  setAttemptCount,
} from "./sqliteStore"
import { applyApiHeaders } from "./api-headers"
import {
  MAX_BYTES_BODY_NOTE_CREATE,
  MAX_BYTES_BODY_NOTE_READ,
  rejectIfContentLengthExceeds,
  requireJsonRequest,
} from "./api-request-guards"

const MAX_TTL = 60 * 60 * 24 * 30
const DEFAULT_TTL = 0
const MAX_BYTES = 16 * 1024
const BCRYPT_ROUNDS = 10
const MAX_PASSWORD_ATTEMPTS = 3
const LOCKOUT_TIME = 60

const isBase64 = (s: unknown) =>
  typeof s === "string" && /^[A-Za-z0-9+/=]+$/.test(s)

function j(data: unknown, status = 200) {
  return applyApiHeaders(NextResponse.json(data, { status }))
}

export function getClientIp(request: Request): string {
  return pickClientIp(
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip")
  )
}

export function pickClientIp(
  xForwardedFor: string | null,
  xRealIp: string | null,
): string {
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim() || "unknown"
  return xRealIp?.trim() || "unknown"
}

export function isOversizedCreatePayload(
  cipherLength: number,
  ivLength: number,
  saltLength: number,
): boolean {
  return cipherLength > MAX_BYTES || ivLength > 256 || saltLength > 512
}

export async function postCreateNote(request: Request) {
  const sizeErr = rejectIfContentLengthExceeds(request, MAX_BYTES_BODY_NOTE_CREATE)
  if (sizeErr) return sizeErr
  const ctErr = requireJsonRequest(request)
  if (ctErr) return ctErr
  try {
    const body = (await request.json()) as Record<string, unknown> | null
    const { cipher, iv, salt, ttl, password } = body ?? {}

    if (!isBase64(cipher) || !isBase64(iv)) {
      return j({ error: "Formato inválido" }, 400)
    }
    if (salt && !isBase64(salt)) {
      return j({ error: "Salt inválido" }, 400)
    }
    const c = cipher as string
    const ivS = iv as string
    const s = typeof salt === "string" ? salt : ""
    if (isOversizedCreatePayload(c.length, ivS.length, s.length)) {
      return j({ error: "Payload demasiado grande" }, 413)
    }

    const ttlNum = Math.min(Number(ttl) || DEFAULT_TTL, MAX_TTL)
    const id = uuidv4()

    let passwordHash: string | null = null
    if (password && typeof password === "string" && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    }

    const note = {
      cipher,
      iv,
      salt: salt ?? null,
      passwordHash,
      createdAt: Date.now(),
    }

    insertNote(id, JSON.stringify(note), ttlNum, note.createdAt)

    return j(
      {
        id,
        ttl: ttlNum,
        hasPassword: !!passwordHash,
      },
      201,
    )
  } catch (err) {
    console.error("Error creando nota:", err)
    return j({ error: "Error interno del servidor" }, 500)
  }
}

export async function getNoteMetadataById(
  _request: Request,
  id: string,
) {
  try {
    if (!isUuid(id)) {
      return j({ error: "ID inválido" }, 400)
    }

    const row = getNoteRow(id)
    if (!row) {
      return j({ error: "Nota no encontrada o ya destruida" }, 404)
    }

    const note = JSON.parse(row.data) as {
      createdAt?: number
      passwordHash?: string | null
    }
    const nowS = Math.floor(Date.now() / 1000)
    let expiresIn: number | null
    if (row.expires_at === null) {
      expiresIn = null
    } else {
      expiresIn = Math.max(0, row.expires_at - nowS)
    }

    return j({
      id,
      hasPassword: !!note.passwordHash,
      expiresIn,
      createdAt: note.createdAt,
    })
  } catch (err) {
    console.error("Error obteniendo metadata:", err)
    return j({ error: "Error interno del servidor" }, 500)
  }
}

export async function postGetNoteById(request: Request, id: string) {
  try {
    if (!isUuid(id)) {
      return j({ error: "ID inválido" }, 400)
    }
    const sizeErr = rejectIfContentLengthExceeds(request, MAX_BYTES_BODY_NOTE_READ)
    if (sizeErr) return sizeErr
    const ctErr = requireJsonRequest(request)
    if (ctErr) return ctErr

    const attemptsKey = `attempts:${id}:${getClientIp(request)}`
    const { count: attemptCount, ttlLeft } = getAttemptCount(attemptsKey)
    if (attemptCount >= MAX_PASSWORD_ATTEMPTS) {
      return j(
        {
          error: "Demasiados intentos",
          retryAfter: ttlLeft > 0 ? ttlLeft : LOCKOUT_TIME,
        },
        429,
      )
    }

    const row = getNoteRow(id)
    if (!row) {
      return j({ error: "Nota no encontrada o ya destruida" }, 404)
    }

    let passwordBody: { password?: unknown } = {}
    try {
      passwordBody = (await request.json()) as { password?: unknown }
    } catch (error_) {
      console.debug("note read body is not valid JSON, treating as empty:", error_)
    }
    const { password } = passwordBody

    const note = JSON.parse(row.data) as {
      passwordHash?: string | null
      cipher: string
      iv: string
      salt: string | null
      createdAt?: number
    }
    const hasTimeBased = row.expires_at !== null

    if (note.passwordHash) {
      if (!password || typeof password !== "string") {
        return j({ error: "Contraseña requerida" }, 401)
      }

      const isValid = await bcrypt.compare(password, note.passwordHash)
      if (!isValid) {
        const currentAttempts = attemptCount + 1
        setAttemptCount(attemptsKey, currentAttempts, LOCKOUT_TIME)

        return j(
          {
            error: "Contraseña incorrecta",
            attemptsRemaining: MAX_PASSWORD_ATTEMPTS - currentAttempts,
          },
          401,
        )
      }

      clearAttempts(attemptsKey)
    }

    if (!hasTimeBased) {
      deleteNote(id)
    }

    return j({
      cipher: note.cipher,
      iv: note.iv,
      salt: note.salt,
    })
  } catch (err) {
    console.error("Error obteniendo nota:", err)
    return j({ error: "Error interno del servidor" }, 500)
  }
}
