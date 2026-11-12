import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/db/schema";

const rank: Record<Role, number> = { player: 0, moderator: 1, owner: 2 };

export function hasRole(role: Role | undefined, needed: Role) {
  return role !== undefined && rank[role] >= rank[needed];
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** For pages: sends visitors to sign in, and signed-in users without the role home. */
export async function requireRole(needed: Role, callbackUrl = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (!hasRole(user.role, needed)) redirect("/");
  return user;
}

/** For server actions: throws instead of redirecting. */
export async function assertRole(needed: Role) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, needed)) {
    throw new Error("You don't have permission to do that.");
  }
  return user;
}
