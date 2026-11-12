// Applies pending database migrations from ./drizzle.
// Runs before every Vercel build and when the Docker container starts.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set; cannot run migrations.");
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("Database is up to date.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
