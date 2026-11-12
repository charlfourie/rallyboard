import { cache } from "react";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, comments, ideas, releases, users, votes, type IdeaStatus } from "@/db/schema";

export const SORTS = ["top", "new", "trending"] as const;
export type Sort = (typeof SORTS)[number];
export const PAGE_SIZE = 30;

export type BoardFilters = {
  sort: Sort;
  categoryId?: string;
  status?: IdeaStatus;
  q?: string;
  page: number;
};

/** Ideas that should appear publicly: not hidden by a moderator, not merged away. */
const visible = and(eq(ideas.hidden, false), isNull(ideas.mergedIntoId));

// Trending = most votes received in the last 7 days, so ideas with momentum rise
// whatever their age, and a brand-new idea needs real support to get there.
const trendingScore = sql`(select count(*) from ${votes} where ${votes.ideaId} = ${ideas.id} and ${votes.createdAt} > now() - interval '7 days')`;

function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const ideaColumns = {
  id: ideas.id,
  title: ideas.title,
  body: ideas.body,
  status: ideas.status,
  voteCount: ideas.voteCount,
  commentCount: ideas.commentCount,
  locked: ideas.locked,
  createdAt: ideas.createdAt,
  categoryId: ideas.categoryId,
  categoryName: categories.name,
  categoryColor: categories.color,
  authorId: ideas.authorId,
  authorName: users.name,
  authorImage: users.image,
};

/** One page of the board plus whether more pages follow. */
export async function listIdeas(filters: BoardFilters, viewerId?: string | null) {
  const conditions: (SQL | undefined)[] = [visible];
  if (filters.categoryId) conditions.push(eq(ideas.categoryId, filters.categoryId));
  if (filters.status) conditions.push(eq(ideas.status, filters.status));
  else conditions.push(sql`${ideas.status} <> 'declined'`); // declined ideas only on request
  const q = filters.q?.trim();
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    conditions.push(
      or(ilike(ideas.title, pattern), ilike(ideas.body, pattern), sql`word_similarity(${q}, ${ideas.title}) > 0.35`),
    );
  }

  const order =
    filters.sort === "new"
      ? [desc(ideas.createdAt)]
      : filters.sort === "trending"
        ? [desc(trendingScore), desc(ideas.createdAt)]
        : [desc(ideas.voteCount), desc(ideas.createdAt)];

  const rows = await db
    .select({
      ...ideaColumns,
      hasVoted: viewerId
        ? sql<boolean>`exists (select 1 from ${votes} where ${votes.ideaId} = ${ideas.id} and ${votes.userId} = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(ideas)
    .leftJoin(categories, eq(ideas.categoryId, categories.id))
    .leftJoin(users, eq(ideas.authorId, users.id))
    .where(and(...conditions))
    .orderBy(...order, asc(ideas.id))
    .limit(PAGE_SIZE + 1)
    .offset((filters.page - 1) * PAGE_SIZE);

  return { ideas: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export type BoardIdea = Awaited<ReturnType<typeof listIdeas>>["ideas"][number];

/** A single idea for its detail page, or null if it doesn't exist or is hidden. */
export const getIdea = cache(async (id: string, viewerId?: string | null) => {
  const [row] = await db
    .select({
      ...ideaColumns,
      mergedIntoId: ideas.mergedIntoId,
      hidden: ideas.hidden,
      releaseId: ideas.releaseId,
      releaseVersion: releases.version,
      authorRole: users.role,
      authorBanned: users.banned,
      hasVoted: viewerId
        ? sql<boolean>`exists (select 1 from ${votes} where ${votes.ideaId} = ${ideas.id} and ${votes.userId} = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(ideas)
    .leftJoin(categories, eq(ideas.categoryId, categories.id))
    .leftJoin(users, eq(ideas.authorId, users.id))
    .leftJoin(releases, eq(ideas.releaseId, releases.id))
    .where(eq(ideas.id, id));
  return row ?? null;
});

export async function getVoters(ideaId: string, limit = 12) {
  return db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(votes)
    .innerJoin(users, eq(votes.userId, users.id))
    .where(eq(votes.ideaId, ideaId))
    .orderBy(desc(votes.createdAt))
    .limit(limit);
}

export async function getComments(ideaId: string) {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      authorName: users.name,
      authorImage: users.image,
      authorRole: users.role,
      authorBanned: users.banned,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.ideaId, ideaId), eq(comments.hidden, false)))
    .orderBy(asc(comments.createdAt));
}

/** Planned, in-progress and recently shipped ideas for the public roadmap. */
export async function roadmapIdeas() {
  const rows = await db
    .select({
      id: ideas.id,
      title: ideas.title,
      status: ideas.status,
      voteCount: ideas.voteCount,
      categoryName: categories.name,
      categoryColor: categories.color,
      releaseVersion: releases.version,
      updatedAt: ideas.updatedAt,
    })
    .from(ideas)
    .leftJoin(categories, eq(ideas.categoryId, categories.id))
    .leftJoin(releases, eq(ideas.releaseId, releases.id))
    .where(and(visible, inArray(ideas.status, ["planned", "in_progress", "shipped"])))
    .orderBy(desc(ideas.voteCount), desc(ideas.updatedAt));

  return {
    planned: rows.filter((r) => r.status === "planned"),
    inProgress: rows.filter((r) => r.status === "in_progress"),
    // Only the latest shipped work, so the column stays short.
    shipped: rows
      .filter((r) => r.status === "shipped")
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 12),
  };
}

/** Releases newest first, each with the ideas that shipped in it. */
export async function releasesWithIdeas() {
  const all = await db
    .select({ id: releases.id, version: releases.version, title: releases.title, releasedAt: releases.releasedAt })
    .from(releases)
    .where(sql`${releases.releasedAt} is not null and ${releases.releasedAt} <= now()`)
    .orderBy(desc(releases.releasedAt));
  if (all.length === 0) return [];

  const shipped = await db
    .select({
      id: ideas.id,
      title: ideas.title,
      voteCount: ideas.voteCount,
      releaseId: ideas.releaseId,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(ideas)
    .leftJoin(categories, eq(ideas.categoryId, categories.id))
    .where(and(visible, inArray(ideas.releaseId, all.map((r) => r.id))))
    .orderBy(desc(ideas.voteCount));

  return all.map((release) => ({ ...release, ideas: shipped.filter((i) => i.releaseId === release.id) }));
}

/** Existing ideas whose titles resemble the text, for "is this already posted?" hints. */
export async function findSimilarIdeas(text: string, limit = 5) {
  const q = text.trim();
  if (q.length < 4) return [];
  return db
    .select({
      id: ideas.id,
      title: ideas.title,
      status: ideas.status,
      voteCount: ideas.voteCount,
    })
    .from(ideas)
    .where(and(visible, sql`word_similarity(${q}, ${ideas.title}) > 0.35`))
    .orderBy(desc(sql`word_similarity(${q}, ${ideas.title})`), desc(ideas.voteCount))
    .limit(limit);
}
