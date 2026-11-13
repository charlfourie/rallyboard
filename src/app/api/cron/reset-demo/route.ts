import postgres from "postgres";
import { revalidatePath } from "next/cache";
import { seedDemo } from "../../../../../scripts/demo-content.mjs";

// Nightly reset for the public demo (scheduled in vercel.json). It clears everything visitors
// posted and restores Starfall Tactics. Real boards never run it: it needs DEMO_SEED=true.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (process.env.DEMO_SEED !== "true") {
    return Response.json({ skipped: "Not a demo board (DEMO_SEED isn't true)." });
  }
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false, onnotice: () => {} });
  try {
    const message = await seedDemo(sql, "wipe");
    revalidatePath("/", "layout");
    return Response.json({ ok: true, message });
  } catch (error) {
    console.error("Demo reset failed", error);
    return Response.json({ error: "Demo reset failed" }, { status: 500 });
  } finally {
    await sql.end();
  }
}
