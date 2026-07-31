import { NextResponse } from "next/server"
import { appVersionInfo } from "@/lib/server/version"
import { applyApiHeaders } from "@/lib/server/api-headers"

export const dynamic = "force-dynamic"

export async function GET() {
  return applyApiHeaders(
    NextResponse.json({ ...appVersionInfo, uptime: process.uptime() }),
  )
}
