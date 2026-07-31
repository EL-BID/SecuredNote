import "server-only"
import { NextResponse } from "next/server"
import {
  getProjectConfigJson,
  insertProjectConfigIfAbsent,
} from "./sqliteStore"
import { applyApiHeaders } from "./api-headers"
import {
  MAX_BYTES_BODY_PROJECT_CONFIG,
  rejectIfContentLengthExceeds,
  requireJsonRequest,
} from "./api-request-guards"
import {
  parseProjectConfigPayloadStrict,
  type ProjectConfigPayload,
} from "@/lib/project-branding"

function j(data: unknown, status = 200) {
  return applyApiHeaders(NextResponse.json(data, { status }))
}

export async function getProjectConfig() {
  try {
    const raw = getProjectConfigJson()
    if (raw) {
      try {
        const data = JSON.parse(raw) as unknown
        const parsed = parseProjectConfigPayloadStrict(data)
        if (!parsed) {
          return j({ error: "Configuración almacenada inválida" }, 500)
        }
        return j({
          configured: true,
          version: parsed.version,
          branding: parsed.branding,
        })
      } catch (error_) {
        console.warn("Stored project_config JSON is corrupt:", error_)
        return j({ error: "Configuración almacenada corrupta" }, 500)
      }
    }

    return j({ configured: false })
  } catch (err) {
    console.warn("project_config read failed:", err)
    return j({ error: "Base de datos no disponible" }, 503)
  }
}

export async function postProjectConfig(request: Request) {
  const sizeErr = rejectIfContentLengthExceeds(request, MAX_BYTES_BODY_PROJECT_CONFIG)
  if (sizeErr) return sizeErr
  const ctErr = requireJsonRequest(request)
  if (ctErr) return ctErr
  let body: unknown
  try {
    body = await request.json()
  } catch (error_) {
    console.debug("project-config POST body is not valid JSON:", error_)
    return j({ error: "Solicitud inválida" }, 400)
  }
  const parsed = parseProjectConfigPayloadStrict(body)
  if (!parsed) {
    return j({ error: "Solicitud inválida" }, 400)
  }

  const json = JSON.stringify(parsed)
  if (json.length > 750_000) {
    return j({ error: "Payload demasiado grande" }, 413)
  }
  try {
    const ins = insertProjectConfigIfAbsent(json)
    if (!ins.ok) {
      let config: ProjectConfigPayload | null = null
      try {
        const data = JSON.parse(ins.existing) as unknown
        config = parseProjectConfigPayloadStrict(data)
      } catch (error_) {
        console.warn("Existing project_config JSON is corrupt:", error_)
        config = null
      }
      return j(
        {
          error: "La instancia ya fue configurada",
          config: config ?? undefined,
        },
        409,
      )
    }
    return j(parsed, 201)
  } catch (err) {
    console.warn("project_config insert failed:", err)
    return j({ error: "Base de datos no disponible" }, 503)
  }
}
