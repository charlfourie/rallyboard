import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/session";
import { DEFAULT_ACCENT, getSettings } from "@/lib/settings";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up your board" };

export default async function SetupPage() {
  if (await getSettings()) redirect("/");
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-sm font-medium text-accent">Welcome to Rallyboard</p>
        <h1 className="mt-1 text-2xl font-bold">Set up your feedback board</h1>
      </div>

      {!user && (
        <div className="card space-y-4 p-6">
          <p className="text-sm text-muted">
            Sign in to claim this board. Unless an owner is configured, the first person to sign in
            becomes the owner, so do this straight after deploying.
          </p>
          <Link href="/signin?callbackUrl=/setup" className="btn-primary">
            Sign in to continue
          </Link>
        </div>
      )}

      {user && !hasRole(user.role, "owner") && (
        <div className="card p-6 text-sm text-muted">
          You&apos;re signed in, but this board&apos;s owner hasn&apos;t finished setting it up yet.
          Check back soon.
        </div>
      )}

      {user && hasRole(user.role, "owner") && <SetupForm defaultAccent={DEFAULT_ACCENT} />}
    </div>
  );
}
