import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, settings } from "@/db/schema";

export const DEFAULT_ACCENT = "#7c5cff";

export const DEFAULT_CATEGORIES = [
  { name: "Feature", color: "#7c5cff" },
  { name: "Bug", color: "#ef5b5b" },
  { name: "Balance", color: "#f2a93b" },
  { name: "Quality of life", color: "#3bbf8a" },
];

/** The board's settings row, or null before first-run setup. Cached per request. */
export const getSettings = cache(async () => {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return row ?? null;
});

export const getCategories = cache(async () => {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.createdAt));
});

export type BoardSettings = NonNullable<Awaited<ReturnType<typeof getSettings>>>;
