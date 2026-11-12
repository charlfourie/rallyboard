import { findSimilarIdeas } from "@/lib/ideas";

// Powers the "similar ideas" hints on the new idea form.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const ideas = await findSimilarIdeas(q.slice(0, 200));
  return Response.json({ ideas });
}
