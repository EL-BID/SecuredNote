import { postGetNoteById } from "@/lib/server/notes-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  return postGetNoteById(request, id)
}
