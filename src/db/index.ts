import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

// Reuse one connection pool across hot reloads in development and across
// invocations of the same serverless instance.
const globalForDb = globalThis as unknown as { rallyboardDb?: Database };

function createDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const client = postgres(url, {
    max: process.env.VERCEL ? 1 : 10,
    // Pooled connections (Neon, Supabase, PgBouncer) don't support prepared statements.
    prepare: false,
    onnotice: () => {},
  });
  return drizzle(client, { schema });
}

export function getDb(): Database {
  if (!globalForDb.rallyboardDb) globalForDb.rallyboardDb = createDb();
  return globalForDb.rallyboardDb;
}

// The connection is created on first use rather than at import, so `next build`
// works without a database and a missing DATABASE_URL gives a clear error.
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
