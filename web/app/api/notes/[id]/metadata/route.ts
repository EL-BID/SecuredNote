import { getNoteMetadataById } from "@/lib/server/notes-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  return getNoteMetadataById(_request, id)
}
