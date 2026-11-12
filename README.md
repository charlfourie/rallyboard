# Rallyboard

**A free, open-source feedback and roadmap board for indie game developers, with Discord built in.**

Players suggest ideas and vote on what you build next, on the web or straight from your Discord server. You triage, plan and ship, and everyone who voted sees it land.

- **Unlimited players and votes.** No tracked-user limits, no per-seat pricing.
- **Discord-first.** Players sign in with Discord; slash commands are on the way.
- **Fewer duplicates.** Similar ideas are suggested while players type, and moderators can merge the rest.
- **Close the loop.** A public roadmap and release notes show players what their votes changed.
- **Your game's brand.** Your name, logo and accent colour throughout.
- **Self-host in minutes** on Vercel or any server with Docker.

> **Status: early development.** Posting, voting, moderation, the public roadmap and releases all work. Discord commands are next. See the [roadmap](#roadmap).

---

## Quick start: Vercel (easiest)

You need a GitHub account, a free [Vercel](https://vercel.com) account and a [Discord application](#set-up-discord-sign-in).

1. **Fork or import this repo** into Vercel: *Add New → Project → Import* `charlfourie/rallyboard`.
2. **Add a database.** In the new project, open *Storage* and connect a **Neon** Postgres database (the free plan is plenty). This sets `DATABASE_URL` for you.
3. **Add a Blob store** for logo uploads: *Storage → Blob*. This sets `BLOB_READ_WRITE_TOKEN`.
4. **Add environment variables** under *Settings → Environment Variables*:

   | Name | Value |
   | --- | --- |
   | `AUTH_SECRET` | A random string. Run `npx auth secret` or use any password generator (32+ characters). |
   | `AUTH_DISCORD_ID` | Your Discord application's Client ID |
   | `AUTH_DISCORD_SECRET` | Your Discord application's Client Secret |

5. **Deploy.** Database migrations run automatically during each build.
6. **Claim your board straight away:** open the site, sign in, and you become the owner. (To lock ownership to you in advance, set `OWNER_DISCORD_ID` or `OWNER_EMAIL` before deploying.)

## Quick start: Docker (any server)

```bash
git clone https://github.com/charlfourie/rallyboard.git
cd rallyboard
cp .env.example .env      # then fill in AUTH_SECRET, AUTH_URL and the Discord values
docker compose up -d
```

The board runs on port 3000 with its own Postgres database. Put it behind a reverse proxy (Caddy, Nginx, Traefik) for HTTPS, and set `AUTH_URL` to the public address, for example `https://feedback.yourgame.com`.

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

### Optional: email sign-in

For players without Discord, set `EMAIL_SERVER` (an SMTP URL such as `smtp://user:pass@smtp.example.com:587`) and `EMAIL_FROM`. Players then get a one-time sign-in link by email. Leave these empty to offer Discord only.

## Use your own domain

**On Vercel:** *Project → Settings → Domains → Add*, then create the DNS records Vercel shows at your domain registrar (usually an `A` record for the root domain and a `CNAME` for `www` or a subdomain). Add the new address to your Discord redirects too.

**With Docker:** point an `A` record at your server, configure your reverse proxy for that domain, and update `AUTH_URL` and the Discord redirect.

Then enter the domain under *Admin → Settings* so links and Discord messages use it.

## Configuration

All settings live in environment variables; see [`.env.example`](.env.example) for the full list with comments.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string (use the pooled URL for Neon or Supabase) |
| `AUTH_SECRET` | Yes | Signs sessions |
| `AUTH_URL` | Docker / local | Public URL of the board (Vercel detects it) |
| `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` | Yes | Discord sign-in |
| `OWNER_DISCORD_ID`, `OWNER_EMAIL` | No | Who becomes owner; otherwise the first person to sign in |
| `EMAIL_SERVER`, `EMAIL_FROM` | No | Email magic-link sign-in |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob for logos; otherwise saved to `./data/uploads` |

## Local development

Requires Node.js 20+ and a Postgres database (local, or a free Neon project).

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET and the Discord values
npm run db:migrate
npm run dev
```

Open http://localhost:3000. To fill a board with sample content for a fictional game, run `npm run db:seed-demo` (add `-- --reset` to rebuild it). Demo players can't sign in, and real posts are left alone. On Vercel, setting `DEMO_SEED=true` runs this before each build.

After changing `src/db/schema.ts`, run `npm run db:generate` to create a migration, then `npm run db:migrate`.

**Stack:** Next.js (App Router) · TypeScript · Postgres with Drizzle ORM · Auth.js · Tailwind CSS.

## Roadmap

1. **Foundation** ✅ setup, Discord and email sign-in, branding, categories
2. **Board** ✅ post ideas, vote, comment, filter and search, similar-idea hints
3. **Admin and roadmap** ✅ moderation inbox, statuses with history, merging duplicates, hide, lock and ban, moderators, public roadmap and releases
4. **Discord:** `/rally suggest`, `/rally vote`, `/rally top`, status announcements
5. **Packaging:** public demo, one-click deploy, screenshots

Ideas and bug reports are welcome in [Issues](https://github.com/charlfourie/rallyboard/issues).

## Licence

Rallyboard is free software under the [GNU Affero General Public License v3.0](LICENSE). You can use, modify and self-host it, including for commercial games. If you offer a modified version to others as a hosted service, you must publish your changes under the same licence.

For a commercial or white-label licence without these terms, contact the author.

© 2026 Charl Fourie
