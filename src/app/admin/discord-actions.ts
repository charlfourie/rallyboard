"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { accentInt, boardUrl, discordApi, discordConfig } from "@/lib/discord";
import { errorMessage, type FormState } from "@/lib/form";
import { assertRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const ideaOption = (description: string) => ({
  type: 3,
  name: "idea",
  description,
  required: true,
  autocomplete: true,
});

/** The /rally command and its subcommands, as Discord expects them. */
async function commandDefinition() {
  const board = await getSettings();
  const game = board?.gameName ?? "the game";
  return [
    {
      name: "rally",
      description: `Suggest and vote on ideas for ${game}`.slice(0, 100),
      contexts: [0], // servers only
      options: [
        {
          type: 1,
          name: "suggest",
          description: "Suggest a new idea",
          options: [
            { type: 3, name: "category", description: "What kind of idea is it?", required: false, autocomplete: true },
          ],
        },
        { type: 1, name: "vote", description: "Vote for an idea, or remove your vote", options: [ideaOption("Start typing to find the idea")] },
        { type: 1, name: "top", description: "Show the most wanted ideas" },
        { type: 1, name: "status", description: "Check where an idea stands", options: [ideaOption("Start typing to find the idea")] },
      ],
    },
  ];
}

/** Registers (or updates) the /rally command for every server the bot is in. */
export async function registerCommands(): Promise<FormState> {
  try {
    await assertRole("owner");
    const { appId } = discordConfig();
    if (!appId) return { error: "AUTH_DISCORD_ID isn't set." };
    await discordApi(`/applications/${appId}/commands`, {
      method: "PUT",
      body: JSON.stringify(await commandDefinition()),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  return { success: "Commands registered. They can take a minute to appear in Discord." };
}

export async function saveChannel(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertRole("owner");
    const raw = String(formData.get("channelId") ?? "");
    const channelId = raw ? z.string().regex(/^\d{5,25}$/, "Pick a channel.").parse(raw) : null;
    await db.update(settings).set({ discordChannelId: channelId, updatedAt: new Date() }).where(eq(settings.id, 1));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/discord");
  return { success: "Saved" };
}

export async function sendTestMessage(): Promise<FormState> {
  try {
    await assertRole("owner");
    const board = await getSettings();
    if (!board?.discordChannelId) return { error: "Pick an announcement channel first." };
    await discordApi(`/channels/${board.discordChannelId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        embeds: [
          {
            title: `${board.gameName} is connected to Rallyboard`,
            url: await boardUrl(),
            description:
              "Status updates will appear here when ideas are planned, in progress or shipped. Try `/rally top` to see what players want most.",
            color: accentInt(board.accentColor),
          },
        ],
      }),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  return { success: "Test message sent" };
}
