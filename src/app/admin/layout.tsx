import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { hasRole, requireRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("moderator", "/admin/inbox");
  if (!(await getSettings())) redirect("/setup");

  return (
    <div className="grid gap-8 md:grid-cols-[180px_minmax(0,1fr)]">
      <AdminNav isOwner={hasRole(user.role, "owner")} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
