import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const roleEnum = pgEnum("role", ["player", "moderator", "owner"]);

export const ideaStatusEnum = pgEnum("idea_status", [
  "under_review",
  "planned",
  "in_progress",
  "shipped",
  "declined",
]);

export type Role = (typeof roleEnum.enumValues)[number];
export type IdeaStatus = (typeof ideaStatusEnum.enumValues)[number];

/* ------------------------------------------------------------------ */
/* Board settings: one row per install                                */
/* ------------------------------------------------------------------ */

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  gameName: text("game_name").notNull(),
  tagline: text("tagline"),
  logoUrl: text("logo_url"),
  accentColor: text("accent_color").notNull().default("#7c5cff"),
  customDomain: text("custom_domain"),
  discordAppId: text("discord_app_id"),
  discordChannelId: text("discord_channel_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Users and Auth.js tables                                           */
/* The users table follows Auth.js's shape (name, email, image) and   */
/* adds Rallyboard's own columns.                                     */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
    image: text("image"),
    discordId: text("discord_id").unique(),
    role: roleEnum("role").notNull().default("player"),
    banned: boolean("banned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ------------------------------------------------------------------ */
/* Board content                                                      */
/* ------------------------------------------------------------------ */

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#8b8b9a"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const releases = pgTable("releases", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: text("version").notNull().unique(),
  title: text("title"),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    status: ideaStatusEnum("status").notNull().default("under_review"),
    voteCount: integer("vote_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    releaseId: uuid("release_id").references(() => releases.id, { onDelete: "set null" }),
    mergedIntoId: uuid("merged_into_id").references((): AnyPgColumn => ideas.id, {
      onDelete: "set null",
    }),
    hidden: boolean("hidden").notNull().default(false),
    locked: boolean("locked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ideas_status_idx").on(t.status),
    index("ideas_vote_count_idx").on(t.voteCount),
    index("ideas_created_at_idx").on(t.createdAt),
  ],
);

export const votes = pgTable(
  "votes",
  {
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.ideaId, t.userId] })],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comments_idea_idx").on(t.ideaId)],
);

export const statusEvents = pgTable(
  "status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    fromStatus: ideaStatusEnum("from_status"),
    toStatus: ideaStatusEnum("to_status").notNull(),
    changedBy: text("changed_by").references(() => users.id, { onDelete: "set null" }),
    announcedAt: timestamp("announced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("status_events_idea_idx").on(t.ideaId, t.createdAt)],
);
