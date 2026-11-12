// Fills the board with demo content for a fictional game, "Starfall Tactics".
//
//   node scripts/seed-demo.mjs           add demo content if it isn't there yet
//   node scripts/seed-demo.mjs --reset   remove the demo content, then add it fresh
//
// On Vercel it runs before each build only when DEMO_SEED=true, so real boards never get it.
// Demo players have ids starting with "demo-" and can't sign in. Anything posted by real
// people is never touched, apart from their votes and comments on demo ideas when resetting.
import postgres from "postgres";

const fromBuild = process.argv.includes("--if-enabled");
if (fromBuild && process.env.DEMO_SEED !== "true") process.exit(0);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const reset = process.argv.includes("--reset");
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d, hours = 0) => new Date(Date.now() - d * DAY - hours * 3600 * 1000);

// Deterministic pseudo-random numbers, so every reseed looks the same.
let seed = 20261112;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const PLAYERS = [
  "NovaFox", "Kestrel", "OrbitalOtter", "Vex", "LunaByte", "Captain Reyes", "Mirage", "Halcyon",
  "Pixel Pilot", "Thorne", "Quasar Kid", "Echo-7", "Saffron", "Drift", "Ironclad Ivy", "Comet Carl",
  "Zephyr", "Marlow", "Starling", "Nyx", "Bramble", "Torque", "Wren", "Atlas Main", "Juno",
  "Glitchwave", "Rook", "Solstice", "Tango Six", "Ember",
].map((name, i) => ({ id: `demo-${String(i + 1).padStart(2, "0")}`, name }));

const RELEASES = [
  { version: "v0.3", title: "Fleet Command", released: 34 },
  { version: "v0.4", title: "Nebula Drift", released: 9 },
];

