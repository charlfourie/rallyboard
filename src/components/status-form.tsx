"use client";

import { useActionState, useState } from "react";
import { updateIdeaStatus } from "@/app/admin/moderation-actions";
import type { IdeaStatus } from "@/db/schema";
import { STATUSES } from "@/lib/status";
import { FormStatus } from "./form-status";

type Props = {
  ideaId: string;
  status: IdeaStatus;
  releaseId: string | null;
  releases: { id: string; version: string }[];
  compact?: boolean;
};

/** Status picker for moderators; shows a release picker once an idea is shipped. */
export function StatusForm({ ideaId, status, releaseId, releases, compact = false }: Props) {
  const [state, action, pending] = useActionState(updateIdeaStatus, undefined);
  const [selected, setSelected] = useState<IdeaStatus>(status);
  const [release, setRelease] = useState(releaseId ?? "");
  // Only offer Save once something actually differs from what's stored.
  const changed = selected !== status || (selected === "shipped" && release !== (releaseId ?? ""));

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="ideaId" value={ideaId} />
      <label className="sr-only" htmlFor={`status-${ideaId}`}>
        Status
      </label>
      <select
        id={`status-${ideaId}`}
        name="status"
        value={selected}
        onChange={(e) => setSelected(e.target.value as IdeaStatus)}
        className="input w-auto py-1.5"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {selected === "shipped" && (
        <>
          <label className="sr-only" htmlFor={`release-${ideaId}`}>
            Shipped in
          </label>
          <select
            id={`release-${ideaId}`}
            name="releaseId"
            value={release}
            onChange={(e) => setRelease(e.target.value)}
            className="input w-auto py-1.5"
          >
            <option value="">No version</option>
            {releases.map((r) => (
              <option key={r.id} value={r.id}>
                Shipped in {r.version}
              </option>
            ))}
          </select>
        </>
      )}
      <button type="submit" className={`btn-secondary ${compact ? "px-3 py-1.5" : ""}`} disabled={pending || !changed}>
        {pending ? "Saving…" : "Save"}
      </button>
      {(state?.error || !changed) && <FormStatus state={state} />}
    </form>
  );
}
