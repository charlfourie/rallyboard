# Rallyboard

**A free, open-source feedback and roadmap board for indie game developers, with Discord built in.**

Players suggest ideas and vote on what you build next, on the web or straight from your Discord server. You triage, plan and ship, and everyone who voted sees it land.

**[Live demo → rallyboard.space](https://rallyboard.space)**, a board for *Starfall Tactics*, a fictional space-tactics game with a demo community. Sign in and try anything; the demo resets every night.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcharlfourie%2Frallyboard&project-name=rallyboard&repository-name=rallyboard&env=AUTH_SECRET%2CAUTH_DISCORD_ID%2CAUTH_DISCORD_SECRET%2COWNER_DISCORD_ID&envDescription=A%20random%20session%20secret%2C%20your%20Discord%20application%27s%20Client%20ID%20and%20Secret%2C%20and%20your%20own%20Discord%20user%20ID%20so%20only%20you%20can%20claim%20the%20board.&envLink=https%3A%2F%2Fgithub.com%2Fcharlfourie%2Frallyboard%23deploy-to-vercel&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%2C%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22public%22%7D%5D)

![The Starfall Tactics board: ideas ranked by votes, with statuses, categories and comment counts](docs/screenshots/board.png)

- **Unlimited players and votes.** No tracked-user limits, no per-seat pricing.
- **Discord-first.** Players sign in with Discord, and can suggest and vote with `/rally` without leaving your server.
- **Fewer duplicates.** Similar ideas are suggested while players type, and moderators can merge the rest.
- **Close the loop.** A public roadmap, release notes and Discord announcements show players what their votes changed.
- **Your game's brand.** Your name, logo and accent colour throughout.
- **Self-host in minutes** on Vercel or any server with Docker.

> **Status: beta.** Everything described here works and is running at [rallyboard.space](https://rallyboard.space). Feedback and bug reports are welcome in [Issues](https://github.com/charlfourie/rallyboard/issues).

## Contents

- [How it works](#how-it-works)
- [Features](#features)
- [Deploy to Vercel](#deploy-to-vercel)
- [Quick start: Docker](#quick-start-docker-any-server)
- [Set up Discord](#set-up-discord-sign-in)
- [Use your own domain](#use-your-own-domain)
- [Configuration](#configuration)
- [Local development](#local-development)
- [How it's built](#how-its-built)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Licence](#licence)

---

## How it works

**For players**

1. They open your board (or type `/rally` in your Discord) and sign in with Discord.
2. They suggest an idea. While they type the title, Rallyboard shows similar ideas that already exist, so they can vote for those instead of posting duplicates.
3. They vote for the ideas they want most, and discuss them in the comments.
4. When you plan, start or ship an idea, it moves across the public roadmap, shows up in the release notes, and is announced in your Discord.

**For you and your team**

1. New ideas land in the **Inbox**, where you set a status in one click.
2. Duplicates get merged: voters are combined (no one counts twice), comments move across, and the old link redirects.
3. When something ships, pick the release it shipped in. It appears on the public Releases page and is announced in Discord.

![An idea page with its vote count, status, description and the players who voted for it](docs/screenshots/idea.png)

## Features

### The board

| Feature | Details |
| --- | --- |
| Ideas | Title, details and category. The author's vote counts from the start. |
| Voting | One vote per player, toggled instantly. Counts stay exact under heavy clicking. |
| Sorting | **Top** (most votes), **Trending** (most votes in the last 7 days) and **New** |
| Filters and search | Filter by category and status; search tolerates typos ("controler" finds "Controller support") |
| Similar-idea hints | Matching ideas appear while a player types a new title |
| Comments | Discussion on every idea; your team's replies are tagged **Dev team** |
| Roadmap | Public Planned, In progress and Recently shipped columns |
| Releases | A public timeline of versions and the player ideas that shipped in each |
| Branding | Game name, tagline, logo, accent colour and custom domain |
| Fair use | Rate limits on posting and commenting; banned players are stopped everywhere |

### Moderation

![The Inbox: new ideas with inline status controls](docs/screenshots/inbox.png)

| Tool | What it does |
| --- | --- |
| Inbox | Needs review, All ideas and Hidden views, with status changes in the list |
| Statuses | Under review → Planned → In progress → Shipped (or Declined), with a full history per idea |
| Merge duplicates | Combines voters without double counting, moves comments, and redirects the duplicate |
| Hide and lock | Hide an idea from the board, or close voting and comments |
| Ban | Bans a player and signs them out everywhere, including Discord |
| Releases | Add versions with a name and date; future dates stay private until release day |

![The moderation panel on an idea: status, lock, hide, ban and merge](docs/screenshots/moderation.png)

### Roles

| | Player | Moderator | Owner |
| --- | :---: | :---: | :---: |
| Post, vote and comment | ✓ | ✓ | ✓ |
| Delete own comments | ✓ | ✓ | ✓ |
| Inbox, statuses, merge, hide, lock | | ✓ | ✓ |
| Ban players, manage releases, delete any comment | | ✓ | ✓ |
| Settings, branding, categories | | | ✓ |
| Add and remove moderators, Discord setup | | | ✓ |

### Discord

| Command | What it does |
| --- | --- |
| `/rally suggest` | Opens a form in Discord and posts the idea to the board |
| `/rally vote` | Votes for an idea (or removes the vote), with typo-tolerant search as you type |
| `/rally top` | Posts the five most wanted ideas, with vote buttons anyone can press |
| `/rally status` | Shows where an idea stands, including the release it shipped in |

When an idea becomes **Planned**, **In progress** or **Shipped**, Rallyboard posts it to the channel you choose. Players who use `/rally` before visiting the website get a board account automatically, and signing in with Discord later uses that same account.

---

## Deploy to Vercel

The quickest way: free Vercel and Neon plans are enough.

1. **Create a [Discord application](#set-up-discord-sign-in)** first, so you have its Client ID and Client Secret to hand.
2. **Click the button:**

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcharlfourie%2Frallyboard&project-name=rallyboard&repository-name=rallyboard&env=AUTH_SECRET%2CAUTH_DISCORD_ID%2CAUTH_DISCORD_SECRET%2COWNER_DISCORD_ID&envDescription=A%20random%20session%20secret%2C%20your%20Discord%20application%27s%20Client%20ID%20and%20Secret%2C%20and%20your%20own%20Discord%20user%20ID%20so%20only%20you%20can%20claim%20the%20board.&envLink=https%3A%2F%2Fgithub.com%2Fcharlfourie%2Frallyboard%23deploy-to-vercel&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%2C%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22public%22%7D%5D)

   Vercel copies the repo to your GitHub account, creates a **Neon** Postgres database and a **Blob** store for logos, and asks for:

   | Name | Value |
   | --- | --- |
   | `AUTH_SECRET` | A random string of 32+ characters. Run `npx auth secret` or use a password generator. |
   | `AUTH_DISCORD_ID` | Your Discord application's Client ID |
   | `AUTH_DISCORD_SECRET` | Your Discord application's Client Secret |
   | `OWNER_DISCORD_ID` | Your Discord user ID, so only you can claim the board ([how to find it](#set-up-discord-sign-in)) |

3. **Add the redirect in Discord.** Once deployed, add `https://<your project>.vercel.app/api/auth/callback/discord` under *OAuth2 → Redirects*.
4. **Claim your board:** open the site, sign in with Discord, and fill in your game's name. Then upload a logo under *Admin → Settings*.

Database migrations run automatically on every deploy, and updates arrive when you sync your fork on GitHub.

<details>
<summary>Setting it up by hand instead</summary>

1. Import `charlfourie/rallyboard` (or your fork) in Vercel: *Add New → Project → Import*.
2. Under *Storage*, connect a **Neon** database (sets `DATABASE_URL`) and a **Blob** store (sets `BLOB_READ_WRITE_TOKEN`).
3. Add the four variables from the table above under *Settings → Environment Variables*, marking `AUTH_DISCORD_SECRET` as **Sensitive**.
4. Deploy, then follow steps 3 and 4 above.

</details>

## Quick start: Docker (any server)

```bash
git clone https://github.com/charlfourie/rallyboard.git
cd rallyboard
cp .env.example .env      # then fill in AUTH_SECRET, AUTH_URL and the Discord values
docker compose up -d
```

The board runs on port 3000 with its own Postgres database (set `PORT` in `.env` to use another port). Put it behind a reverse proxy (Caddy, Nginx, Traefik) for HTTPS, and set `AUTH_URL` to the public address, for example `https://feedback.yourgame.com`.

Logos are stored in the `uploads` volume and the database in `pgdata`, so both survive upgrades.

**Upgrading:** `git pull && docker compose up -d --build`. Migrations run when the container starts.

## Set up Discord sign-in

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**. Name it after your game.
2. Open **OAuth2**. Copy the **Client ID** and **Client Secret** (reset it if it's hidden) into `AUTH_DISCORD_ID` and `AUTH_DISCORD_SECRET`.
3. Under **Redirects**, add your board's URL followed by `/api/auth/callback/discord`:
   - `https://your-board.vercel.app/api/auth/callback/discord`
   - and, for local development, `http://localhost:3000/api/auth/callback/discord`
4. Save. Discord sign-in now works.

Players are asked only for their Discord username, avatar and email.

To find your own Discord user ID for `OWNER_DISCORD_ID`: in Discord, open *User Settings → Advanced*, turn on **Developer Mode**, then right-click your name and choose **Copy User ID**.

### Optional: `/rally` commands and announcements

1. In the Developer Portal, copy **General Information → Public Key** into `DISCORD_PUBLIC_KEY`.
2. Open **Bot**, click **Reset Token**, and put the token in `DISCORD_BOT_TOKEN`. Keep it secret.
3. Redeploy, then open **Admin → Discord** on your board. It walks you through the rest:
   1. Paste the **Interactions Endpoint URL** it shows into *General Information* in the portal, and save. Discord checks it immediately.
   2. **Invite the bot** to your server. It asks only to read channels, send messages and add slash commands.
   3. Click **Register /rally**. The command can take a minute to appear.
   4. **Pick a channel** for status updates and send a test message.

Run **Register /rally** again whenever you rename your game, so the command description stays current.

### Optional: email sign-in

For players without Discord, set `EMAIL_SERVER` (an SMTP URL such as `smtp://user:pass@smtp.example.com:587`) and `EMAIL_FROM`. Players then get a one-time sign-in link by email. Leave these empty to offer Discord only.

## Use your own domain

**On Vercel:** *Project → Settings → Domains → Add*, then create the DNS records Vercel shows at your domain registrar (usually an `A` record for the root domain and a `CNAME` for `www` or a subdomain). Add the new address to your Discord redirects too.

**With Docker:** point an `A` record at your server, configure your reverse proxy for that domain, and update `AUTH_URL` and the Discord redirect.

Then enter the domain under *Admin → Settings* so links in Discord messages use it.

## Configuration

All settings live in environment variables; see [`.env.example`](.env.example) for the full list with comments.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string (use the pooled URL for Neon or Supabase) |
| `AUTH_SECRET` | Yes | Signs sessions |
| `AUTH_URL` | Docker / local | Public URL of the board (Vercel detects it) |
| `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` | Yes | Discord sign-in |
| `OWNER_DISCORD_ID`, `OWNER_EMAIL` | No | Who becomes owner; otherwise the first person to sign in |
| `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN` | No | `/rally` commands and status announcements |
| `EMAIL_SERVER`, `EMAIL_FROM` | No | Email magic-link sign-in |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob for logos; otherwise saved to `./data/uploads` |
| `DEMO_SEED` | No | `true` makes this a demo site: demo content is added on each build and the board is wiped and refilled nightly |
| `CRON_SECRET` | Demo only | Protects the nightly reset; Vercel sends it automatically. Any random string. |

## Local development

Requires Node.js 20+ and a Postgres database (local, or a free Neon project).

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET and the Discord values
npm run db:migrate
npm run dev
```

Open http://localhost:3000.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server |
| `npm run lint` | Type-checks the project |
| `npm run db:generate` | Creates a migration after you change `src/db/schema.ts` |
| `npm run db:migrate` | Applies pending migrations |
| `npm run db:seed-demo` | Fills the board with Starfall Tactics demo content (add `-- --reset` to rebuild it) |

Demo players can't sign in, and the seed never touches posts made by real people.

## How it's built

**Stack:** Next.js (App Router) · TypeScript · Postgres with Drizzle ORM · Auth.js · Tailwind CSS. Search and similar-idea hints use Postgres trigram matching (`pg_trgm`).

```
src/
  app/                      Pages and server actions
    page.tsx                The board
    ideas/                  New idea form, idea pages, posting/voting/comment actions
    roadmap/, releases/     Public roadmap and release notes
    admin/                  Inbox, releases, team, Discord, categories, settings
    api/discord/            Discord interactions endpoint (/rally commands, buttons, forms)
    api/ideas/similar/      Similar-idea lookup used while typing a title
  lib/
    idea-writes.ts          Posting and voting rules shared by the website and Discord
    ideas.ts, admin.ts      Database queries for public and admin pages
    discord.ts              Request signatures, Discord API calls, accounts, announcements
  db/schema.ts              Database tables
drizzle/                    SQL migrations
scripts/                    Migration runner and demo seed
```

**A few design choices worth knowing**

- **Counts are stored, not computed.** Vote and comment counts live on each idea and change in the same transaction as the vote or comment, so the board stays fast. Votes lock the idea's row, so rapid clicks can't drift the count.
- **Discord runs serverless.** Slash commands arrive as signed HTTP requests (no always-on bot process), so it works on Vercel's free plan. Every request's Ed25519 signature is checked, and requests older than five minutes are refused.
- **Announcements never block your work.** They're sent after the page responds. If Discord is unreachable, the status still saves and the announcement retries on the next change. Only changes from the last day are sent, so connecting Discord later doesn't flood the channel with history.
- **The demo resets itself.** On a site with `DEMO_SEED=true`, a Vercel Cron job calls `/api/cron/reset-demo` at midnight UTC, clears everything visitors posted and restores *Starfall Tactics*. On every other board the job does nothing.
- **One account per player.** A player who votes in Discord first gets an account linked to their Discord identity, so signing in on the website later uses the same account.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Sign-in isn't set up correctly on this board" after Discord | Check that the redirect in the Discord portal exactly matches `https://<your board>/api/auth/callback/discord`, and that `AUTH_DISCORD_SECRET` is set for Production. |
| Discord says the Interactions Endpoint URL couldn't be verified | `DISCORD_PUBLIC_KEY` is missing or wrong, or you haven't redeployed since adding it. |
| `/rally` doesn't appear in Discord | Invite the bot with the link on *Admin → Discord*, click **Register /rally**, and give Discord a minute. Restarting the Discord app also helps. |
| No channels to pick on *Admin → Discord* | The bot isn't in a server yet, or `DISCORD_BOT_TOKEN` is missing. Invite it, then refresh the page. |
| Status changes aren't announced | Only Planned, In progress and Shipped are announced. Check the bot can post in that channel by sending a test message. |
| Someone else became the owner | Set `OWNER_DISCORD_ID` before anyone signs in to prevent this. To fix it afterwards, change the `role` column in the `users` table (`owner` for you, `player` for them). |

## Roadmap

1. **Foundation** ✅ setup, Discord and email sign-in, branding, categories
2. **Board** ✅ post ideas, vote, comment, filter and search, similar-idea hints
3. **Admin and roadmap** ✅ moderation inbox, statuses with history, merging duplicates, hide, lock and ban, moderators, public roadmap and releases
4. **Discord** ✅ `/rally suggest`, `/rally vote`, `/rally top`, `/rally status`, status announcements
5. **Packaging** ✅ one-click Deploy to Vercel, nightly demo reset, tested Docker setup

Ideas and bug reports are welcome in [Issues](https://github.com/charlfourie/rallyboard/issues).

## Licence

Rallyboard is free software under the [GNU Affero General Public License v3.0](LICENSE). You can use, modify and self-host it, including for commercial games. If you offer a modified version to others as a hosted service, you must publish your changes under the same licence.

For a commercial or white-label licence without these terms, contact the author.

© 2026 Charl Fourie
