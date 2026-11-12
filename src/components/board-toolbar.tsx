"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { STATUSES } from "@/lib/status";

type Props = {
  categories: { id: string; name: string }[];
};

const SORT_LABELS = { top: "Top", trending: "Trending", new: "New" } as const;

export function BoardToolbar({ categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sort = params.get("sort") ?? "top";
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  function hrefWith(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page"); // any filter change starts from page 1
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <nav aria-label="Sort ideas" className="flex shrink-0 rounded-lg border border-line bg-surface p-1">
        {(Object.keys(SORT_LABELS) as (keyof typeof SORT_LABELS)[]).map((key) => (
          <Link
            key={key}
            href={hrefWith({ sort: key === "top" ? null : key })}
            aria-current={sort === key ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              sort === key ? "bg-surface-2 font-medium text-text" : "text-muted hover:text-text"
            }`}
          >
            {SORT_LABELS[key]}
          </Link>
        ))}
      </nav>

      <form
        role="search"
        className="flex min-w-0 flex-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(hrefWith({ q: q.trim() || null }));
        }}
      >
        <label htmlFor="board-search" className="sr-only">
          Search ideas
        </label>
        <input
          id="board-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ideas"
          className="input min-w-0"
        />
      </form>

      <div className="flex gap-2">
        <label className="sr-only" htmlFor="filter-category">
          Category
        </label>
        <select
          id="filter-category"
          className="input w-auto"
          value={params.get("category") ?? ""}
          onChange={(e) => router.push(hrefWith({ category: e.target.value || null }))}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filter-status">
          Status
        </label>
        <select
          id="filter-status"
          className="input w-auto"
          value={params.get("status") ?? ""}
          onChange={(e) => router.push(hrefWith({ status: e.target.value || null }))}
        >
          <option value="">Open ideas</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
