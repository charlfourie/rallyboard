-- Fuzzy matching for search and "similar ideas" hints.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ideas_title_trgm_idx" ON "ideas" USING gin ("title" gin_trgm_ops);
