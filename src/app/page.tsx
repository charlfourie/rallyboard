import Link from "next/link";
import { redirect } from "next/navigation";
import { BoardToolbar } from "@/components/board-toolbar";
import { GameMark } from "@/components/game-mark";
import { IdeaRow } from "@/components/idea-row";
import { listIdeas, SORTS, type Sort } from "@/lib/ideas";
import { getCurrentUser } from "@/lib/session";
import { getCategories, getSettings } from "@/lib/settings";
import { isStatus } from "@/lib/status";

type SearchParams = { sort?: string; category?: string; status?: string; q?: string; page?: string };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function BoardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const settings = await getSettings();
  if (!settings) redirect("/setup");

  const params = await searchParams;
  const sort: Sort = SORTS.includes(params.sort as Sort) ? (params.sort as Sort) : "top";
  const page = Math.max(1, Math.min(1000, Number.parseInt(params.page ?? "1", 10) || 1));
  const filters = {
    sort,
    page,
    categoryId: params.category && UUID.test(params.category) ? params.category : undefined,
    status: isStatus(params.status) ? params.status : undefined,
    q: params.q?.slice(0, 100),
  };

  const [user, categories] = await Promise.all([getCurrentUser(), getCategories()]);
  const { ideas, hasMore } = await listIdeas(filters, user?.id);
  const filtered = Boolean(filters.categoryId || filters.status || filters.q);

  const pageHref = (n: number) => {
    const next = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    if (n > 1) next.set("page", String(n));
    else next.delete("page");
    return `/?${next}`;
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-4">
        {/* The header already shows the logo and name on phones, so keep the hero lean there. */}
        <span className="hidden sm:block">
          <GameMark name={settings.gameName} logoUrl={settings.logoUrl} size={56} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="sr-only text-2xl font-bold sm:not-sr-only sm:text-3xl">{settings.gameName}</h1>
          <p className="text-muted">
            {settings.tagline ?? "Suggest ideas and vote on what gets built next."}
          </p>
        </div>
        <Link href="/ideas/new" className="btn-primary w-full sm:w-auto">
          Suggest an idea
        </Link>
      </section>

      <BoardToolbar categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

      {ideas.length === 0 ? (
        <section className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          {filtered ? (
            <>
              <h2 className="text-lg font-semibold">No ideas match</h2>
              <p className="text-sm text-muted">Try another search or filter.</p>
              <Link href="/" className="btn-secondary mt-2">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Start the first rally</h2>
              <p className="max-w-md text-sm text-muted">
                No ideas yet. Suggest something you&apos;d love to see in {settings.gameName}.
              </p>
              <Link href="/ideas/new" className="btn-primary mt-2">
                Suggest an idea
              </Link>
            </>
          )}
        </section>
      ) : (
        <ul className="card divide-y divide-line">
          {ideas.map((idea) => (
            <IdeaRow key={idea.id} idea={idea} signedIn={Boolean(user)} />
          ))}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        <nav aria-label="Pages" className="flex justify-between">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn-secondary">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link href={pageHref(page + 1)} className="btn-secondary">
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
