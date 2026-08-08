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
each page is independently crawlable — which is the whole point for a builder's
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

## Admin (Decap CMS)

The admin panel is **Decap CMS**, served at `/admin/`. It is git-based: every
save is a commit to this repo, so content keeps full history, no API keys ship
to the browser, and the static build is untouched. No database, no server, and
no hand-rolled authentication.

Auth is **Netlify Identity via Git Gateway** — no OAuth app to register, no
client secret in the repo. `netlify.toml` and the Identity wiring are already in
place; what remains needs your accounts:

1. **Put the code in a Git repo.** Git Gateway commits on the editor's behalf,
   so there must be a repo to commit to. This folder is not one yet.
2. **Create the Netlify site** from that repo. `netlify.toml` already sets
   base `app`, publish `dist`, and Node 22.
3. **Enable Identity, then Git Gateway** in Site settings → Identity.
4. **Set registration to invite-only** and invite the Marc staff by email.
   Leaving it open lets anyone sign up and edit the site.
5. Confirm the repo's default branch is `main`, or change `branch` in
   `public/admin/config.yml`.

Until step 3, `/admin/` shows the login screen but cannot authenticate.

`publish_mode: editorial_workflow` is on, so an edit becomes a pull request with
a Publish step rather than committing straight to live.

Collections map to the JSON in `src/content/`: Projects, Testimonials, About —
the story, Walkthrough videos, and Contact & legal.

Editors upload images straight through the CMS — `prebuild` regenerates every
resized version on each deploy, so there is nothing for them to run.

The one rule the field hints repeat: **MahaRERA values read exactly as the
authority has them.** `"To confirm"` and `"—"` are real states. Never invent a
number.

In `npm run dev`, Vite's HTML fallback swallows the bare `/admin/` path — use
`/admin/index.html`. The production build serves `/admin/` correctly.

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

## Not wired

| What | Where |
| --- | --- |
| CMS login | Needs a Git repo + Netlify Identity/Git Gateway enabled (see Admin above) |
| Enquiry form submission | `Contact.jsx` — shows the designed success state, sends nothing |
| All-sites map | `ProjectDetail.jsx` — set `MY_MAP_ID` from a Google My Map (import `../marc-sites.csv`) |
| 3D model, plan/brochure/RERA downloads | buttons are inert |
| Leadership portraits, 2 of 3 testimonial photos | placeholders |

`npm audit` is clean; keep it that way — check before adding a dependency.
