"use client";

import { useActionState, useEffect, useRef } from "react";
import { addComment } from "@/app/ideas/actions";
import { FormStatus } from "@/components/form-status";

export function CommentForm({ ideaId }: { ideaId: string }) {
  const [state, action, pending] = useActionState(addComment, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-3 p-4">
      <input type="hidden" name="ideaId" value={ideaId} />
      <label htmlFor="comment-body" className="sr-only">
        Your comment
      </label>
      <textarea
        id="comment-body"
        name="body"
        required
        rows={3}
        maxLength={2000}
        placeholder="Add to the discussion"
        className="input resize-y"
      />
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Posting…" : "Comment"}
        </button>
        {state?.error && <FormStatus state={state} />}
      </div>
    </form>
  );
}
