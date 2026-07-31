import { NextResponse } from "next/server"
import { pingDb } from "@/lib/server/sqliteStore"
import { applyApiHeaders } from "@/lib/server/api-headers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    pingDb()
    return applyApiHeaders(NextResponse.json({ ok: true }))
  } catch {
    return applyApiHeaders(NextResponse.json({ ok: false }, { status: 503 }))
  }
}
