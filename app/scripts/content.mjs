/* Pull published projects out of Supabase into src/content/projects.json.
   Runs in prebuild, ahead of thumbs.mjs.

   The point is that nothing downstream changes: this writes the same bare
   array the site has always imported, so src/data/projects.js, every page and
   the image pipeline carry on untouched. The site stays statically built —
   Supabase is consulted once at build time, never by a visitor's browser,
   which keeps the marketing pages fast and crawlable.

   Publishing in the console fires a Vercel deploy hook, which re-runs this. */

import { writeFile } from "node:fs/promises";

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const OUT = new URL("../src/content/projects.json", import.meta.url);

/* Everything the site can render. A column missing here is a field the
   console happily saves and the website never shows -- which is exactly what
   happened to specs and amenities. */
const COLUMNS = [
  "slug", "name", "locality", "status", "type", "configs", "config_label",
  "rera", "qr_url", "towers", "possession", "line", "img", "coords", "plans",
  "description", "price_band", "specs", "amenities", "videos", "model_url",
  "media", "progress"
].join(",");

/* The committed projects.json is the fallback. A build that cannot reach
   Supabase ships the last known content rather than failing the deploy or,
   worse, publishing an empty portfolio -- but it says so loudly, because
   silently shipping stale content is its own kind of bug. */
function keepExisting(why) {
  console.warn(`\n  content.mjs: ${why}`);
  console.warn("  Keeping the committed src/content/projects.json.\n");
  process.exit(0);
}

if (!SB_URL || !SB_KEY) keepExisting("VITE_SUPABASE_URL / _ANON_KEY not set.");

const res = await fetch(
  `${SB_URL}/rest/v1/projects?select=${COLUMNS}&published=eq.true&order=sort_order.asc`,
  { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
).catch((err) => keepExisting(`Supabase unreachable — ${err.message}`));

if (!res.ok) keepExisting(`Supabase returned ${res.status} — ${await res.text()}`);

const rows = await res.json();
if (!Array.isArray(rows)) keepExisting("Supabase returned something that is not a list.");

/* An empty list is an answer, not a failure. Treating it as one meant that
   drafting every project could never reach the site: the build would quietly
   keep the last file that had them all, and the console would look broken.
   The real failure modes -- no credentials, network error, non-2xx -- are
   caught above and still hold the last known content. */
if (rows.length === 0) {
  console.warn("\n  content.mjs: no published projects. Building an empty portfolio.\n");
}

/* Back to the site's camelCase, dropping nulls so the JSON stays as clean as
   the hand-written one it replaces. */
const projects = rows.map(({ config_label, model_url, price_band, qr_url, ...r }) => {
  const out = {
    ...r,
    configLabel: config_label,
    modelUrl: model_url,
    priceBand: price_band,
    qrUrl: qr_url
  };
  for (const [k, v] of Object.entries(out)) {
    if (v === null || v === undefined) delete out[k];
  }
  return out;
});

await writeFile(OUT, JSON.stringify(projects, null, 2) + "\n");
console.log(`  content.mjs: wrote ${projects.length} published projects`);
