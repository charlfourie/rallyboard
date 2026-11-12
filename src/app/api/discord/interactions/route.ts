// Discord sends every slash command, autocomplete, button press and form here.
// See https://discord.com/developers/docs/interactions/receiving-and-responding
import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories, ideas, releases, settings } from "@/db/schema";
import { loadActor, postIdea, toggleVoteFor, UserFacingError } from "@/lib/idea-writes";
import { accentInt, boardUrl, userForDiscord, verifyDiscordSignature } from "@/lib/discord";
import { statusInfo } from "@/lib/status";

export const dynamic = "force-dynamic";

// Interaction and response types from Discord's API.
const PING = 1, COMMAND = 2, COMPONENT = 3, AUTOCOMPLETE = 4, MODAL_SUBMIT = 5;
const PONG = 1, MESSAGE = 4, AUTOCOMPLETE_RESULT = 8, MODAL = 9;
const EPHEMERAL = 64;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Option = { name: string; type: number; value?: string; focused?: boolean; options?: Option[] };
type Interaction = {
  type: number;
  data?: {
    name?: string;
    options?: Option[];
    custom_id?: string;
    components?: unknown[];
  };
  member?: { user: DiscordUser };
  user?: DiscordUser;
};
type DiscordUser = { id: string; username: string; global_name?: string | null; avatar?: string | null };

const json = (body: unknown) => Response.json(body);
const reply = (content: string, extra: Record<string, unknown> = {}, ephemeral = true) =>
  json({ type: MESSAGE, data: { content, flags: ephemeral ? EPHEMERAL : 0, allowed_mentions: { parse: [] }, ...extra } });
const linkButton = (label: string, url: string) => ({ type: 1, components: [{ type: 2, style: 5, label, url }] });

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyDiscordSignature(body, request.headers.get("x-signature-ed25519"), request.headers.get("x-signature-timestamp"))) {
    return new Response("Bad request signature", { status: 401 });
  }

  const interaction = JSON.parse(body) as Interaction;
  if (interaction.type === PING) return json({ type: PONG });

  try {
    switch (interaction.type) {
      case AUTOCOMPLETE:
        return await handleAutocomplete(interaction);
      case COMMAND:
        return await handleCommand(interaction);
      case COMPONENT:
        return await handleComponent(interaction);
      case MODAL_SUBMIT:
        return await handleModal(interaction);
      default:
        return reply("That isn't supported yet.");
    }
  } catch (error) {
    if (error instanceof UserFacingError) return reply(error.message);
    console.error("Discord interaction failed:", error);
    return reply("Something went wrong on the board. Try again in a moment.");
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function subcommand(interaction: Interaction) {
  const sub = interaction.data?.options?.[0];
  const option = (name: string) => sub?.options?.find((o) => o.name === name);
  return { name: sub?.name, option };
}

function discordUser(interaction: Interaction) {
  const user = interaction.member?.user ?? interaction.user;
  if (!user) throw new UserFacingError("Couldn't tell who you are. Try again.");
  return user;
}

async function actorFor(interaction: Interaction) {
  const user = await userForDiscord(discordUser(interaction));
  return loadActor(user.id);
}

const visible = and(eq(ideas.hidden, false), isNull(ideas.mergedIntoId));

/** Ideas matching what the player typed: an id picked from autocomplete, or free text. */
async function findIdea(input: string | undefined) {
  const text = (input ?? "").trim();
  if (!text) return null;
  if (UUID.test(text)) {
    const [row] = await db.select().from(ideas).where(and(eq(ideas.id, text), visible));
    if (row) return row;
  }
  const [best] = await db
    .select()
    .from(ideas)
    .where(and(visible, or(ilike(ideas.title, `%${text.replace(/[\\%_]/g, "\\$&")}%`), sql`word_similarity(${text}, ${ideas.title}) > 0.35`)))
    .orderBy(desc(sql`word_similarity(${text}, ${ideas.title})`), desc(ideas.voteCount))
    .limit(1);
  return best ?? null;
}

async function boardSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (!row) throw new UserFacingError("This board isn't set up yet.");
  return row;
}

