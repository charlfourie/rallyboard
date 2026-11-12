// Core rules for posting ideas and voting, shared by the website and Discord.
import { and, count, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, ideas, users, votes, type Role } from "@/db/schema";
import { hasRole } from "@/lib/session";

const IDEAS_PER_HOUR = 5;

export class UserFacingError extends Error {}

export type Actor = { id: string; role: Role; banned: boolean };

/** Loads a user and refuses banned ones. */
export async function loadActor(userId: string): Promise<Actor> {
  const [user] = await db
    .select({ id: users.id, role: users.role, banned: users.banned })
    .from(users)
    .where(eq(users.id, userId));
  if (!user || user.banned) throw new UserFacingError("Your account can't post on this board.");
  return user;
}

export const ideaInput = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Give your idea a title of at least 5 characters.")
    .max(120, "Keep the title under 120 characters."),
  body: z.string().trim().max(5000, "Keep the description under 5,000 characters."),
  categoryId: z.union([z.uuid(), z.literal("")]),
});

/** Validates and posts an idea; the author's vote counts from the start. Returns its id. */
export async function postIdea(actor: Actor, raw: { title: string; body: string; categoryId: string }) {
  const parsed = ideaInput.safeParse(raw);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0].message);
  const { title, body, categoryId } = parsed.data;

  if (!hasRole(actor.role, "moderator")) {
    const [{ recent }] = await db
      .select({ recent: count() })
      .from(ideas)
      .where(and(eq(ideas.authorId, actor.id), gt(ideas.createdAt, new Date(Date.now() - 3600_000))));
    if (recent >= IDEAS_PER_HOUR) {
      throw new UserFacingError("You've posted a lot of ideas in the last hour. Try again a little later.");
    }
  }

  if (categoryId) {
    const [exists] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId));
    if (!exists) throw new UserFacingError("That category no longer exists. Pick another.");
  }

  return db.transaction(async (tx) => {
    const [idea] = await tx
      .insert(ideas)
      .values({ title, body, categoryId: categoryId || null, authorId: actor.id, voteCount: 1 })
      .returning({ id: ideas.id });
    await tx.insert(votes).values({ ideaId: idea.id, userId: actor.id });
    return idea.id;
  });
}

/** Adds the actor's vote, or removes it if they already voted. */
export async function toggleVoteFor(actor: Actor, ideaId: string) {
  return db.transaction(async (tx) => {
    const [idea] = await tx
      .select({ title: ideas.title, locked: ideas.locked, hidden: ideas.hidden, mergedIntoId: ideas.mergedIntoId })
      .from(ideas)
      .where(eq(ideas.id, ideaId))
      .for("update");
    if (!idea || idea.hidden || idea.mergedIntoId) throw new UserFacingError("That idea isn't available.");
    if (idea.locked) throw new UserFacingError("Voting is closed on this idea.");

    const removed = await tx
      .delete(votes)
      .where(and(eq(votes.ideaId, ideaId), eq(votes.userId, actor.id)))
      .returning({ ideaId: votes.ideaId });
    const voted = removed.length === 0;
    if (voted) await tx.insert(votes).values({ ideaId, userId: actor.id });

    const [updated] = await tx
      .update(ideas)
      .set({ voteCount: sql`${ideas.voteCount} + ${voted ? 1 : -1}` })
      .where(eq(ideas.id, ideaId))
      .returning({ voteCount: ideas.voteCount });
    return { voted, voteCount: updated.voteCount, title: idea.title };
  });
}
