import {
  getProjectConfig,
  postProjectConfig,
} from "@/lib/server/project-config-handlers"

export const dynamic = "force-dynamic"

export async function GET() {
  return getProjectConfig()
}

export async function POST(request: Request) {
  return postProjectConfig(request)
}
