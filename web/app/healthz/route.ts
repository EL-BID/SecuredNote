import { NextResponse } from "next/server"
import { applyApiHeaders } from "@/lib/server/api-headers"

export const dynamic = "force-dynamic"

export async function GET() {
  return applyApiHeaders(NextResponse.json({ ok: true }))
}
