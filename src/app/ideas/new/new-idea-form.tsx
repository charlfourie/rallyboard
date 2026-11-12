"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createIdea } from "@/app/ideas/actions";
import { FormStatus } from "@/components/form-status";
import type { IdeaStatus } from "@/db/schema";
import { statusInfo } from "@/lib/status";

type Similar = { id: string; title: string; status: IdeaStatus; voteCount: number };

export function NewIdeaForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createIdea, undefined);
  const [title, setTitle] = useState("");
  const [similar, setSimilar] = useState<Similar[]>([]);

  // Look for existing ideas with similar titles while the player types.
  useEffect(() => {
    const text = title.trim();
    if (text.length < 4) {
      setSimilar([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ideas/similar?q=${encodeURIComponent(text)}`, {
          signal: controller.signal,
        });
        if (res.ok) setSimilar((await res.json()).ideas);
      } catch {
        // Aborted or offline: hints are optional.
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [title]);

  return (
    <form action={action} className="card space-y-5 p-6">
      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={5}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a replay viewer for ranked matches"
          className="input"
          autoComplete="off"
        />
      </div>

      {similar.length > 0 && (
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <p className="text-sm font-medium">Already suggested? Vote on it instead</p>
          <ul className="mt-2 space-y-1.5">
            {similar.map((idea) => (
              <li key={idea.id} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/ideas/${idea.id}`} target="_blank" className="truncate hover:text-accent">
                  {idea.title}
                </Link>
                <span className="shrink-0 text-xs text-muted">
                  {idea.voteCount} {idea.voteCount === 1 ? "vote" : "votes"} · {statusInfo(idea.status).label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="label" htmlFor="body">
          Details <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={6}
          maxLength={5000}
          placeholder="What should it do, and why would it make the game better?"
          className="input resize-y"
        />
      </div>

      {categories.length > 0 && (
        <div>
          <label className="label" htmlFor="categoryId">
            Category
          </label>
          <select id="categoryId" name="categoryId" className="input w-auto" defaultValue="">
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <FormStatus state={state} />
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Posting…" : "Post idea"}
        </button>
        <Link href="/" className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
