import NextAuth, { type NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, sessions, users, verificationTokens, type Role } from "@/db/schema";

declare module "next-auth" {
  interface User {
    role?: Role;
    banned?: boolean;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
    };
  }
}

export const emailEnabled = Boolean(process.env.EMAIL_SERVER);

/**
 * Makes a user the board owner if no owner exists yet and they qualify:
 * - when OWNER_EMAIL or OWNER_DISCORD_ID is set, only a matching user qualifies;
 * - otherwise the first user to sign in becomes the owner.
 */
async function maybeClaimOwner(userId: string) {
  const db = getDb();
  const [{ owners }] = await db
    .select({ owners: count() })
    .from(users)
    .where(eq(users.role, "owner"));
  if (owners > 0) return;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return;

  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const ownerDiscordId = process.env.OWNER_DISCORD_ID?.trim();

  let qualifies: boolean;
  if (ownerEmail || ownerDiscordId) {
    qualifies =
      (!!ownerEmail && user.email?.toLowerCase() === ownerEmail) ||
      (!!ownerDiscordId && user.discordId === ownerDiscordId);
  } else {
    const [{ total }] = await db.select({ total: count() }).from(users);
    qualifies = total === 1;
  }

  if (qualifies) {
    await db
      .update(users)
      .set({ role: "owner" })
      .where(and(eq(users.id, userId), eq(users.role, "player")));
  }
}

function buildConfig(): NextAuthConfig {
  const db = getDb();

  // Discord adds an `iss` parameter to OAuth redirects (RFC 9207). Auth.js
  // checks it against the provider's issuer, so declare Discord's own.
  const providers: NextAuthConfig["providers"] = [Discord({ issuer: "https://discord.com" })];
  if (emailEnabled) {
    providers.push(
      Nodemailer({
        server: process.env.EMAIL_SERVER,
        from: process.env.EMAIL_FROM ?? "Rallyboard <noreply@example.com>",
      }),
    );
  }

  return {
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    providers,
    session: { strategy: "database" },
    trustHost: true,
    pages: {
      signIn: "/signin",
      verifyRequest: "/signin?check=email",
      error: "/signin",
    },
    callbacks: {
      async signIn({ user }) {
        // Banned players can't sign in again.
        return !user.banned;
      },
      async session({ session, user }) {
        session.user.id = user.id;
        session.user.role = user.role ?? "player";
        return session;
      },
    },
    events: {
      async createUser({ user }) {
        if (user.id) await maybeClaimOwner(user.id);
      },
      async linkAccount({ user, account }) {
        if (account.provider === "discord" && user.id) {
          await db
            .update(users)
            .set({ discordId: account.providerAccountId })
            .where(eq(users.id, user.id));
          await maybeClaimOwner(user.id);
        }
      },
    },
  };
}

// The config is built per request so the database connection is only
// created at runtime, never during `next build`.
export const { handlers, auth, signIn, signOut } = NextAuth(() => buildConfig());
