"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { comments, ideas, releases, statusEvents, users, votes, type Role } from "@/db/schema";
import { announcePendingStatusChanges } from "@/lib/discord";
import { errorMessage, type FormState } from "@/lib/form";
import { assertRole } from "@/lib/session";
import { STATUSES } from "@/lib/status";

const uuid = z.uuid();
const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

function refresh(ideaId?: string) {
  revalidatePath("/", "layout");
  if (ideaId) revalidatePath(`/ideas/${ideaId}`);
}

/* ------------------------------------------------------------------ */
/* Status and release                                                 */
/* ------------------------------------------------------------------ */

const statusValues = STATUSES.map((s) => s.value) as [string, ...string[]];

/** Sets an idea's status (recorded in its history) and, for shipped ideas, the release. */
export async function updateIdeaStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  let ideaId = "";
  try {
    const moderator = await assertRole("moderator");
    ideaId = uuid.parse(field(formData, "ideaId"));
    const status = z.enum(statusValues).parse(field(formData, "status")) as (typeof STATUSES)[number]["value"];
    const releaseRaw = field(formData, "releaseId");
    const releaseId = status === "shipped" && releaseRaw ? uuid.parse(releaseRaw) : null;

    await db.transaction(async (tx) => {
      const [idea] = await tx
        .select({ status: ideas.status, releaseId: ideas.releaseId })
        .from(ideas)
        .where(eq(ideas.id, ideaId))
        .for("update");
      if (!idea) throw new Error("That idea no longer exists.");
      if (idea.status === status && idea.releaseId === releaseId) return;

      await tx.update(ideas).set({ status, releaseId, updatedAt: new Date() }).where(eq(ideas.id, ideaId));
      if (idea.status !== status) {
        await tx.insert(statusEvents).values({
          ideaId,
          fromStatus: idea.status,
          toStatus: status,
          changedBy: moderator.id,
        });
      }
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh(ideaId);
  // Tell the Discord announcement channel, after the response is sent.
  after(() => announcePendingStatusChanges().catch((error) => console.error("Announcement failed:", error)));
  return { success: "Saved" };
}

/* ------------------------------------------------------------------ */
/* Hide, lock, merge                                                  */
/* ------------------------------------------------------------------ */

export async function setIdeaFlag(formData: FormData): Promise<void> {
  await assertRole("moderator");
  const ideaId = uuid.parse(field(formData, "ideaId"));
  const flag = z.enum(["hidden", "locked"]).parse(field(formData, "flag"));
  const value = field(formData, "value") === "true";
  await db
    .update(ideas)
    .set(flag === "hidden" ? { hidden: value, updatedAt: new Date() } : { locked: value, updatedAt: new Date() })
    .where(eq(ideas.id, ideaId));
  refresh(ideaId);
}

/**
 * Merges a duplicate into another idea. Voters of the duplicate are added to the
 * target (no one is counted twice), comments move across, and the duplicate's page
 * redirects to the target from then on.
 */
export async function mergeIdea(_prev: FormState, formData: FormData): Promise<FormState> {
  let targetId = "";
  try {
    await assertRole("moderator");
    const sourceId = uuid.parse(field(formData, "ideaId"));
    targetId = uuid.parse(field(formData, "targetId"));
    if (sourceId === targetId) return { error: "Pick a different idea to merge into." };

    await db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: ideas.id, mergedIntoId: ideas.mergedIntoId })
        .from(ideas)
        .where(sql`${ideas.id} in (${sourceId}, ${targetId})`)
        .for("update");
      const source = rows.find((r) => r.id === sourceId);
      const target = rows.find((r) => r.id === targetId);
      if (!source || !target) throw new Error("One of those ideas no longer exists.");
      if (source.mergedIntoId) throw new Error("This idea was already merged.");
      if (target.mergedIntoId) throw new Error("That idea was itself merged; pick the idea it was merged into.");

      await tx.execute(sql`
        insert into ${votes} (idea_id, user_id, created_at)
        select ${targetId}, user_id, created_at from ${votes} where idea_id = ${sourceId}
        on conflict do nothing`);
      await tx.delete(votes).where(eq(votes.ideaId, sourceId));
      await tx.update(comments).set({ ideaId: targetId }).where(eq(comments.ideaId, sourceId));
      // Anything already merged into the duplicate now points at the target too.
      await tx.update(ideas).set({ mergedIntoId: targetId }).where(eq(ideas.mergedIntoId, sourceId));

      await tx
        .update(ideas)
        .set({ mergedIntoId: targetId, voteCount: 0, commentCount: 0, updatedAt: new Date() })
        .where(eq(ideas.id, sourceId));
      await tx
        .update(ideas)
        .set({
          voteCount: sql`(select count(*) from ${votes} where ${votes.ideaId} = ${targetId})`,
          commentCount: sql`(select count(*) from ${comments} where ${comments.ideaId} = ${targetId})`,
          updatedAt: new Date(),
        })
        .where(eq(ideas.id, targetId));
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh(targetId);
  return { success: "Merged" };
}

/* ------------------------------------------------------------------ */
/* Players and team                                                   */
/* ------------------------------------------------------------------ */

/** Bans or unbans a player. Moderators and the owner can't be banned. */
export async function setBanned(formData: FormData): Promise<void> {
  await assertRole("moderator");
  const userId = z.string().min(1).parse(field(formData, "userId"));
  const banned = field(formData, "value") === "true";
  await db.transaction(async (tx) => {
    const [user] = await tx.select({ role: users.role }).from(users).where(eq(users.id, userId));
    if (!user || user.role !== "player") throw new Error("Only players can be banned.");
    await tx.update(users).set({ banned }).where(eq(users.id, userId));
    // Signing a banned player out right away.
    if (banned) await tx.execute(sql`delete from sessions where user_id = ${userId}`);
  });
  revalidatePath("/", "layout");
}

/** Owner only: makes a player a moderator, or a moderator a player again. */
export async function setRole(formData: FormData): Promise<void> {
  const owner = await assertRole("owner");
  const userId = z.string().min(1).parse(field(formData, "userId"));
  const role = z.enum(["player", "moderator"]).parse(field(formData, "role")) as Role;
  if (userId === owner.id) throw new Error("You can't change your own role.");
  await db
    .update(users)
    .set({ role, banned: false })
    .where(and(eq(users.id, userId), ne(users.role, "owner")));
  revalidatePath("/admin/team");
}

/* ------------------------------------------------------------------ */
/* Releases                                                           */
/* ------------------------------------------------------------------ */

const releaseFields = z.object({
  version: z.string().trim().min(1, "Enter a version, like v0.5.").max(30, "Keep versions under 30 characters."),
  title: z.string().trim().max(80, "Keep titles under 80 characters.").transform((v) => v || null),
  releasedAt: z
    .string()
    .trim()
    .transform((v) => (v ? new Date(`${v}T12:00:00Z`) : null))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), "Enter a valid date."),
});