function refreshBoard(ideaId?: string) {
  revalidatePath("/", "layout");
  if (ideaId) revalidatePath(`/ideas/${ideaId}`);
}

/* ------------------------------------------------------------------ */
/* Autocomplete                                                       */
/* ------------------------------------------------------------------ */

async function handleAutocomplete(interaction: Interaction) {
  const focused = interaction.data?.options?.[0]?.options?.find((o) => o.focused);
  const text = String(focused?.value ?? "").trim();

  if (focused?.name === "category") {
    const rows = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder));
    const choices = rows
      .filter((c) => c.name.toLowerCase().includes(text.toLowerCase()))
      .slice(0, 25)
      .map((c) => ({ name: c.name, value: c.id }));
    return json({ type: AUTOCOMPLETE_RESULT, data: { choices } });
  }

  const rows = await db
    .select({ id: ideas.id, title: ideas.title, voteCount: ideas.voteCount })
    .from(ideas)
    .where(
      text
        ? and(visible, or(ilike(ideas.title, `%${text.replace(/[\\%_]/g, "\\$&")}%`), sql`word_similarity(${text}, ${ideas.title}) > 0.35`))
        : and(visible, ne(ideas.status, "declined")),
    )
    .orderBy(text ? desc(sql`word_similarity(${text}, ${ideas.title})`) : desc(ideas.voteCount), desc(ideas.voteCount))
    .limit(25);
  const choices = rows.map((r) => {
    const suffix = ` (${r.voteCount})`;
    return { name: r.title.slice(0, 100 - suffix.length) + suffix, value: r.id };
  });
  return json({ type: AUTOCOMPLETE_RESULT, data: { choices } });
}

/* ------------------------------------------------------------------ */
/* Slash commands                                                     */
/* ------------------------------------------------------------------ */

async function handleCommand(interaction: Interaction) {
  const { name, option } = subcommand(interaction);
  const config = await boardSettings();
  const base = await boardUrl();

  if (name === "suggest") {
    const categoryId = String(option("category")?.value ?? "");
    return json({
      type: MODAL,
      data: {
        custom_id: `suggest:${UUID.test(categoryId) ? categoryId : ""}`,
        title: `Suggest an idea for ${config.gameName}`.slice(0, 45),
        components: [
          {
            type: 1,
            components: [
              { type: 4, custom_id: "title", label: "Title", style: 1, min_length: 5, max_length: 120, required: true, placeholder: "Add a replay viewer for ranked matches" },
            ],
          },
          {
            type: 1,
            components: [
              { type: 4, custom_id: "details", label: "Details (optional)", style: 2, max_length: 4000, required: false, placeholder: "What should it do, and why would it make the game better?" },
            ],
          },
        ],
      },
    });
  }

  if (name === "vote") {
    const idea = await findIdea(option("idea")?.value);
    if (!idea) return reply("I couldn't find that idea. Start typing and pick one from the list.");
    const actor = await actorFor(interaction);
    const result = await toggleVoteFor(actor, idea.id);
    refreshBoard(idea.id);
    return reply(
      result.voted
        ? `✅ You voted for **${result.title}**. It now has ${result.voteCount} ${result.voteCount === 1 ? "vote" : "votes"}.`
        : `↩️ Removed your vote from **${result.title}** (${result.voteCount} ${result.voteCount === 1 ? "vote" : "votes"}).`,
      { components: [linkButton("Open on the board", `${base}/ideas/${idea.id}`)] },
    );
  }

  if (name === "top") {
    const top = await db
      .select({ id: ideas.id, title: ideas.title, voteCount: ideas.voteCount, status: ideas.status })
      .from(ideas)
      .where(and(visible, sql`${ideas.status} in ('under_review', 'planned', 'in_progress')`))
      .orderBy(desc(ideas.voteCount), desc(ideas.createdAt))
      .limit(5);
    if (top.length === 0) return reply("No ideas yet. Be the first with `/rally suggest`.", {}, false);

    const lines = top.map(
      (idea, i) =>
        `**${i + 1}. [${idea.title}](${base}/ideas/${idea.id})**\n${idea.voteCount} ${idea.voteCount === 1 ? "vote" : "votes"} · ${statusInfo(idea.status).label}`,
    );
    return reply(
      "",
      {
        embeds: [
          {
            title: `Most wanted in ${config.gameName}`,
            url: base,
            description: lines.join("\n\n").slice(0, 4000),
            color: accentInt(config.accentColor),
            footer: { text: "Vote with the buttons, or /rally vote" },
          },
        ],
        components: [
          {
            type: 1,
            components: top.map((idea, i) => ({ type: 2, style: 2, label: `Vote #${i + 1}`, custom_id: `vote:${idea.id}` })),
          },
          linkButton("See the full board", base),
        ],
      },
      false,
    );
  }

  if (name === "status") {
    const idea = await findIdea(option("idea")?.value);
    if (!idea) return reply("I couldn't find that idea. Start typing and pick one from the list.");
    const [release] = idea.releaseId
      ? await db.select({ version: releases.version }).from(releases).where(eq(releases.id, idea.releaseId))
      : [];
    const info = statusInfo(idea.status);
    return reply(
      "",
      {
        embeds: [
          {
            title: idea.title.slice(0, 256),
            url: `${base}/ideas/${idea.id}`,
            description: idea.body ? idea.body.slice(0, 300) + (idea.body.length > 300 ? "…" : "") : undefined,
            color: accentInt(info.color),
            fields: [
              { name: "Status", value: release ? `${info.label} in ${release.version}` : info.label, inline: true },
              { name: "Votes", value: String(idea.voteCount), inline: true },
              { name: "Comments", value: String(idea.commentCount), inline: true },
            ],
          },
        ],
        components: [
          {
            type: 1,
            components: [
              { type: 2, style: 1, label: "Vote", custom_id: `vote:${idea.id}` },
              { type: 2, style: 5, label: "Open on the board", url: `${base}/ideas/${idea.id}` },
            ],
          },
        ],
      },
      false,
    );
  }

  return reply("Unknown command. Try `/rally top`.");
}

