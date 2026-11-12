"use client";

import { useActionState, useEffect, useRef } from "react";
import { createRelease, updateRelease } from "@/app/admin/moderation-actions";
import { FormStatus } from "@/components/form-status";

type Release = { id: string; version: string; title: string; releasedAt: string };

/** Adds a release, or edits one when `release` is given. */
export function ReleaseForm({ release }: { release?: Release }) {
  const [state, action, pending] = useActionState(release ? updateRelease : createRelease, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const prefix = release ? `r-${release.id}` : "new-release";

  useEffect(() => {
    if (!release && state?.success) formRef.current?.reset();
  }, [state, release]);

  return (
    <form ref={formRef} action={action} className={release ? "space-y-2" : "card space-y-3 p-5"}>
      {!release && <h2 className="font-semibold">Add a release</h2>}
      {release && <input type="hidden" name="id" value={release.id} />}
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-28">
          <label className={release ? "sr-only" : "label"} htmlFor={`${prefix}-version`}>
            Version
          </label>
          <input
            id={`${prefix}-version`}
            name="version"
            required
            maxLength={30}
            defaultValue={release?.version}
            placeholder="v0.5"
            className="input"
          />
        </div>
        <div className="min-w-40 flex-1">
          <label className={release ? "sr-only" : "label"} htmlFor={`${prefix}-title`}>
            Name <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={`${prefix}-title`}
            name="title"
            maxLength={80}
            defaultValue={release?.title}
            placeholder="Winter update"
            className="input"
          />
        </div>
        <div>
          <label className={release ? "sr-only" : "label"} htmlFor={`${prefix}-date`}>
            Release date
          </label>
          <input
            id={`${prefix}-date`}
            name="releasedAt"
            type="date"
            defaultValue={release?.releasedAt}
            className="input w-auto"
          />
        </div>
        <button type="submit" className={release ? "btn-secondary" : "btn-primary"} disabled={pending}>
          {pending ? "Saving…" : release ? "Save" : "Add release"}
        </button>
      </div>
      <FormStatus state={state} />
    </form>
  );
}