// votes = how many demo players vote; release = version it shipped in.
const IDEAS = [
  { title: "Replay viewer for ranked matches", category: "Feature", status: "in_progress", votes: 27, days: 41,
    body: "Let us rewatch our ranked matches from any angle. Being able to scrub the timeline and see the enemy's moves would help so much with learning.",
    comments: [["Kestrel", "Yes please. Even a basic timeline scrubber would be huge."], ["dev", "This is in progress. First version will cover ranked 1v1, team modes after."], ["Vex", "Can we export clips from it?"]] },
  { title: "Controller support on PC", category: "Feature", status: "planned", votes: 23, days: 52,
    body: "I play on a couch with a TV. Full controller support with a radial command menu would make the PC version perfect.",
    comments: [["Captain Reyes", "Steam Deck players would love this too."], ["dev", "Planned for after the replay viewer. We're prototyping a radial menu now."]] },
  { title: "Cloud saves for the campaign", category: "Feature", status: "shipped", votes: 21, days: 63, release: "v0.3",
    body: "Switching between my desktop and laptop means losing campaign progress. Please sync saves.",
    comments: [["LunaByte", "Works perfectly, thank you!"]] },
  { title: "Railgun frigates are too strong in 2v2", category: "Balance", status: "in_progress", votes: 19, days: 12,
    body: "Two players stacking railgun frigates can delete a carrier before it launches fighters. Maybe a longer charge time or less damage against capital ships?",
    comments: [["Thorne", "Agree. Every top 2v2 team runs double railgun now."], ["Mirage", "Counter is to rush them with corvettes, but the timing window is tiny."], ["dev", "Looking at a 0.5s longer charge and 15% less damage vs capitals. Testing on the PTR this week."]] },
  { title: "Colourblind mode for team colours", category: "Quality of life", status: "shipped", votes: 18, days: 47, release: "v0.4",
    body: "Red vs green teams are really hard for me to tell apart. A colourblind palette or custom team colours would help.",
    comments: [["Wren", "Thank you for adding this, it makes such a difference."]] },
  { title: "Ships get stuck on asteroid fields when pathing", category: "Bug", status: "planned", votes: 16, days: 8,
    body: "Groups of more than 6 ships often get stuck on the edge of asteroid fields and stop moving until I reissue the order.",
    comments: [["Torque", "Happens to me on Kepler's Belt every game."], ["dev", "Reproduced. The fix is scheduled for the next patch."]] },
  { title: "Co-op campaign", category: "Feature", status: "under_review", votes: 15, days: 30,
    body: "Playing the campaign with a friend, each controlling half the fleet, would be amazing.",
    comments: [["Juno", "This would sell copies to everyone in my Discord."], ["Bramble", "Even just co-op skirmish vs AI would be great as a first step."]] },
  { title: "Hotkeys for selecting ship groups", category: "Quality of life", status: "shipped", votes: 14, days: 70, release: "v0.3",
    body: "Ctrl+number to save a group and number to select it, like most RTS games." },
  { title: "Map editor and workshop support", category: "Feature", status: "under_review", votes: 13, days: 21,
    body: "Let the community build maps and share them through Steam Workshop. It keeps games like this alive for years." },
  { title: "Show enemy fleet value on the scoreboard", category: "Quality of life", status: "under_review", votes: 11, days: 5,
    body: "Hard to judge whether to engage when you can't tell how strong the enemy fleet is. A fleet value number would help newer players." },
  { title: "Spectator mode for tournaments", category: "Feature", status: "planned", votes: 10, days: 26,
    body: "We're running a community league and would love an observer slot with both sides' vision.",
    comments: [["Atlas Main", "Our league has 40 players waiting for this!"], ["dev", "Planned. It shares a lot of code with the replay viewer, so it comes right after."]] },
  { title: "Crash when alt-tabbing during the loading screen", category: "Bug", status: "shipped", votes: 9, days: 38, release: "v0.4",
    body: "Game freezes and closes if I alt-tab while a map is loading. Windows 11, fullscreen mode." },
  { title: "Carrier fighters should auto-return when low on fuel", category: "Balance", status: "under_review", votes: 8, days: 3,
    body: "Losing whole fighter squadrons because they ran out of fuel mid-fight feels bad. An auto-return option would help." },
  { title: "Daily challenges with cosmetic rewards", category: "Feature", status: "under_review", votes: 7, days: 15,
    body: "Something to do each day: win with only corvettes, destroy 3 carriers, that kind of thing." },
  { title: "Larger 4v4 maps", category: "Feature", status: "under_review", votes: 6, days: 2,
    body: "The 4v4 maps feel crowded. Bigger maps with more expansion points would make team games more strategic." },
  { title: "Volume slider for unit voice lines", category: "Quality of life", status: "shipped", votes: 6, days: 55, release: "v0.4",
    body: "I like the music and effects but the voice lines get repetitive. A separate slider please." },
  { title: "Add an option to disable screen shake", category: "Quality of life", status: "under_review", votes: 5, days: 1,
    body: "Big explosions shake the screen a lot, which makes me a little motion sick." },
  { title: "Tooltip for shield regeneration shows the wrong value", category: "Bug", status: "planned", votes: 4, days: 6,
    body: "The tooltip says 12 per second but the shields clearly regenerate faster in game." },
  { title: "Battle royale mode", category: "Feature", status: "declined", votes: 4, days: 44,
    body: "100 fleets, shrinking nebula, last captain standing.",
    comments: [["dev", "Fun idea, but it doesn't fit the tactical pace we're going for. We'd rather focus on team modes and the campaign."]] },
  { title: "Nerf stealth corvettes", category: "Balance", status: "under_review", votes: 3, days: 0.4,
    body: "They're invisible until they fire and then retreat before you can respond. Detection range on scouts should be longer." },
];

async function removeDemo(tx) {
  const demoIdeas = tx`select id from ideas where author_id like 'demo-%'`;
  await tx`delete from status_events where idea_id in (${demoIdeas})`;
  await tx`delete from comments where idea_id in (${demoIdeas}) or author_id like 'demo-%'`;
  await tx`delete from votes where idea_id in (${demoIdeas})`;
  await tx`delete from ideas where author_id like 'demo-%'`;
  await tx`delete from users where id like 'demo-%'`;
  await tx`delete from releases where version in ${tx(RELEASES.map((r) => r.version))}
           and id not in (select release_id from ideas where release_id is not null)`;
  // Fix counters on real ideas that demo players voted on or commented on.
  await tx`update ideas set
             vote_count = (select count(*) from votes where votes.idea_id = ideas.id),
             comment_count = (select count(*) from comments where comments.idea_id = ideas.id)`;
}

