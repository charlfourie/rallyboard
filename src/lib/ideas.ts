import { cache } from "react";
import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, comments, ideas, users, votes, type IdeaStatus } from "@/db/schema";

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

// Votes decay with age so newer ideas with momentum rise (similar to Hacker News).
const trendingScore = sql`(${ideas.voteCount} + 1) / power(extract(epoch from (now() - ${ideas.createdAt})) / 3600 + 2, 1.3)`;

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
      or(ilike(ideas.title, pattern), ilike(ideas.body, pattern), sql`${ideas.title} % ${q}`),
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
      hasVoted: viewerId
        ? sql<boolean>`exists (select 1 from ${votes} where ${votes.ideaId} = ${ideas.id} and ${votes.userId} = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(ideas)
    .leftJoin(categories, eq(ideas.categoryId, categories.id))
    .leftJoin(users, eq(ideas.authorId, users.id))
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
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.ideaId, ideaId), eq(comments.hidden, false)))
    .orderBy(asc(comments.createdAt));
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
