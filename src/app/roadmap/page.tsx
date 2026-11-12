import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CategoryChip } from "@/components/badges";
import { roadmapIdeas } from "@/lib/ideas";
import { getSettings } from "@/lib/settings";
import { statusInfo } from "@/lib/status";

export const metadata: Metadata = { title: "Roadmap" };

type Card = Awaited<ReturnType<typeof roadmapIdeas>>["planned"][number];

function Column({ title, color, ideas, empty }: { title: string; color: string; ideas: Card[]; empty: string }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {title}
        <span className="text-sm font-normal text-muted">{ideas.length}</span>
      </h2>
      {ideas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <Link href={`/ideas/${idea.id}`} className="card block p-4 transition hover:border-accent">
                <p className="font-medium">{idea.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>
                    {idea.voteCount} {idea.voteCount === 1 ? "vote" : "votes"}
                  </span>
                  <CategoryChip name={idea.categoryName} color={idea.categoryColor} />
                  {idea.releaseVersion && <span>in {idea.releaseVersion}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function RoadmapPage() {
  const settings = await getSettings();
  if (!settings) redirect("/setup");
  const { planned, inProgress, shipped } = await roadmapIdeas();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Roadmap</h1>
        <p className="text-muted">What&apos;s coming to {settings.gameName}, shaped by your votes.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Column title="Planned" color={statusInfo("planned").color} ideas={planned} empty="Nothing planned yet." />
        <Column
          title="In progress"
          color={statusInfo("in_progress").color}
          ideas={inProgress}
          empty="Nothing in progress right now."
        />
        <Column
          title="Recently shipped"
          color={statusInfo("shipped").color}
          ideas={shipped}
          empty="Nothing shipped yet."
        />
      </div>
    </div>
  );
}
