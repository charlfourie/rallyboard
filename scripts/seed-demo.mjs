// Fills the board with demo content for a fictional game, "Starfall Tactics".
//
//   node scripts/seed-demo.mjs           add demo content if it isn't there yet
//   node scripts/seed-demo.mjs --reset   remove the demo content, then add it fresh
//   node scripts/seed-demo.mjs --wipe    delete EVERYTHING on the board, then add the demo
//
// On Vercel it runs before each build only when DEMO_SEED=true, so real boards never get it.
// Anything posted by real people is kept, apart from their votes and comments on demo ideas
// when resetting, unless you pass --wipe.
import postgres from "postgres";
import { seedDemo } from "./demo-content.mjs";

const fromBuild = process.argv.includes("--if-enabled");
if (fromBuild && process.env.DEMO_SEED !== "true") process.exit(0);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const mode = process.argv.includes("--wipe") ? "wipe" : process.argv.includes("--reset") ? "reset" : "add";
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  console.log(await seedDemo(sql, mode));
} catch (error) {
  console.error("Demo seed failed:", error.message);
  process.exitCode = fromBuild ? 0 : 1; // never block a deploy over demo content
} finally {
  await sql.end();
}
