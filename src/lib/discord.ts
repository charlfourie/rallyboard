// Discord plumbing: request verification, REST calls, player accounts and announcements.
import { createPublicKey, verify } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, ideas, releases, settings, statusEvents, users, type IdeaStatus } from "@/db/schema";
import { statusInfo } from "@/lib/status";

const API = process.env.DISCORD_API_BASE ?? "https://discord.com/api/v10";

export const discordConfig = () => ({
  appId: process.env.AUTH_DISCORD_ID ?? "",
  publicKey: process.env.DISCORD_PUBLIC_KEY ?? "",
  botToken: process.env.DISCORD_BOT_TOKEN ?? "",
});

/* ------------------------------------------------------------------ */
/* Verifying that requests come from Discord (Ed25519)                */
/* ------------------------------------------------------------------ */

// DER header that turns a raw 32-byte Ed25519 key into SPKI form for Node's crypto.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyDiscordSignature(body: string, signature: string | null, timestamp: string | null) {
  const { publicKey } = discordConfig();
  if (!publicKey || !signature || !timestamp) return false;
  // Refuse replays of old requests (Discord sends a fresh timestamp each time).
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKey, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(null, Buffer.from(timestamp + body), key, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* REST API                                                            */
/* ------------------------------------------------------------------ */

export class DiscordApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function discordApi<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const { botToken } = discordConfig();
  if (!botToken) throw new DiscordApiError(0, "DISCORD_BOT_TOKEN isn't set.");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Rallyboard (https://github.com/charlfourie/rallyboard, 1.0)",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new DiscordApiError(res.status, `Discord returned ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** The public address of the board, used in links sent to Discord. */
export async function boardUrl() {
  const [row] = await db.select({ customDomain: settings.customDomain }).from(settings).where(eq(settings.id, 1));
  if (row?.customDomain) return `https://${row.customDomain}`;
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export const accentInt = (hex: string | null | undefined) => Number.parseInt((hex ?? "#7c5cff").slice(1), 16) || 0x7c5cff;

/* ------------------------------------------------------------------ */
/* Players who use Discord before ever opening the website            */
/* ------------------------------------------------------------------ */

type DiscordUser = { id: string; username: string; global_name?: string | null; avatar?: string | null };

/**
 * Finds the board account for a Discord user, creating one if needed. A linked
 * Discord account row is created too, so signing in on the website later
 * lands in the same account instead of a duplicate.
 */
export async function userForDiscord(du: DiscordUser) {
  const [linked] = await db
    .select({ id: users.id, role: users.role, banned: users.banned })
    .from(accounts)
    .innerJoin(users, eq(accounts.userId, users.id))
    .where(and(eq(accounts.provider, "discord"), eq(accounts.providerAccountId, du.id)));
  if (linked) return linked;

  const [byDiscordId] = await db
    .select({ id: users.id, role: users.role, banned: users.banned })
    .from(users)
    .where(eq(users.discordId, du.id));
  if (byDiscordId) return byDiscordId;

  const image = du.avatar
    ? `https://cdn.discordapp.com/avatars/${du.id}/${du.avatar}.${du.avatar.startsWith("a_") ? "gif" : "png"}`
    : null;

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({ name: du.global_name ?? du.username, image, discordId: du.id })
      .onConflictDoNothing()
      .returning({ id: users.id, role: users.role, banned: users.banned });
    const user =
      created ??
      (await tx.select({ id: users.id, role: users.role, banned: users.banned }).from(users).where(eq(users.discordId, du.id)))[0];
    await tx
      .insert(accounts)
      .values({ userId: user.id, type: "oauth", provider: "discord", providerAccountId: du.id })
      .onConflictDoNothing();
    return user;
  });
}

/* ------------------------------------------------------------------ */
/* Status announcements                                               */
/* ------------------------------------------------------------------ */

const ANNOUNCED: IdeaStatus[] = ["planned", "in_progress", "shipped"];
const HEADLINES: Partial<Record<IdeaStatus, string>> = {
  planned: "📋 Now planned",
  in_progress: "🛠️ Now in progress",
  shipped: "🚀 Shipped",
};

/**
 * Posts recent status changes to the announcement channel. Safe to call often:
 * each change is announced once, and failures are retried on the next call.
 */
export async function announcePendingStatusChanges() {
  const [config] = await db
    .select({ channelId: settings.discordChannelId, accent: settings.accentColor, gameName: settings.gameName })
    .from(settings)
    .where(eq(settings.id, 1));
  if (!config?.channelId || !discordConfig().botToken) return { sent: 0 };

  const pending = await db
    .select({
      eventId: statusEvents.id,
      toStatus: statusEvents.toStatus,
      ideaId: ideas.id,
      title: ideas.title,
      status: ideas.status,
      voteCount: ideas.voteCount,
      hidden: ideas.hidden,
      categoryName: categories.name,
      releaseVersion: releases.version,
    })
    .from(statusEvents)
    .innerJoin(ideas, eq(statusEvents.ideaId, ideas.id))
    .leftJoin(categories, eq(ideas.categoryId, categories.id))
    .leftJoin(releases, eq(ideas.releaseId, releases.id))
    // Only unannounced changes from the last day, so connecting Discord later
    // doesn't flood the channel with old history.
    .where(and(isNull(statusEvents.announcedAt), gt(statusEvents.createdAt, new Date(Date.now() - 24 * 3600_000))))
    .orderBy(statusEvents.createdAt)
    .limit(10);

  const base = await boardUrl();
  let sent = 0;
  for (const event of pending) {
    // Skip changes that were reversed, hidden, or aren't worth announcing.
    const worthIt = ANNOUNCED.includes(event.toStatus) && event.status === event.toStatus && !event.hidden;
    if (worthIt) {
      const headline =
        event.toStatus === "shipped" && event.releaseVersion
          ? `🚀 Shipped in ${event.releaseVersion}`
          : HEADLINES[event.toStatus];
      try {
        await discordApi(`/channels/${config.channelId}/messages`, {
          method: "POST",
          body: JSON.stringify({
            embeds: [
              {
                author: { name: headline },
                title: event.title.slice(0, 256),
                url: `${base}/ideas/${event.ideaId}`,
                color: accentInt(statusInfo(event.toStatus).color),
                fields: [
                  { name: "Votes", value: String(event.voteCount), inline: true },
                  ...(event.categoryName ? [{ name: "Category", value: event.categoryName, inline: true }] : []),
                ],
                footer: { text: `${config.gameName} feedback` },
              },
            ],
            allowed_mentions: { parse: [] },
          }),
        });
        sent++;
      } catch (error) {
        console.error("Discord announcement failed:", error);
        break; // leave the rest for the next attempt
      }
    }
    await db.update(statusEvents).set({ announcedAt: new Date() }).where(eq(statusEvents.id, event.eventId));
  }
  return { sent };
}
