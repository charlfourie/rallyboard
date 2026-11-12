import type { Metadata } from "next";
import { setBanned, setRole } from "@/app/admin/moderation-actions";
import { Avatar } from "@/components/badges";
import { listBanned, listTeam, searchPlayers } from "@/lib/admin";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireRole("owner");
  const { q = "" } = await searchParams;
  const [team, banned, results] = await Promise.all([listTeam(), listBanned(), searchPlayers(q.slice(0, 80))]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-sm text-muted">
          Moderators can review ideas, change statuses, merge duplicates, hide posts and ban players. Only you can
          change settings, categories and the team.
        </p>
      </div>

      <section className="space-y-3" aria-labelledby="team-heading">
        <h2 id="team-heading" className="font-semibold">
          Your team
        </h2>
        <ul className="card divide-y divide-line">
          {team.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 p-4">
              <Avatar name={member.name} image={member.image} size={32} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {member.name ?? member.email ?? "Unnamed"} {member.id === me.id && <span className="text-muted">(you)</span>}
                </p>
                <p className="text-xs text-muted">{member.role === "owner" ? "Owner" : "Moderator"}</p>
              </div>
              {member.role === "moderator" && (
                <form action={setRole}>
                  <input type="hidden" name="userId" value={member.id} />
                  <input type="hidden" name="role" value="player" />
                  <button className="btn-ghost px-3 py-1.5 hover:text-danger">Remove moderator</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="add-heading">
        <h2 id="add-heading" className="font-semibold">
          Add a moderator
        </h2>
        <p className="text-sm text-muted">
          Ask them to sign in to the board once, then find them here by name or email.
        </p>
        <form className="flex gap-2" role="search">
          <label htmlFor="player-search" className="sr-only">
            Find a player
          </label>
          <input id="player-search" name="q" defaultValue={q} placeholder="Name or email" className="input" />
          <button type="submit" className="btn-secondary">
            Search
          </button>
        </form>
        {q.trim().length >= 2 &&
          (results.length === 0 ? (
            <p className="text-sm text-muted">No players match &ldquo;{q}&rdquo;.</p>
          ) : (
            <ul className="card divide-y divide-line">
              {results.map((player) => (
                <li key={player.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar name={player.name} image={player.image} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{player.name ?? "Unnamed"}</p>
                    {player.email && <p className="text-xs text-muted">{player.email}</p>}
                  </div>
                  <form action={setRole}>
                    <input type="hidden" name="userId" value={player.id} />
                    <input type="hidden" name="role" value="moderator" />
                    <button className="btn-secondary px-3 py-1.5">Make moderator</button>
                  </form>
                </li>
              ))}
            </ul>
          ))}
      </section>

      <section className="space-y-3" aria-labelledby="banned-heading">
        <h2 id="banned-heading" className="font-semibold">
          Banned players
        </h2>
        {banned.length === 0 ? (
          <p className="text-sm text-muted">No one is banned. Ban a player from any of their ideas.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {banned.map((player) => (
              <li key={player.id} className="flex items-center gap-3 p-4">
                <Avatar name={player.name} image={player.image} size={32} />
                <span className="flex-1 font-medium">{player.name ?? "Unnamed"}</span>
                <form action={setBanned}>
                  <input type="hidden" name="userId" value={player.id} />
                  <input type="hidden" name="value" value="false" />
                  <button className="btn-secondary px-3 py-1.5">Unban</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
