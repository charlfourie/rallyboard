import Link from "next/link";
import { signOut } from "@/auth";
import { getCurrentUser, hasRole } from "@/lib/session";
import type { BoardSettings } from "@/lib/settings";
import { GameMark } from "./game-mark";

export async function Header({ settings }: { settings: BoardSettings | null }) {
  const user = await getCurrentUser().catch(() => null);

  return (
    <header className="border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <GameMark name={settings?.gameName ?? "Rallyboard"} logoUrl={settings?.logoUrl} size={32} />
          <span className="truncate font-semibold">{settings?.gameName ?? "Rallyboard"}</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 text-sm sm:flex">
          <Link href="/" className="btn-ghost px-3 py-1.5">
            Board
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user && hasRole(user.role, "owner") && (
            <Link href="/admin/settings" className="btn-ghost px-3 py-1.5">
              Admin
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs">
                  {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="btn-ghost px-3 py-1.5" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link href="/signin" className="btn-primary px-3 py-1.5">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
