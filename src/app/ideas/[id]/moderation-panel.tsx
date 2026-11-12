"use client";

import { useActionState } from "react";
import { mergeIdea, setBanned, setIdeaFlag } from "@/app/admin/moderation-actions";
import { FormStatus } from "@/components/form-status";
import { StatusForm } from "@/components/status-form";
import type { IdeaStatus } from "@/db/schema";

type Props = {
  idea: {
    id: string;
    status: IdeaStatus;
    releaseId: string | null;
    locked: boolean;
    hidden: boolean;
    authorId: string | null;
    authorName: string | null;
    authorRole: string | null;
    authorBanned: boolean | null;
  };
  releases: { id: string; version: string }[];
  mergeTargets: { id: string; title: string; voteCount: number }[];
};

function FlagButton({ ideaId, flag, value, label }: { ideaId: string; flag: string; value: boolean; label: string }) {
  return (
    <form action={setIdeaFlag}>
      <input type="hidden" name="ideaId" value={ideaId} />
      <input type="hidden" name="flag" value={flag} />
      <input type="hidden" name="value" value={String(value)} />
      <button type="submit" className="btn-secondary px-3 py-1.5">
        {label}
      </button>
    </form>
  );
}

export function ModerationPanel({ idea, releases, mergeTargets }: Props) {
  const [mergeState, mergeAction, merging] = useActionState(mergeIdea, undefined);

  return (
    <section aria-labelledby="mod-heading" className="card space-y-5 border-accent/40 p-5">
      <h2 id="mod-heading" className="text-sm font-semibold uppercase tracking-wide text-accent">
        Moderation
      </h2>

      <div>
        <p className="label">Status</p>
        <StatusForm ideaId={idea.id} status={idea.status} releaseId={idea.releaseId} releases={releases} />
      </div>

      <div className="flex flex-wrap gap-2">
        <FlagButton
          ideaId={idea.id}
          flag="locked"
          value={!idea.locked}
          label={idea.locked ? "Unlock votes and comments" : "Lock votes and comments"}
        />
        <FlagButton
          ideaId={idea.id}
          flag="hidden"
          value={!idea.hidden}
          label={idea.hidden ? "Show on the board" : "Hide from the board"}
        />
        {idea.authorId && idea.authorRole === "player" && (
          <form
            action={setBanned}
            onSubmit={(e) => {
              if (!idea.authorBanned && !confirm(`Ban ${idea.authorName ?? "this player"}? They'll be signed out and can't post, vote or comment.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="userId" value={idea.authorId} />
            <input type="hidden" name="value" value={String(!idea.authorBanned)} />
            <button type="submit" className="btn-secondary px-3 py-1.5 hover:text-danger">
              {idea.authorBanned ? `Unban ${idea.authorName ?? "author"}` : `Ban ${idea.authorName ?? "author"}`}
            </button>
          </form>
        )}
      </div>

      {mergeTargets.length > 0 && (
        <form
          action={mergeAction}
          className="space-y-2"
          onSubmit={(e) => {
            if (!confirm("Merge this idea? Its votes and comments move to the other idea, and this page will redirect there.")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="ideaId" value={idea.id} />
          <label className="label" htmlFor="merge-target">
            Merge this duplicate into
          </label>
          <div className="flex flex-wrap gap-2">
            <select id="merge-target" name="targetId" required defaultValue="" className="input min-w-0 flex-1">
              <option value="" disabled>
                Pick the original idea
              </option>
              {mergeTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.voteCount})
                </option>
              ))}
            </select>
            <button type="submit" className="btn-secondary" disabled={merging}>
              {merging ? "Merging…" : "Merge"}
            </button>
          </div>
          <FormStatus state={mergeState} />
        </form>
      )}
    </section>
  );
}
