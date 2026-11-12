import Link from "next/link";
import type { BoardIdea } from "@/lib/ideas";
import { CategoryChip, StatusBadge, TimeAgo } from "./badges";
import { VoteButton } from "./vote-button";

export function IdeaRow({ idea, signedIn }: { idea: BoardIdea; signedIn: boolean }) {
  return (
    <li className="flex gap-4 p-4 sm:p-5">
      <VoteButton
        ideaId={idea.id}
        voted={idea.hasVoted}
        count={idea.voteCount}
        signedIn={signedIn}
        locked={idea.locked}
      />
      <div className="min-w-0 flex-1">
        <Link href={`/ideas/${idea.id}`} className="font-semibold hover:text-accent">
          {idea.title}
        </Link>
        {idea.body && <p className="mt-1 line-clamp-2 text-sm text-muted">{idea.body}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {idea.status !== "under_review" && <StatusBadge status={idea.status} />}
          <CategoryChip name={idea.categoryName} color={idea.categoryColor} />
          <span>
            {idea.commentCount} {idea.commentCount === 1 ? "comment" : "comments"}
          </span>
          <TimeAgo date={idea.createdAt} />
        </div>
      </div>
    </li>
  );
}
