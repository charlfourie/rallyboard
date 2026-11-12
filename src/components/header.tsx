import Link from "next/link";
import { signOut } from "@/auth";
import { getCurrentUser, hasRole } from "@/lib/session";
import type { BoardSettings } from "@/lib/settings";
import { Avatar } from "./badges";
import { GameMark } from "./game-mark";
import { NavLinks } from "./nav-links";

export async function Header({ settings }: { settings: BoardSettings | null }) {
  const user = await getCurrentUser().catch(() => null);
  const name = settings?.gameName ?? "Rallyboard";

  return (
    <header className="border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <GameMark name={name} logoUrl={settings?.logoUrl} size={32} />
          <span className="truncate font-semibold">{name}</span>
        </Link>

        <div className="ml-2 hidden sm:block">
          <NavLinks />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {user && hasRole(user.role, "moderator") && (
            <Link href="/admin/inbox" className="btn-ghost px-3 py-1.5">
              Admin
            </Link>
          )}
          {user ? (
            <>
              <span title={user.name ?? undefined}>
                <Avatar name={user.name ?? user.email ?? null} image={user.image ?? null} size={32} />
              </span>
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
            </>
          ) : (
            <Link href="/signin" className="btn-primary px-3 py-1.5">
              Sign in
            </Link>
          )}
        </div>
      </div>
      {/* On phones the page links get their own row. */}
      <div className="border-t border-line px-2 py-1 sm:hidden">
        <NavLinks />
      </div>
    </header>
  );
}
