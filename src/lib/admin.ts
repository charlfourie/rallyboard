import { and, asc, count, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, ideas, releases, users } from "@/db/schema";

export const INBOX_VIEWS = ["new", "all", "hidden"] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

/** Ideas for the moderator inbox. "new" = still under review, newest first. */
export async function inboxIdeas(view: InboxView) {
  const where =
    view === "hidden"
      ? and(eq(ideas.hidden, true), isNull(ideas.mergedIntoId))
      : view === "new"
        ? and(eq(ideas.status, "under_review"), eq(ideas.hidden, false), isNull(ideas.mergedIntoId))
        : and(eq(ideas.hidden, false), isNull(ideas.mergedIntoId));

  return db
    .select({
      id: ideas.id,
      title: ideas.title,
      status: ideas.status,
      voteCount: ideas.voteCount,
      commentCount: ideas.commentCount,
      createdAt: ideas.createdAt,
      locked: ideas.locked,
      hidden: ideas.hidden,
      releaseId: ideas.releaseId,
      categoryName: categories.name,
      categoryColor: categories.color,
      authorId: ideas.authorId,
      authorName: users.name,
      authorBanned: users.banned,
      authorRole: users.role,
    })
    .from(ideas)
    .leftJoin(categories, eq(ideas.categoryId, categories.id))
    .leftJoin(users, eq(ideas.authorId, users.id))
    .where(where)
    .orderBy(desc(ideas.createdAt))
    .limit(100);
}

export async function inboxCounts() {
  const [row] = await db
    .select({
      new: sql<number>`count(*) filter (where ${ideas.status} = 'under_review' and not ${ideas.hidden})`.mapWith(Number),
      hidden: sql<number>`count(*) filter (where ${ideas.hidden})`.mapWith(Number),
    })
    .from(ideas)
    .where(isNull(ideas.mergedIntoId));
  return row;
}

/** Releases newest first, with how many ideas shipped in each. */
export async function listReleases() {
  return db
    .select({
      id: releases.id,
      version: releases.version,
      title: releases.title,
      releasedAt: releases.releasedAt,
      ideaCount: sql<number>`(select count(*) from ${ideas} where ${ideas.releaseId} = ${releases.id} and not ${ideas.hidden} and ${ideas.mergedIntoId} is null)`.mapWith(Number),
    })
    .from(releases)
    .orderBy(sql`${releases.releasedAt} desc nulls first`, desc(releases.createdAt));
}

/** Other open ideas a duplicate could be merged into, most voted first. */
export async function mergeTargets(excludeId: string) {
  return db
    .select({ id: ideas.id, title: ideas.title, voteCount: ideas.voteCount })
    .from(ideas)
    .where(and(ne(ideas.id, excludeId), eq(ideas.hidden, false), isNull(ideas.mergedIntoId)))
    .orderBy(desc(ideas.voteCount), asc(ideas.title))
    .limit(300);
}

export async function listTeam() {
  return db
    .select({ id: users.id, name: users.name, image: users.image, email: users.email, role: users.role })
    .from(users)
    .where(ne(users.role, "player"))
    .orderBy(desc(users.role), asc(users.name));
}

export async function listBanned() {
  return db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(eq(users.banned, true))
    .orderBy(asc(users.name));
}

/** Signed-up players matching a name or email, for promoting to moderator. */
export async function searchPlayers(q: string) {
  const text = q.trim();
  if (text.length < 2) return [];
  const pattern = `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return db
    .select({ id: users.id, name: users.name, image: users.image, email: users.email, banned: users.banned })
    .from(users)
    .where(
      and(
        eq(users.role, "player"),
        sql`${users.id} not like 'demo-%'`,
        or(ilike(users.name, pattern), ilike(users.email, pattern)),
      ),
    )
    .orderBy(asc(users.name))
    .limit(10);
}

export async function playerCount() {
  const [row] = await db.select({ total: count() }).from(users).where(sql`${users.id} not like 'demo-%'`);
  return row.total;
}