async function addDemo(tx) {
  const [settings] = await tx`select id from settings where id = 1`;
  if (!settings) throw new Error("Finish board setup first; the demo needs a board to fill.");

  const categories = Object.fromEntries(
    (await tx`select id, name from categories`).map((c) => [c.name.toLowerCase(), c.id]),
  );
  const [owner] = await tx`select id from users where role = 'owner' limit 1`;

  await tx`insert into users ${tx(
    PLAYERS.map((p, i) => ({ id: p.id, name: p.name, role: "player", created_at: daysAgo(80 - i) })),
  )}`;
  const playerByName = Object.fromEntries(PLAYERS.map((p) => [p.name, p.id]));

  const releaseIds = {};
  for (const r of RELEASES) {
    const [row] = await tx`
      insert into releases (version, title, released_at) values (${r.version}, ${r.title}, ${daysAgo(r.released)})
      on conflict (version) do update set title = excluded.title
      returning id`;
    releaseIds[r.version] = row.id;
  }

  for (const [index, idea] of IDEAS.entries()) {
    const createdAt = daysAgo(idea.days, rand() * 10);
    const author = PLAYERS[(index * 7) % PLAYERS.length];

    // The author always votes; the rest are a shuffled sample of other demo players.
    const others = PLAYERS.filter((p) => p.id !== author.id).sort(() => rand() - 0.5);
    const voters = [author, ...others.slice(0, Math.min(idea.votes, PLAYERS.length) - 1)];

    const [row] = await tx`
      insert into ideas (title, body, category_id, author_id, status, vote_count, release_id, created_at, updated_at)
      values (${idea.title}, ${idea.body}, ${categories[idea.category.toLowerCase()] ?? null}, ${author.id},
              ${idea.status}, ${voters.length}, ${idea.release ? releaseIds[idea.release] : null},
              ${createdAt}, ${createdAt})
      returning id`;

    await tx`insert into votes ${tx(
      voters.map((v, i) => ({
        idea_id: row.id,
        user_id: v.id,
        created_at: new Date(createdAt.getTime() + i * ((Date.now() - createdAt.getTime()) / (voters.length + 1))),
      })),
    )}`;

    if (idea.status !== "under_review") {
      await tx`insert into status_events (idea_id, from_status, to_status, changed_by, created_at)
               values (${row.id}, 'under_review', ${idea.status}, ${owner?.id ?? null},
                       ${new Date(createdAt.getTime() + (Date.now() - createdAt.getTime()) / 2)})`;
    }

    const comments = (idea.comments ?? []).filter(([who]) => who !== "dev" || owner);
    for (const [i, [who, body]] of comments.entries()) {
      const at = new Date(createdAt.getTime() + ((i + 1) * (Date.now() - createdAt.getTime())) / (comments.length + 2));
      await tx`insert into comments (idea_id, author_id, body, created_at)
               values (${row.id}, ${who === "dev" ? owner.id : playerByName[who]}, ${body}, ${at})`;
    }
    await tx`update ideas set comment_count = ${comments.length} where id = ${row.id}`;
  }
}

try {
  await sql.begin(async (tx) => {
    const [{ seeded }] = await tx`select exists (select 1 from users where id like 'demo-%') as seeded`;
    if (seeded && !reset) {
      console.log("Demo content is already there; nothing to do. Use --reset to rebuild it.");
      return;
    }
    if (seeded) await removeDemo(tx);
    await addDemo(tx);
    console.log(`Demo content added: ${PLAYERS.length} players, ${IDEAS.length} ideas, ${RELEASES.length} releases.`);
  });
} catch (error) {
  console.error("Demo seed failed:", error.message);
  process.exitCode = fromBuild ? 0 : 1; // never block a deploy over demo content
} finally {
  await sql.end();
}