export async function createRelease(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertRole("moderator");
    const parsed = releaseFields.safeParse({
      version: field(formData, "version"),
      title: field(formData, "title"),
      releasedAt: field(formData, "releasedAt"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const inserted = await db.insert(releases).values(parsed.data).onConflictDoNothing().returning({ id: releases.id });
    if (inserted.length === 0) return { error: `${parsed.data.version} already exists.` };
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/", "layout");
  return { success: "Release added" };
}

export async function updateRelease(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertRole("moderator");
    const id = uuid.parse(field(formData, "id"));
    const parsed = releaseFields.safeParse({
      version: field(formData, "version"),
      title: field(formData, "title"),
      releasedAt: field(formData, "releasedAt"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const [clash] = await db
      .select({ id: releases.id })
      .from(releases)
      .where(and(eq(releases.version, parsed.data.version), ne(releases.id, id)));
    if (clash) return { error: `${parsed.data.version} already exists.` };
    await db.update(releases).set(parsed.data).where(eq(releases.id, id));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/", "layout");
  return { success: "Saved" };
}

/** Deletes a release; its ideas stay shipped but lose the version. */
export async function deleteRelease(formData: FormData): Promise<void> {
  await assertRole("moderator");
  const id = uuid.parse(field(formData, "id"));
  await db.delete(releases).where(eq(releases.id, id));
  revalidatePath("/", "layout");
}
