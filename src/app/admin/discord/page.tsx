import type { Metadata } from "next";
import { boardUrl, discordApi, discordConfig } from "@/lib/discord";
import { requireRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { ChannelForm, CopyField, RegisterButton, TestButton } from "./discord-forms";

export const metadata: Metadata = { title: "Discord" };

type Guild = { id: string; name: string };
type Channel = { id: string; name: string; type: number; position: number };

// View Channel + Send Messages + Embed Links
const BOT_PERMISSIONS = 1024 + 2048 + 16384;

/** Text channels the bot can see, grouped by server. Errors become a message instead. */
async function loadChannels() {
  try {
    const guilds = await discordApi<Guild[]>("/users/@me/guilds");
    const groups = await Promise.all(
      guilds.map(async (guild) => {
        const channels = await discordApi<Channel[]>(`/guilds/${guild.id}/channels`);
        return {
          guild,
          channels: channels
            .filter((c) => c.type === 0 || c.type === 5) // text and announcement channels
            .sort((a, b) => a.position - b.position)
            .map((c) => ({ id: c.id, name: c.name })),
        };
      }),
    );
    return { groups, error: null };
  } catch (error) {
    return { groups: [], error: error instanceof Error ? error.message : "Couldn't reach Discord." };
  }
}

/** Whether the /rally command exists on Discord. */
async function isRegistered(appId: string) {
  try {
    const commands = await discordApi<{ name: string }[]>(`/applications/${appId}/commands`);
    return commands.some((c) => c.name === "rally");
  } catch {
    return false;
  }
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <li className="card space-y-3 p-5">
      <h2 className="flex items-center gap-3 font-semibold">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
            done ? "bg-success/20 text-success" : "bg-surface-2 text-muted"
          }`}
        >
          {done ? "✓" : n}
        </span>
        {title}
      </h2>
      <div className="space-y-3 pl-10 text-sm text-muted">{children}</div>
    </li>
  );
}

export default async function DiscordPage() {
  await requireRole("owner");
  const { appId, publicKey, botToken } = discordConfig();
  const board = await getSettings();
  const base = await boardUrl();
  const keysReady = Boolean(appId && publicKey && botToken);
  const [{ groups, error }, registered] = keysReady
    ? await Promise.all([loadChannels(), isRegistered(appId)])
    : [{ groups: [], error: null }, false];
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot+applications.commands&permissions=${BOT_PERMISSIONS}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Discord</h1>
        <p className="text-sm text-muted">
          Let players use <code className="text-text">/rally</code> in your server, and post status updates to a channel.
        </p>
      </div>

      <ol className="space-y-4">
        <Step n={1} title="Add your Discord app's keys" done={keysReady}>
          <p>In your hosting environment variables, set these from the Discord Developer Portal, then redeploy:</p>
          <ul className="space-y-1">
            <li>
              <code className="text-text">AUTH_DISCORD_ID</code> · Application ID {appId ? "✓" : "(missing)"}
            </li>
            <li>
              <code className="text-text">DISCORD_PUBLIC_KEY</code> · General Information → Public Key{" "}
              {publicKey ? "✓" : "(missing)"}
            </li>
            <li>
              <code className="text-text">DISCORD_BOT_TOKEN</code> · Bot → Reset Token {botToken ? "✓" : "(missing)"}
            </li>
          </ul>
        </Step>

        <Step n={2} title="Point Discord at your board">
          <p>
            In the Developer Portal, open General Information and paste this into{" "}
            <span className="text-text">Interactions Endpoint URL</span>, then save. Discord checks it straight away.
          </p>
          <CopyField value={`${base}/api/discord/interactions`} />
        </Step>

        <Step n={3} title="Invite the bot to your server">
          {appId ? (
            <a href={inviteUrl} target="_blank" rel="noreferrer" className="btn-secondary w-fit">
              Invite to a server ↗
            </a>
          ) : (
            <p>Add the Application ID first.</p>
          )}
          <p>It only asks to read channels, send messages and add slash commands.</p>
        </Step>

        <Step n={4} title="Register the /rally command" done={registered}>
          {registered ? (
            <p className="text-success">/rally is registered. Run this again whenever you rename the game.</p>
          ) : (
            <p>Not registered yet. Click below, then reload Discord. Run this again whenever you rename the game.</p>
          )}
          <RegisterButton disabled={!keysReady} />
        </Step>

        <Step n={5} title="Pick a channel for status updates" done={Boolean(board?.discordChannelId)}>
          {!keysReady ? (
            <p>Finish step 1 first.</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : groups.length === 0 ? (
            <p>The bot isn&apos;t in any servers yet. Invite it in step 3, then refresh this page.</p>
          ) : (
            <>
              <p>When an idea becomes planned, in progress or shipped, Rallyboard posts it here.</p>
              <ChannelForm groups={groups} current={board?.discordChannelId ?? ""} />
              <TestButton disabled={!board?.discordChannelId} />
            </>
          )}
        </Step>
      </ol>
    </div>
  );
}
