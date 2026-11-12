import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CategoryChip } from "@/components/badges";
import { releasesWithIdeas } from "@/lib/ideas";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Releases" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function ReleasesPage() {
  const settings = await getSettings();
  if (!settings) redirect("/setup");
  const releases = await releasesWithIdeas();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Releases</h1>
        <p className="text-muted">Player ideas that made it into {settings.gameName}.</p>
      </div>

      {releases.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">No releases yet. Check the roadmap for what&apos;s coming.</p>
      ) : (
        <ol className="relative space-y-8 border-l border-line pl-6">
          {releases.map((release) => (
            <li key={release.id} className="relative">
              <span aria-hidden className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-bg bg-accent" />
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 className="text-xl font-semibold">
                  {release.version}
                  {release.title && <span className="font-normal text-muted"> · {release.title}</span>}
                </h2>
                {release.releasedAt && (
                  <time dateTime={release.releasedAt.toISOString()} className="text-sm text-muted">
                    {dateFormat.format(release.releasedAt)}
                  </time>
                )}
              </div>
              {release.ideas.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Fixes and improvements from the team.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {release.ideas.map((idea) => (
                    <li key={idea.id}>
                      <Link
                        href={`/ideas/${idea.id}`}
                        className="card flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:border-accent"
                      >
                        <span className="font-medium">{idea.title}</span>
                        <span className="flex items-center gap-3 text-xs text-muted">
                          <CategoryChip name={idea.categoryName} color={idea.categoryColor} />
                          {idea.voteCount} {idea.voteCount === 1 ? "vote" : "votes"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
