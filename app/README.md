# Marc Construction — React + Vite

```bash
npm ci
npm run dev      # http://localhost:5173
npm run build    # -> dist/  (prebuild regenerates the resized images first)
npm run thumbs   # regenerate resized images on their own
```

Deploys to Netlify from `netlify.toml` at the repo root — base `app`, publish
`dist`, Node 22 pinned so a platform default can't break the build.

## Why multi-page, not an SPA

`vite.config.js` declares five HTML entries. Each route is a real document, so
each page is independently crawlable — which is the whole point for a developer's
marketing site. It also means **no router dependency**: every `react-router`
version currently in range carries high-severity advisories, and dropping it
took the audit from 2 high to **0 vulnerabilities**.

Navigation between pages is a plain `<a href>`, so it's a full document load.
That is deliberate.

```
index.html      → src/entries/index.jsx   → src/pages/Home.jsx
projects.html   → …/projects.jsx          → src/pages/Projects.jsx
project.html    → …/project.jsx           → src/pages/ProjectDetail.jsx   (?p=<slug>)
about.html      → …/about.jsx             → src/pages/About.jsx
contact.html    → …/contact.jsx           → src/pages/Contact.jsx
```

## DriftWall

`src/components/DriftWall.jsx` is the React Bits component. It drives the
masthead, fed with every project — each drifting tile links to its own page.

Two changes from upstream, both commented in the file:

1. A `loading` prop (default `"lazy"`, matching upstream). Tiles live inside a
   3D-transformed, masked plane where the browser's lazy-load intersection
   heuristics never fire, so tiles could sit permanently unloaded. Home passes
   `loading="eager"`.
2. External-link attributes dropped from tile anchors, since these link to
   internal project pages.

## Images

`npm run thumbs` (sharp, devDependency — never ships) writes two resized WebP
sets beside the originals:

| Set | Width | Used by |
| --- | --- | --- |
| `assets/thumbs/` | 420px | masthead wall tiles |
| `assets/cards/` | 900px | project cards, inline figures, gallery, video posters |
| *(originals)* | full | detail hero, lightbox, floor-plan sheets |

Pick a size with the helpers in `src/lib/img.js` — never reference a full-size
render for a small slot. The masthead alone pulled **28.6 MB** before this; all
32 thumbnails together are 630 KB.

`prebuild` runs this on every build, local and on Netlify, so an image added
through the CMS is resized without anyone running anything. `npm run thumbs`
alone is only for regenerating them without a full build.

## Owner console

`/console.html` — projects, enquiries and media, behind Supabase Auth. A sixth
Vite entry in its own chunk, so a visitor to the marketing site downloads none
of it. Source lives in `src/console/`.

It replaced Decap CMS, which was removed. Decap is git-based, and once project
content moved into Postgres the two would have fought: Decap writing
`src/content/projects.json` while `scripts/content.mjs` overwrites that same
file from Supabase on every build. Silent data loss, so Decap had to go rather
than sit alongside.

| Screen | What it does |
| --- | --- |
| Dashboard | Counts, latest enquiries, activity feed, and what is blocking a project from going live |
| Projects | Table with drag-to-reorder, live/draft switch per row, enquiry counts |
| Project editor | Details / Media / Specifications / Compliance tabs, drag-drop upload with progress, cover picker |
| Enquiries | Status workflow, search, month filter, Call and WhatsApp, CSV export |

**Publishing rebuilds the site.** Saving writes to Supabase; publishing — and
the Live switch on the projects table — also POSTs to `/api/publish`, which
fires the Vercel deploy hook and so re-runs `content.mjs`. Without the hook
configured the console says so plainly instead of claiming the website updated.

The hook URL lives in **`VERCEL_DEPLOY_HOOK`, with no `VITE_` prefix**. That
prefix means "inline into the browser bundle", which is how the URL ended up
readable by anyone who opened the console's JavaScript — and a deploy hook
needs no authentication, so it could be POSTed in a loop until the build quota
was gone. `/api/publish` keeps it server-side and checks the caller is on the
staff list first.

Vercel injects environment variables at deploy time, not per request, so
changing that value takes effect on the *next* deployment.

Access is the `staff` table — `is_staff()` reads from it and every policy in
`supabase/console.sql` reads from `is_staff()`. Add a colleague with one
INSERT; there is no sign-up.

Two rules the database enforces rather than the UI, because a UI can be worked
around: a published project must carry a MahaRERA value, and an enquiry's
status must be one of the five the console offers. The QR code is *not* yet in
that constraint — see the comment in `console.sql` for why, and the one line
to add once every project has one.

The rule the field hints repeat: **MahaRERA values read exactly as the
authority has them.** `"To confirm"` and `"—"` are real states. Never invent a
number.

## Data

Content lives as JSON in `src/content/` so the CMS can write it back.
`src/data/projects.js` is only the doorway the pages import from — add a field
to the JSON and to `admin/config.yml`, not to that module.

- `coords` come from the client's own Google Maps links. Abhiram has none — no
  link was supplied — so its map falls back to a locality view. Never guess one.
- MahaRERA values read exactly as supplied. `"To confirm"` and `"—"` are real
  states, not placeholders to invent numbers for.
- `plans` exist for the five projects with brochures. The sheets are whole-floor
  drawings with their area tables printed on them, which is why carpet areas are
  not retyped anywhere.

## Enquiries

The contact form inserts into a Supabase `enquiries` table over plain `fetch`
— PostgREST is HTTP, and one insert does not justify a client library. Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`) locally
and in Vercel. Run `supabase/enquiries.sql` once in the SQL editor.

The anon key ships in the browser on purpose. Row-level security is what
protects the table: insert-only for `anon`, no read policy at all, so nobody
can pull other people's phone numbers back out. The `pattern` attribute on the
phone input is a convenience — the CHECK constraints in that SQL are the
validation that actually holds, since a crafted request never touches the form.

If it fails, the form says so and shows the phone and WhatsApp links rather
than pretending it sent.

Staff read the list at **`/enquiries.html`** — a sixth entry in
`vite.config.js`, signed in with Supabase Auth over the same plain `fetch`.
It is not linked from anywhere on the site and is noindexed twice, in the page
and in `vercel.json`.

The read policy grants `select` to `authenticated`, meaning *any* signed-in
user. So the security of this page rests entirely on **public sign-ups being
disabled** in Supabase (Authentication → Sign In / Providers → Email). Leave
them on and anyone can register an account and read every customer's phone
number. Add staff by hand under Authentication → Users.

## Not wired

| What | Where |
| --- | --- |
| CMS login | Needs a Git repo + Netlify Identity/Git Gateway enabled (see Admin above) |
| All-sites map | `ProjectDetail.jsx` — set `MY_MAP_ID` from a Google My Map (import `../marc-sites.csv`) |
| 3D model, plan/brochure/RERA downloads | buttons are inert |
| Leadership portraits, 2 of 3 testimonial photos | placeholders |

`npm audit` is clean; keep it that way — check before adding a dependency.
