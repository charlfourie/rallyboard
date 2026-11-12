import { redirect } from "next/navigation";
import { GameMark } from "@/components/game-mark";
import { getCategories, getSettings } from "@/lib/settings";

export default async function BoardPage() {
  const settings = await getSettings();
  if (!settings) redirect("/setup");
  const categories = await getCategories();

  return (
    <div className="space-y-8">
      <section className="flex items-center gap-4">
        <GameMark name={settings.gameName} logoUrl={settings.logoUrl} size={56} />
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{settings.gameName}</h1>
          <p className="text-muted">
            {settings.tagline ?? "Suggest ideas and vote on what gets built next."}
          </p>
        </div>
      </section>

      {categories.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Categories">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: category.color }} />
              {category.name}
            </li>
          ))}
        </ul>
      )}

      <section className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
        <h2 className="text-lg font-semibold">The board is getting ready</h2>
        <p className="max-w-md text-sm text-muted">
          Posting and voting on ideas open soon. Sign in now with Discord so you&apos;re ready to
          rally behind your favourite ideas.
        </p>
      </section>
    </div>
  );
}
