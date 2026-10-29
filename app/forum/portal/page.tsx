import type { Metadata } from "next"
import ForumPortalAdmin from "@/components/ForumPortalAdmin"

export const metadata: Metadata = {
  title: "포럼 관리자",
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "포럼 관리",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export default function ForumPortalPage() {
  return <ForumPortalAdmin />
}
