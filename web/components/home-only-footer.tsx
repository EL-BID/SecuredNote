"use client"

import { usePathname } from "next/navigation"
import { SiteFooter } from "@/components/site-footer"

type Props = Readonly<{
  githubRepoUrl: string | null
}>

export function HomeOnlyFooter({ githubRepoUrl }: Props) {
  const pathname = usePathname()
  if (pathname !== "/") return null
  return <SiteFooter githubRepoUrl={githubRepoUrl} />
}
