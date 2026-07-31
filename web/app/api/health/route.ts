import { NextResponse } from "next/server"
import { applyApiHeaders } from "@/lib/server/api-headers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  return applyApiHeaders(
    NextResponse.json(
      { ok: true, status: "healthy" },
      { status: 200 },
    ),
  )
}
