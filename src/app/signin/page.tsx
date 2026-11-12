import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { emailEnabled, signIn } from "@/auth";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked:
    "That email is already used with a different sign-in method. Sign in the way you did before.",
  AccessDenied: "This account can't sign in to this board.",
  Verification: "That sign-in link has expired or was already used. Request a new one.",
  Configuration: "Sign-in isn't set up correctly on this board. Ask the owner to check its settings.",
};

function safeCallback(url: string | undefined) {
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; check?: string }>;
}) {
  const { callbackUrl, error, check } = await searchParams;
  const redirectTo = safeCallback(callbackUrl);

  if (await getCurrentUser().catch(() => null)) redirect(redirectTo);

  const settings = await getSettings().catch(() => null);
  const discordReady = Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);

  if (check === "email") {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-muted">
          We sent you a sign-in link. It works once and expires in 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold">Sign in to {settings?.gameName ?? "Rallyboard"}</h1>
      <p className="mt-1 text-sm text-muted">Sign in to suggest ideas, vote and comment.</p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
          {ERRORS[error] ?? "Sign-in didn't work. Try again."}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {discordReady ? (
          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo });
            }}
          >
            <button type="submit" className="btn w-full bg-[#5865F2] text-white hover:brightness-110">
              Continue with Discord
            </button>
          </form>
        ) : (
          <p className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-muted">
            Discord sign-in isn&apos;t configured yet. Set AUTH_DISCORD_ID and AUTH_DISCORD_SECRET,
            then redeploy.
          </p>
        )}

        {emailEnabled && (
          <>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
            <form
              className="space-y-3"
              action={async (formData: FormData) => {
                "use server";
                await signIn("nodemailer", {
                  email: String(formData.get("email") ?? ""),
                  redirectTo,
                });
              }}
            >
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="input"
              />
              <button type="submit" className="btn-secondary w-full">
                Email me a sign-in link
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