/* ------------------------------------------------------------------ */
/* Buttons                                                            */
/* ------------------------------------------------------------------ */

async function handleComponent(interaction: Interaction) {
  const [kind, ideaId] = (interaction.data?.custom_id ?? "").split(":");
  if (kind !== "vote" || !UUID.test(ideaId ?? "")) return reply("That button has expired.");

  const actor = await actorFor(interaction);
  const result = await toggleVoteFor(actor, ideaId);
  refreshBoard(ideaId);
  return reply(
    result.voted
      ? `✅ You voted for **${result.title}** (${result.voteCount} ${result.voteCount === 1 ? "vote" : "votes"}). Press again to remove it.`
      : `↩️ Removed your vote from **${result.title}** (${result.voteCount} ${result.voteCount === 1 ? "vote" : "votes"}).`,
  );
}

/* ------------------------------------------------------------------ */
/* The /rally suggest form                                            */
/* ------------------------------------------------------------------ */

/** Text input values, whichever layout Discord used for the modal. */
function modalValues(components: unknown[] = []) {
  const values: Record<string, string> = {};
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { custom_id?: string; value?: unknown; components?: unknown[]; component?: unknown };
    if (n.custom_id && typeof n.value === "string") values[n.custom_id] = n.value;
    n.components?.forEach(walk);
    if (n.component) walk(n.component);
  };
  components.forEach(walk);
  return values;
}

async function handleModal(interaction: Interaction) {
  const [kind, categoryId = ""] = (interaction.data?.custom_id ?? "").split(":");
  if (kind !== "suggest") return reply("That form has expired.");

  const values = modalValues(interaction.data?.components);
  const actor = await actorFor(interaction);
  const ideaId = await postIdea(actor, {
    title: values.title ?? "",
    body: values.details ?? "",
    categoryId: UUID.test(categoryId) ? categoryId : "",
  });
  refreshBoard(ideaId);

  const base = await boardUrl();
  return reply(`💡 Posted **${(values.title ?? "").trim()}** to the board, with your vote. Share it so others can rally behind it!`, {
    components: [linkButton("Open your idea", `${base}/ideas/${ideaId}`)],
  });
}
