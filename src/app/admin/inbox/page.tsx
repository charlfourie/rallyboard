import type { Metadata } from "next";
import Link from "next/link";
import { CategoryChip, TimeAgo } from "@/components/badges";
import { StatusForm } from "@/components/status-form";
import { inboxCounts, inboxIdeas, INBOX_VIEWS, listReleases, type InboxView } from "@/lib/admin";

export const metadata: Metadata = { title: "Inbox" };

const LABELS: Record<InboxView, string> = { new: "Needs review", all: "All ideas", hidden: "Hidden" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: raw } = await searchParams;
  const view: InboxView = INBOX_VIEWS.includes(raw as InboxView) ? (raw as InboxView) : "new";
  const [ideas, counts, releases] = await Promise.all([inboxIdeas(view), inboxCounts(), listReleases()]);
  const releaseOptions = releases.map((r) => ({ id: r.id, version: r.version }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="text-sm text-muted">Review new ideas, set statuses, and open an idea to merge, lock or hide it.</p>
      </div>

      <nav aria-label="Inbox views" className="flex w-fit rounded-lg border border-line bg-surface p-1">
        {INBOX_VIEWS.map((v) => (
          <Link
            key={v}
            href={v === "new" ? "/admin/inbox" : `/admin/inbox?view=${v}`}
            aria-current={view === v ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm ${
              view === v ? "bg-surface-2 font-medium text-text" : "text-muted hover:text-text"
            }`}
          >
            {LABELS[v]}
            {v === "new" && counts.new > 0 && <span className="ml-1.5 text-accent">{counts.new}</span>}
            {v === "hidden" && counts.hidden > 0 && <span className="ml-1.5 text-muted">{counts.hidden}</span>}
          </Link>
        ))}
      </nav>

      {ideas.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">
          {view === "new" ? "All caught up. No ideas are waiting for review." : "Nothing here."}
        </p>
      ) : (
        <ul className="card divide-y divide-line">
          {ideas.map((idea) => (
            <li key={idea.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/ideas/${idea.id}`} className="font-medium hover:text-accent">
                    {idea.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>
                      {idea.voteCount} {idea.voteCount === 1 ? "vote" : "votes"}
                    </span>
                    <span>
                      {idea.commentCount} {idea.commentCount === 1 ? "comment" : "comments"}
                    </span>
                    <CategoryChip name={idea.categoryName} color={idea.categoryColor} />
                    <span>
                      by {idea.authorName ?? "a player"}
                      {idea.authorBanned && <span className="text-danger"> (banned)</span>}
                    </span>
                    <TimeAgo date={idea.createdAt} />
                    {idea.locked && <span>Locked</span>}
                  </div>
                </div>
              </div>
              <StatusForm
                ideaId={idea.id}
                status={idea.status}
                releaseId={idea.releaseId}
                releases={releaseOptions}
                compact
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
