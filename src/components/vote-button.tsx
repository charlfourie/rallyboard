"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toggleVote } from "@/app/ideas/actions";

type Props = {
  ideaId: string;
  voted: boolean;
  count: number;
  signedIn: boolean;
  locked?: boolean;
  size?: "md" | "lg";
};

/** Upvote toggle. Updates instantly, then settles on the server's count. */
export function VoteButton({ ideaId, voted, count, signedIn, locked = false, size = "md" }: Props) {
  const [state, setState] = useState({ voted, count });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onClick() {
    if (!signedIn) {
      const here = pathname + (searchParams.size ? `?${searchParams}` : "");
      router.push(`/signin?callbackUrl=${encodeURIComponent(here)}`);
      return;
    }
    const previous = state;
    setError(null);
    setState({ voted: !state.voted, count: state.count + (state.voted ? -1 : 1) });
    startTransition(async () => {
      const result = await toggleVote(ideaId);
      if (result.ok) setState({ voted: result.voted, count: result.voteCount });
      else {
        setState(previous);
        setError(result.error);
      }
    });
  }

  const dims = size === "lg" ? "h-20 w-16 text-lg" : "h-14 w-12 text-sm";

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        disabled={pending || (locked && !state.voted)}
        aria-pressed={state.voted}
        aria-label={`${state.voted ? "Remove your vote" : "Vote for this idea"} (${state.count} votes)`}
        title={locked ? "Voting is closed" : undefined}
        className={`flex ${dims} shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border font-semibold transition disabled:cursor-not-allowed ${
          state.voted
            ? "border-accent bg-accent text-accent-contrast"
            : "border-line bg-surface-2 text-text hover:border-accent"
        }`}
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
          <path d="M8 3.5 13 10H3z" />
        </svg>
        <span className="tabular-nums">{state.count}</span>
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-28 text-center text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
