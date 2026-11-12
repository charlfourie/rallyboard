import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { deleteComment } from "@/app/ideas/actions";
import { Avatar, CategoryChip, StatusBadge, TimeAgo } from "@/components/badges";
import { VoteButton } from "@/components/vote-button";
import { listReleases, mergeTargets } from "@/lib/admin";
import { getComments, getIdea, getVoters } from "@/lib/ideas";
import { getCurrentUser, hasRole } from "@/lib/session";
import { CommentForm } from "./comment-form";
import { ModerationPanel } from "./moderation-panel";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return {};
  const idea = await getIdea(id);
  return idea && !idea.hidden ? { title: idea.title, description: idea.body.slice(0, 160) || undefined } : {};
}

export default async function IdeaPage({ params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const user = await getCurrentUser();
  const isModerator = hasRole(user?.role, "moderator");
  const idea = await getIdea(id, user?.id);
  // Hidden ideas are gone for players; moderators can still open them to restore them.
  if (!idea || (idea.hidden && !isModerator)) notFound();
  // Duplicates send visitors to the idea they were merged into.
  if (idea.mergedIntoId) permanentRedirect(`/ideas/${idea.mergedIntoId}`);

  const [voters, comments, releases, targets] = await Promise.all([
    getVoters(id),
    getComments(id),
    isModerator ? listReleases() : Promise.resolve([]),
    isModerator ? mergeTargets(id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/" className="text-sm text-muted hover:text-text">
        ← Back to the board
      </Link>

      {idea.hidden && (
        <p role="status" className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm">
          This idea is hidden. Only moderators can see it.
        </p>
      )}

      <article className="card flex gap-5 p-6">
        <VoteButton
          ideaId={idea.id}
          voted={idea.hasVoted}
          count={idea.voteCount}
          signedIn={Boolean(user)}
          locked={idea.locked}
          size="lg"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={idea.status} />
            {idea.status === "shipped" && idea.releaseVersion && (
              <Link href="/releases" className="text-xs text-muted hover:text-text">
                in {idea.releaseVersion}
              </Link>
            )}
            <CategoryChip name={idea.categoryName} color={idea.categoryColor} />
            {idea.locked && <span className="text-xs text-muted">Locked</span>}
          </div>
          <h1 className="text-2xl font-bold break-words">{idea.title}</h1>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Avatar name={idea.authorName} image={idea.authorImage} size={20} />
            {idea.authorName ?? "A player"} · <TimeAgo date={idea.createdAt} />
          </p>
          {idea.body && <p className="whitespace-pre-line break-words leading-relaxed">{idea.body}</p>}

          {voters.length > 0 && (
            <div className="flex items-center gap-3 border-t border-line pt-4">
              <div className="flex -space-x-2">
                {voters.map((v) => (
                  <span key={v.id} title={v.name ?? undefined} className="rounded-full ring-2 ring-surface">
                    <Avatar name={v.name} image={v.image} size={28} />
                  </span>
                ))}
              </div>
              <span className="text-sm text-muted">
                {idea.voteCount} {idea.voteCount === 1 ? "player wants" : "players want"} this
              </span>
            </div>
          )}
        </div>
      </article>

      {isModerator && (
        <ModerationPanel
          idea={{
            id: idea.id,
            status: idea.status,
            releaseId: idea.releaseId,
            locked: idea.locked,
            hidden: idea.hidden,
            authorId: idea.authorId,
            authorName: idea.authorName,
            authorRole: idea.authorRole,
            authorBanned: idea.authorBanned,
          }}
          releases={releases.map((r) => ({ id: r.id, version: r.version }))}
          mergeTargets={targets}
        />
      )}

      <section aria-labelledby="comments-heading" className="space-y-4">
        <h2 id="comments-heading" className="text-lg font-semibold">
          Comments ({comments.length})
        </h2>

        {comments.length > 0 && (
          <ul className="card divide-y divide-line">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-3 p-4">
                <Avatar name={comment.authorName} image={comment.authorImage} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{comment.authorName ?? "A player"}</span>
                    {comment.authorRole && comment.authorRole !== "player" && (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-xs font-medium text-accent">
                        Dev team
                      </span>
                    )}
                    {isModerator && comment.authorBanned && (
                      <span className="rounded bg-danger/15 px-1.5 py-0.5 text-xs font-medium text-danger">Banned</span>
                    )}
                    <span className="text-xs text-muted">
                      <TimeAgo date={comment.createdAt} />
                    </span>
                    {user && (comment.authorId === user.id || isModerator) && (
                      <form action={deleteComment} className="ml-auto">
                        <input type="hidden" name="commentId" value={comment.id} />
                        <button className="text-xs text-muted hover:text-danger">Delete</button>
                      </form>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed">{comment.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!user ? (
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span className="text-muted">Sign in to join the discussion.</span>
            <Link href={`/signin?callbackUrl=/ideas/${idea.id}`} className="btn-primary">
              Sign in
            </Link>
          </div>
        ) : idea.locked && !isModerator ? (
          <p className="text-sm text-muted">Comments are closed on this idea.</p>
        ) : (
          <CommentForm ideaId={idea.id} />
        )}
      </section>
    </div>
  );
}
