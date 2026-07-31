import { NextResponse } from "next/server"
import { applyApiHeaders } from "@/lib/server/api-headers"
import { MAX_BYTES_CSP_REPORT, rejectIfContentLengthExceeds } from "@/lib/server/api-request-guards"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const sizeErr = rejectIfContentLengthExceeds(request, MAX_BYTES_CSP_REPORT)
  if (sizeErr) return sizeErr
  await request.text().catch((err) => {
    console.debug("csp-report body read failed:", err)
    return ""
  })
  return applyApiHeaders(new NextResponse(null, { status: 204 }))
}
