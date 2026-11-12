"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { comments, ideas } from "@/db/schema";
import { errorMessage, type FormState } from "@/lib/form";
import { loadActor, postIdea, toggleVoteFor } from "@/lib/idea-writes";
import { getCurrentUser, hasRole } from "@/lib/session";

const COMMENTS_PER_HOUR = 30;

/** The signed-in user, re-checked against the database so banned players are stopped. */
async function requireActiveUser() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) throw new Error("Sign in to do that.");
  return loadActor(sessionUser.id);
}

const hourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

/* ------------------------------------------------------------------ */
/* Ideas                                                              */
/* ------------------------------------------------------------------ */

export async function createIdea(_prev: FormState, formData: FormData): Promise<FormState> {
  let newId: string;
  try {
    const user = await requireActiveUser();
    newId = await postIdea(user, {
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/");
  redirect(`/ideas/${newId}`);
}

/* ------------------------------------------------------------------ */
/* Votes                                                              */
/* ------------------------------------------------------------------ */

export type VoteResult = { ok: true; voted: boolean; voteCount: number } | { ok: false; error: string };

/** Adds the viewer's vote, or removes it if they've already voted. */
export async function toggleVote(ideaId: string): Promise<VoteResult> {
  try {
    const id = z.uuid().parse(ideaId);
    const user = await requireActiveUser();
    const { voted, voteCount } = await toggleVoteFor(user, id);
    revalidatePath("/");
    revalidatePath(`/ideas/${id}`);
    return { ok: true, voted, voteCount };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

/* ------------------------------------------------------------------ */
/* Comments                                                           */
/* ------------------------------------------------------------------ */

const commentFields = z.object({
  ideaId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Write a comment first.")
    .max(2000, "Keep comments under 2,000 characters."),
});

export async function addComment(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireActiveUser();
    const parsed = commentFields.safeParse({
      ideaId: String(formData.get("ideaId") ?? ""),
      body: String(formData.get("body") ?? ""),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { ideaId, body } = parsed.data;

    const [idea] = await db
      .select({ locked: ideas.locked, hidden: ideas.hidden })
      .from(ideas)
      .where(eq(ideas.id, ideaId));
    if (!idea || idea.hidden) return { error: "That idea isn't available." };
    if (idea.locked && !hasRole(user.role, "moderator")) return { error: "Comments are closed on this idea." };

    if (!hasRole(user.role, "moderator")) {
      const [{ recent }] = await db
        .select({ recent: count() })
        .from(comments)
        .where(and(eq(comments.authorId, user.id), gt(comments.createdAt, hourAgo())));
      if (recent >= COMMENTS_PER_HOUR) {
        return { error: "You've commented a lot in the last hour. Try again a little later." };
      }
    }

    await db.transaction(async (tx) => {
      await tx.insert(comments).values({ ideaId, authorId: user.id, body });
      await tx
        .update(ideas)
        .set({ commentCount: sql`${ideas.commentCount} + 1` })
        .where(eq(ideas.id, ideaId));
    });

    revalidatePath(`/ideas/${ideaId}`);
    revalidatePath("/");
    return { success: "Comment posted" };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

/** Authors can delete their own comments; moderators can delete any. */
export async function deleteComment(formData: FormData): Promise<void> {
  const user = await requireActiveUser();
  const commentId = z.uuid().parse(String(formData.get("commentId") ?? ""));

  const [comment] = await db
    .select({ ideaId: comments.ideaId, authorId: comments.authorId })
    .from(comments)
    .where(eq(comments.id, commentId));
  if (!comment) return;
  if (comment.authorId !== user.id && !hasRole(user.role, "moderator")) {
    throw new Error("You can only delete your own comments.");
  }

  await db.transaction(async (tx) => {
    await tx.delete(comments).where(eq(comments.id, commentId));
    await tx
      .update(ideas)
      .set({ commentCount: sql`greatest(${ideas.commentCount} - 1, 0)` })
      .where(eq(ideas.id, comment.ideaId));
  });

  revalidatePath(`/ideas/${comment.ideaId}`);
  revalidatePath("/");
}
