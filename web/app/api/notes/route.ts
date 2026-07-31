import { postCreateNote } from "@/lib/server/notes-handlers"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  return postCreateNote(request)
}
