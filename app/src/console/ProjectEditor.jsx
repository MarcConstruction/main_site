import { useEffect, useRef, useState } from "react";
import { db, upload, logActivity, triggerRebuild } from "./api.js";
import { Back, Alert, Up, Box, Play, Doc, Pic } from "./Icons.jsx";
import { suggestNearby } from "./nearby.js";
import { DEFAULT_SPECS, DEFAULT_AMENITIES } from "../lib/defaults.js";

const TABS = ["Details", "Media", "Specifications", "Compliance"];
/* Starting suggestions only — the field is free text and the list below is
   merged with whatever is already in use. */
const SEED_LOCALITIES = ["Ahilyanagar", "Savedi", "Nalegaon", "Bhistabag", "Tarakpur", "Borude Mala"];
const STATUSES = ["Ongoing", "Completed", "Upcoming"];
const TYPES = ["Residential", "Commercial", "Mixed-Use"];
const CONFIGS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Shop", "Office"];
/* Offered when a project has no stages yet, so the shape is right and only
   the wording needs attention. */
const STANDARD_STAGES = [
  { stage: "Excavation & footing", state: "Complete" },
  { stage: "Slab work", state: "In progress" },
  { stage: "Blockwork & plaster", state: "" },
  { stage: "Finishing & handover", state: "" }
];

/* specs stays a single text column: the site already parses "Label: value"
   per line, so editing it as rows here needs no migration and no second
   source of truth. */
const parseSpecRows = (text) =>
  String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(":");
      return at > 0
        ? { k: line.slice(0, at).trim(), v: line.slice(at + 1).trim() }
        : { k: "", v: line };
    });

const serialiseSpecs = (rows) =>
  rows
    .filter((r) => r.k.trim() || r.v.trim())
    .map((r) => (r.k.trim() ? `${r.k.trim()}: ${r.v.trim()}` : r.v.trim()))
    .join("\n");

const BLANK = {
  slug: "", name: "", locality: "", status: "Ongoing", type: "Residential",
  configs: [], config_label: "", rera: "", qr_url: "", towers: "", possession: "",
  line: "", img: "", coords: "", description: "", price_band: "", specs: "", carpet: "", rera_applicable: true,
  amenities: [], plans: [], media: [], videos: [], progress: [], nearby: [], models: [], model_url: "", published: false
};

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Same parser the site uses, so what previews here is what plays there. */
const youtubeId = (url) =>
  String(url || "").match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  )?.[1] ?? null;
const iconFor = (n) => /\.glb$/i.test(n) ? <Box /> : /\.(mp4|mov)$/i.test(n) ? <Play /> : <Doc />;

export default function ProjectEditor({ id, onBack, onChanged }) {
  const [p, setP] = useState(id === "new" ? BLANK : null);
  const [tab, setTab] = useState("Details");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [queue, setQueue] = useState([]);      // in-flight uploads
  const [over, setOver] = useState(false);
  const [localities, setLocalities] = useState(SEED_LOCALITIES);
  const [planBusy, setPlanBusy] = useState(-1);
  const [newAmenity, setNewAmenity] = useState("");
  const [nearbyBusy, setNearbyBusy] = useState(false);
  const [specRows, setSpecRows] = useState(() => parseSpecRows(BLANK.specs));
  const fileRef = useRef(null);

  useEffect(() => {
    if (id === "new") return;
    db(`projects?id=eq.${id}&select=*`)
      .then((r) => { setP(r[0] ?? null); setSpecRows(parseSpecRows(r[0]?.specs)); })
      .catch((e) => setError(e.message));
  }, [id]);

  /* Suggestions come from what is already in use, so the list grows as Marc
     names new places instead of needing an edit here. */
  useEffect(() => {
    db("projects?select=locality")
      .then((rows) => setLocalities(
        [...new Set([...SEED_LOCALITIES, ...rows.map((r) => r.locality)].filter(Boolean))].sort()
      ))
      .catch(() => {});
  }, []);

  if (error && !p) return <div className="view"><p className="err">{error}</p></div>;
  if (!p) return <div className="view"><p className="spinner">Loading…</p></div>;

  const set = (patch) => setP((cur) => ({ ...cur, ...patch }));
  const toggleIn = (key, value) =>
    set({ [key]: p[key].includes(value) ? p[key].filter((v) => v !== value) : [...p[key], value] });

  /* Rows are held in state, not derived from p.specs on each render.
     Deriving looked tidier but made "+ Add a specification" impossible: an
     empty row serialises to nothing, so the text came back unchanged and the
     new row never appeared. Text cannot represent a row you have not typed
     into yet. Serialised on save instead. */
  const writeSpecs = setSpecRows;

  /* Whatever has been chosen appears among the offered chips, so a custom
     amenity is not invisible the next time this project is opened. */
  const amenityChoices = [...new Set([...DEFAULT_AMENITIES, ...(p.amenities || [])])];
  const addAmenity = () => {
    const a = newAmenity.trim();
    if (!a) return;
    if (!p.amenities.includes(a)) set({ amenities: [...p.amenities, a] });
    setNewAmenity("");
  };

  /* The two things MahaRERA requires on a listing. Publish stays disabled
     until both are present — the database enforces the number, this also
     watches the QR image the law asks for. */
  const pending = p.rera_applicable === false ? [] : [
    !p.rera?.trim() && "MahaRERA registration number",
    !p.qr_url?.trim() && "MahaRERA QR code image"
  ].filter(Boolean);

  const save = async ({ publish } = {}) => {
    setSaving(true); setError(""); setNote("");
    /* People paste whatever Google Maps handed them: "19.12, 74.74" with a
       space, or the whole URL. Pull the first two numbers out and rebuild the
       pair, rather than rejecting a paste that plainly contains the answer.
       An untouched field is "", which must become null -- the column takes
       null or "lat,lng" and nothing in between. */
    /* locality is NOT NULL in the database, and "" satisfies that while
       rendering as a gap on the site. Catch it here with a sentence rather
       than shipping a project labelled with nothing. */
    if (!p.locality.trim()) {
      setError("Give the project a locality or road — it appears on the card, the detail page and the map.");
      setSaving(false);
      return;
    }

    const found = String(p.coords || "").match(/-?\d+(?:\.\d+)?/g);
    const coords = found && found.length >= 2 ? `${found[0]},${found[1]}` : null;
    if (p.coords?.trim() && !coords) {
      setError("Could not read a latitude and longitude from that. Paste the pair Google Maps copies, like 19.1223267, 74.7473039 — or leave it empty rather than guessing.");
      setSaving(false);
      return;
    }
    /* Drop rows that were added and never filled in, then insist on https:
       the browser blocks a plain http tour as mixed content and the panel
       renders blank with the reason only in its console. */
    const models = (p.models || [])
      .map((m) => ({ label: (m.label || "").trim(), url: (m.url || "").trim() }))
      .filter((m) => m.url);
    const badModel = models.find((m) => !/^https:\/\//.test(m.url));
    if (badModel) {
      setError(`The 3D tour link${badModel.label ? ` for ${badModel.label}` : ""} must start with https:// — an http one is blocked by the browser as mixed content and the panel would just be blank.`);
      setSaving(false);
      return;
    }

    const body = {
      ...p,
      coords,
      models,
      /* Keeps the old single-tour column consistent with the first tour, so
         its https CHECK still holds and a deploy landing before the migration
         still has something to show. */
      model_url: models[0]?.url ?? null,
      videos: (p.videos || []).filter((vd) => vd.url?.trim()),
      specs: serialiseSpecs(specRows),
      slug: p.slug || slugify(p.name),
      published: publish ?? p.published
    };
    delete body.id; delete body.created_at; delete body.updated_at;

    try {
      const saved = id === "new"
        ? await db("projects", { method: "POST", body })
        : await db(`projects?id=eq.${id}`, { method: "PATCH", body });
      const row = Array.isArray(saved) ? saved[0] : saved;
      setP(row);
      logActivity(`${row.name} ${publish ? "published" : "saved as draft"}`);
      onChanged?.();

      if (publish) {
        const r = await triggerRebuild();
        setNote(r.ok
          ? "Published. The website is rebuilding — give it about a minute."
          : `Published in the console, but the website was not rebuilt (${r.reason}). It will update on the next deploy.`);
      } else {
        setNote("Draft saved.");
      }
      if (id === "new") onBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const take = async (files) => {
    for (const file of [...files]) {
      const item = { name: file.name, size: file.size, pct: 0 };
      setQueue((q) => [...q, item]);
      try {
        const url = await upload(file, (pct) =>
          setQueue((q) => q.map((i) => (i.name === file.name ? { ...i, pct } : i))));
        const isImage = /^image\//.test(file.type);
        set({
          media: [...(p.media || []), { name: file.name, url, kind: isImage ? "image" : "file" }],
          img: p.img || (isImage ? url : p.img)
        });
        setQueue((q) => q.map((i) => (i.name === file.name ? { ...i, pct: 100, done: true } : i)));
      } catch (e) {
        setError(e.message);
        setQueue((q) => q.filter((i) => i.name !== file.name));
      }
    }
  };

  const images = (p.media || []).filter((m) => m.kind === "image");

  return (
    <>
      <div className="topbar">
        <button className="btn btn-icon" onClick={onBack} aria-label="Back to projects"><Back /></button>
        <div className="grow">
          <span className="mono">
            {id === "new" ? "New project" : `Editing · ${p.published ? "Published" : "Draft"}`}
          </span>
          <h1>{p.name || "Untitled project"}</h1>
        </div>
        {/* Only published projects exist on the site, so a draft has nothing
            to preview — offering the link would just 404. */}
        {p.slug && p.published && (
          <a className="btn" target="_blank" rel="noopener noreferrer" href={`/project.html?p=${p.slug}`}>Preview</a>
        )}
        <button className="btn" onClick={() => save()} disabled={saving}>
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button className="btn btn-primary" onClick={() => save({ publish: true })}
          disabled={saving || pending.length > 0 || !p.name.trim()}
          title={pending.length ? `Pending: ${pending.join(", ")}` : ""}>
          Publish to website
        </button>
      </div>

      {pending.length > 0 && (
        <div className="banner">
          <Alert />
          <div>
            <h3>This project cannot be published yet</h3>
            <p>MahaRERA law requires the registration number and the official QR code on every
              listing. Fill both in the Compliance tab to enable Publish.</p>
          </div>
          <span className="pill new">{pending.length} item{pending.length > 1 ? "s" : ""} pending</span>
        </div>
      )}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="view">
        {error && <p className="err" role="alert">{error}</p>}
        {note && <p className="ok" role="status">{note}</p>}

        {/* Two columns only where there is a second column to show. */}
        <div className={tab === "Media" ? "edit-cols" : undefined}>
          <div>
            {tab === "Details" && (
              <>
                <span className="mono legend">Basic details</span>
                <div className="field">
                  <label htmlFor="f-name">Project name</label>
                  <input className="input" id="f-name" value={p.name}
                    onChange={(e) => set({ name: e.target.value })} />
                </div>
                <div className="pair">
                  <div className="field">
                    <label htmlFor="f-loc">Locality or road</label>
                    {/* Free text with suggestions, not a fixed list. Marc knows
                        the city better than any list I could write, and a new
                        pocket or a road name should not need a code change.
                        The public filter reads its options from the content
                        for the same reason. */}
                    <input className="input" id="f-loc" list="known-localities"
                      value={p.locality} placeholder="Savedi, or Nagar–Manmad Road"
                      onChange={(e) => set({ locality: e.target.value })} />
                    <datalist id="known-localities">
                      {localities.map((l) => <option key={l} value={l} />)}
                    </datalist>
                  </div>
                  <div className="field">
                    <label htmlFor="f-type">Type</label>
                    <select className="input" id="f-type" value={p.type}
                      onChange={(e) => set({ type: e.target.value })}>
                      {TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Configurations</label>
                  <div className="chips">
                    {CONFIGS.map((c) => (
                      <button key={c} aria-pressed={p.configs.includes(c)}
                        onClick={() => toggleIn("configs", c)}>{c}</button>
                    ))}
                  </div>
                </div>

                <div className="pair">
                  <div className="field">
                    <label htmlFor="f-status">Status</label>
                    <select className="input" id="f-status" value={p.status}
                      onChange={(e) => set({ status: e.target.value })}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="f-poss">Possession</label>
                    <input className="input" id="f-poss" value={p.possession || ""}
                      placeholder="Dec 2028" onChange={(e) => set({ possession: e.target.value })} />
                  </div>
                </div>

                <div className="pair">
                  <div className="field">
                    <label htmlFor="f-cfg">Configuration label</label>
                    <input className="input" id="f-cfg" value={p.config_label || ""}
                      placeholder="2 &amp; 3 BHK" onChange={(e) => set({ config_label: e.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="f-towers">Towers</label>
                    <input className="input" id="f-towers" value={p.towers || ""}
                      placeholder="G+11" onChange={(e) => set({ towers: e.target.value })} />
                  </div>
                </div>

                <div className="pair">
                  <div className="field">
                    <label htmlFor="f-price">Price band</label>
                    <input className="input" id="f-price" value={p.price_band || ""}
                      placeholder="Price on request" onChange={(e) => set({ price_band: e.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="f-carpet">Carpet range</label>
                    <input className="input" id="f-carpet" value={p.carpet || ""}
                      placeholder="620 – 1,180 sq ft"
                      onChange={(e) => set({ carpet: e.target.value })} />
                    <span className="mono" style={{ display: "block", marginTop: 6 }}>
                      Shown in the facts row on the project page. Copy from the RERA
                      carpet areas printed on the floor-plan sheets — leave it empty
                      and it reads &ldquo;Updating soon&rdquo; rather than a guess.
                    </span>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="f-line">Card line</label>
                  <input className="input" id="f-line" value={p.line || ""}
                    placeholder="2 &amp; 3 BHK · Possession Dec 2027"
                    onChange={(e) => set({ line: e.target.value })} />
                </div>

                <div className="field">
                  <label htmlFor="f-desc">Description shown on the website</label>
                  <textarea className="input" id="f-desc" value={p.description || ""}
                    onChange={(e) => set({ description: e.target.value })} />
                </div>

                <span className="mono legend" style={{ marginTop: 30 }}>Construction progress</span>
                <p className="sub" style={{ color: "var(--muted)", marginTop: -8 }}>
                  The stages shown on the project page. <strong>Complete</strong> and{" "}
                  <strong>In progress</strong> colour themselves; anything else — a month
                  and year — reads as a target still ahead.
                </p>

                {(p.progress || []).map((s, i) => (
                  <div className="spec-row" key={i}>
                    <input className="input" value={s.stage || ""} placeholder="Wing A, 11 slabs"
                      aria-label={`Stage ${i + 1}`}
                      onChange={(e) => set({ progress: p.progress.map((x, j) => j === i ? { ...x, stage: e.target.value } : x) })} />
                    <input className="input" list="progress-states" value={s.state || ""}
                      placeholder="Complete" aria-label={`Stage ${i + 1} state`}
                      onChange={(e) => set({ progress: p.progress.map((x, j) => j === i ? { ...x, state: e.target.value } : x) })} />
                    <button className="btn btn-sm danger"
                      onClick={() => set({ progress: p.progress.filter((_, j) => j !== i) })}>Remove</button>
                  </div>
                ))}
                <datalist id="progress-states">
                  {["Complete", "In progress"].map((s) => <option key={s} value={s} />)}
                </datalist>

                <div className="plan-actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-sm"
                    onClick={() => set({ progress: [...(p.progress || []), { stage: "", state: "" }] })}>
                    + Add a stage
                  </button>
                  {!(p.progress || []).length && (
                    <button className="btn btn-sm"
                      onClick={() => set({ progress: STANDARD_STAGES.map((s) => ({ ...s })) })}>
                      Fill with the usual stages
                    </button>
                  )}
                </div>

                <span className="mono legend" style={{ marginTop: 30 }}>What is nearby</span>
                <p className="sub" style={{ color: "var(--muted)", marginTop: -8 }}>
                  Suggestions come from OpenStreetMap and are measured in a straight
                  line from the map pin, not along the road.{" "}
                  <strong>Check every one before publishing</strong> — a distance on a
                  builder&rsquo;s page is a claim buyers act on.
                </p>

                {(p.nearby || []).map((n, i) => (
                  <div className="spec-row" key={i}>
                    <input className="input" value={n.place || ""} placeholder="Sanjivani English School"
                      aria-label={`Landmark ${i + 1}`}
                      onChange={(e) => set({ nearby: p.nearby.map((x, j) => j === i ? { ...x, place: e.target.value } : x) })} />
                    <input className="input" value={n.distance || ""} placeholder="1.1 KM"
                      aria-label={`Landmark ${i + 1} distance`}
                      onChange={(e) => set({ nearby: p.nearby.map((x, j) => j === i ? { ...x, distance: e.target.value } : x) })} />
                    <button className="btn btn-sm danger"
                      onClick={() => set({ nearby: p.nearby.filter((_, j) => j !== i) })}>Remove</button>
                  </div>
                ))}

                <div className="plan-actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-sm"
                    onClick={() => set({ nearby: [...(p.nearby || []), { place: "", distance: "" }] })}>
                    + Add a landmark
                  </button>
                  <button className="btn btn-sm" disabled={nearbyBusy}
                    onClick={async () => {
                      setNearbyBusy(true); setError(""); setNote("");
                      try {
                        const found = await suggestNearby(p.coords);
                        if (!found.length) {
                          setNote("OpenStreetMap has nothing mapped near that pin. Add landmarks by hand.");
                        } else {
                          /* Added to what is already there, not over it — a
                             corrected distance should survive pressing this. */
                          const have = new Set((p.nearby || []).map((n) => n.place?.toLowerCase()));
                          const fresh = found.filter((n) => !have.has(n.place.toLowerCase()));
                          set({ nearby: [...(p.nearby || []), ...fresh] });
                          setNote(`Added ${fresh.length} suggestion${fresh.length === 1 ? "" : "s"}. Check each distance against the road route before publishing.`);
                        }
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        setNearbyBusy(false);
                      }
                    }}>
                    {nearbyBusy ? "Looking…" : "Suggest from the map pin"}
                  </button>
                </div>

                <div className="field" style={{ marginTop: 24 }}>
                  <label htmlFor="f-coords">Map coordinates</label>
                  <input className="input" id="f-coords" value={p.coords || ""}
                    placeholder="19.1223267,74.7473039"
                    onChange={(e) => set({ coords: e.target.value })} />
                  <span className="mono" style={{ display: "block", marginTop: 6 }}>
                    Right-click the exact plot in Google Maps and click the lat/lng to copy.
                    Leave empty rather than guessing.
                  </span>
                </div>
              </>
            )}

            {tab === "Specifications" && (
              <>
                <span className="mono legend">Specifications</span>
                <p className="sub" style={{ color: "var(--muted)", marginTop: -8 }}>
                  Each row is a labelled line on the project page — the label on the
                  left, the detail on the right. Leave a label blank for a plain line.
                </p>

                {specRows.map((row, i) => (
                  <div className="spec-row" key={i}>
                    <input className="input" value={row.k} placeholder="STRUCTURE"
                      aria-label={`Specification ${i + 1} label`}
                      onChange={(e) => writeSpecs(specRows.map((r, j) => j === i ? { ...r, k: e.target.value } : r))} />
                    <input className="input" value={row.v} placeholder="RCC framed, earthquake-resistant design to IS 1893"
                      aria-label={`Specification ${i + 1} detail`}
                      onChange={(e) => writeSpecs(specRows.map((r, j) => j === i ? { ...r, v: e.target.value } : r))} />
                    <button className="btn btn-sm danger" title="Remove"
                      onClick={() => writeSpecs(specRows.filter((_, j) => j !== i))}>Remove</button>
                  </div>
                ))}

                <div className="plan-actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-sm"
                    onClick={() => writeSpecs([...specRows, { k: "", v: "" }])}>
                    + Add a specification
                  </button>
                  {specRows.length === 0 && (
                    /* Without this the tab is an empty box that says nothing
                       about what the page expects. One click gives the standard
                       seven, which are then edited rather than invented. */
                    <button className="btn btn-sm" onClick={() => writeSpecs(DEFAULT_SPECS)}>
                      Fill with Marc&rsquo;s standard specifications
                    </button>
                  )}
                </div>

                <span className="mono legend" style={{ marginTop: 30 }}>Amenities</span>
                <p className="sub" style={{ color: "var(--muted)", marginTop: -8 }}>
                  The common ones are offered on every project. Tick what applies and
                  add anything particular to this building.
                </p>
                <div className="chips">
                  {amenityChoices.map((a) => (
                    <button key={a} aria-pressed={p.amenities.includes(a)}
                      onClick={() => toggleIn("amenities", a)}>{a}</button>
                  ))}
                </div>
                <div className="add-row">
                  <input className="input" value={newAmenity} placeholder="Add another amenity"
                    aria-label="New amenity"
                    onChange={(e) => setNewAmenity(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAmenity(); } }} />
                  <button className="btn btn-sm" onClick={addAmenity} disabled={!newAmenity.trim()}>
                    Add
                  </button>
                </div>
              </>
            )}

            {tab === "Compliance" && (
              <>
                <span className="mono legend">Compliance</span>

                <div className="rera-switch">
                  <span className="switch">
                    <button role="switch" type="button"
                      aria-checked={p.rera_applicable !== false}
                      aria-label="MahaRERA applies to this project"
                      onClick={() => set({ rera_applicable: p.rera_applicable === false })} />
                    <span className="lbl">
                      {p.rera_applicable === false ? "Not a MahaRERA project" : "MahaRERA applies"}
                    </span>
                  </span>
                  <p className="sub" style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                    {p.rera_applicable === false
                      ? "The registration band and the number are hidden on the project page, and Publish no longer waits for them."
                      : "Registration came in with the Act in 2017 and small plots fall under the threshold. Turn this off for a project that has no number and never will — an old completed building, for instance — rather than leaving it reading “Updating soon” forever."}
                  </p>
                </div>

                {p.rera_applicable !== false && (
                <>
                <span className="mono legend" style={{ marginTop: 26 }}>
                  Required before publishing
                </span>
                <div className="field">
                  <label htmlFor="f-rera">MahaRERA registration number *</label>
                  <input className="input" id="f-rera" value={p.rera || ""} placeholder="P522000…"
                    onChange={(e) => set({ rera: e.target.value })} />
                  <span className="mono" style={{ display: "block", marginTop: 6 }}>
                    Copy it exactly from the certificate. &quot;To confirm&quot; is a real state —
                    never invent a number.
                  </span>
                </div>
                <div className="field">
                  <label>MahaRERA QR code image *</label>
                  {p.qr_url
                    ? <img src={p.qr_url} alt="MahaRERA QR code" style={{ width: 150, border: "1px solid var(--line)" }} />
                    : <div className="drop">
                        <h3>No QR code uploaded</h3>
                        <p>Drag the QR image from the MahaRERA certificate, or choose a file.</p>
                      </div>}
                  <input type="file" accept="image/*" style={{ marginTop: 12 }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) set({ qr_url: await upload(f).catch((err) => (setError(err.message), p.qr_url)) });
                    }} />
                </div>
                </>
                )}
              </>
            )}

            {tab === "Media" && (
              <>
                <span className="mono legend">Floor plans</span>
                <p className="sub" style={{ color: "var(--muted)", marginTop: -8 }}>
                  Whole-floor sheets from the brochure. Their area tables are printed on
                  the drawing, which is why carpet areas are never retyped.
                  <br />
                  <strong>PDF is better than a photograph here</strong> — it stays sharp
                  however far a buyer zooms in, and it is not shrunk on upload the way
                  images are.
                </p>

                {(p.plans || []).map((pl, i) => {
                  const setPlan = (patch) =>
                    set({ plans: p.plans.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

                  return (
                    <div className="plan-row" key={i}>
                      {/* A PDF has no thumbnail an <img> can draw, so show
                          the document icon rather than a broken image. */}
                      <div className="plan-sheet">
                        {!pl.img
                          ? <span className="mono">No sheet</span>
                          : /\.pdf(\?|$)/i.test(pl.img)
                            ? <a href={pl.img} target="_blank" rel="noopener noreferrer"
                                title="Open the PDF"><Doc /><span className="mono">PDF</span></a>
                            : <img src={pl.img} alt={pl.label || "Floor plan"} />}
                      </div>

                      <div className="grow">
                        <div className="field">
                          <label>Floor</label>
                          <input className="input" value={pl.label} placeholder="2nd–11th floor"
                            onChange={(e) => setPlan({ label: e.target.value })} />
                        </div>

                        {/* The sheet is uploaded, not a URL typed by hand. Asking
                            for a path was the reason there was "no option for
                            adding the actual plan". */}
                        <div className="plan-actions">
                          <button className="btn btn-sm" disabled={planBusy === i}
                            onClick={() => document.getElementById(`plan-file-${i}`).click()}>
                            {planBusy === i ? "Uploading…" : pl.img ? "Replace sheet" : "Upload sheet"}
                          </button>
                          <input id={`plan-file-${i}`} type="file" accept="image/*,application/pdf" hidden
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              setPlanBusy(i); setError("");
                              try { setPlan({ img: await upload(f) }); }
                              catch (err) { setError(err.message); }
                              finally { setPlanBusy(-1); }
                            }} />
                          <button className="btn btn-sm danger"
                            onClick={() => set({ plans: p.plans.filter((_, j) => j !== i) })}>
                            Remove floor
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button className="btn btn-sm"
                  onClick={() => set({ plans: [...(p.plans || []), { label: "", img: "" }] })}>
                  + Add a floor plan
                </button>

                <span className="mono legend" style={{ marginTop: 30 }}>Video walkthroughs</span>
                <p className="sub" style={{ color: "var(--muted)", marginTop: -8 }}>
                  YouTube links. Films stay on YouTube rather than in storage — a
                  120 MB upload does not fit the plan, and YouTube streams better anyway.
                </p>

                {(p.videos || []).map((vd, i) => {
                  const setVid = (patch) =>
                    set({ videos: p.videos.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                  const ytId = youtubeId(vd.url);
                  return (
                    <div className="plan-row" key={i}>
                      {/* YouTube's own thumbnail, straight off the id. If it
                          appears the link parsed; if it does not, the link is
                          wrong — which beats finding out on the live site. */}
                      <div className="plan-sheet">
                        {ytId
                          ? <img src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`} alt="" />
                          : <span className="mono">No video</span>}
                      </div>
                      <div className="grow">
                        <div className="pair">
                          <div className="field">
                            <label>Configuration</label>
                            <input className="input" value={vd.label || ""} placeholder="2 BHK"
                              onChange={(e) => setVid({ label: e.target.value })} />
                          </div>
                          <div className="field">
                            <label>Length <span className="mono">optional</span></label>
                            <input className="input" value={vd.len || ""} placeholder="03:41"
                              onChange={(e) => setVid({ len: e.target.value })} />
                          </div>
                        </div>
                        <div className="field">
                          <label>YouTube link</label>
                          <input className="input" value={vd.url || ""}
                            placeholder="https://www.youtube.com/watch?v=…"
                            onChange={(e) => setVid({ url: e.target.value })} />
                          {vd.url?.trim() && !ytId && (
                            <span className="mono" style={{ display: "block", marginTop: 6, color: "var(--danger)" }}>
                              Not a YouTube link this site can play — it will open in a new tab instead of playing in the page.
                            </span>
                          )}
                        </div>
                        <button className="btn btn-sm danger"
                          onClick={() => set({ videos: p.videos.filter((_, j) => j !== i) })}>
                          Remove video
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button className="btn btn-sm"
                  onClick={() => set({ videos: [...(p.videos || []), { label: "", url: "", len: "" }] })}>
                  + Add a video
                </button>

                <span className="mono legend" style={{ marginTop: 30 }}>3D walkthroughs</span>
                <p className="sub" style={{ color: "var(--muted)", marginTop: -8 }}>
                  One per configuration if you have them — a 2 BHK tour and a 3 BHK
                  tour become tabs on the page, exactly like floor plans. Links must
                  start with <strong>https</strong>: the site is served over https and
                  the browser blocks a plain http tour as mixed content, leaving a
                  blank panel. No tours, no 3D section.
                </p>

                {(p.models || []).map((m, i) => {
                  const bad = m.url?.trim() && !/^https:\/\//.test(m.url.trim());
                  return (
                    <div className="spec-row" key={i}>
                      <input className="input" value={m.label || ""} placeholder="3 BHK"
                        aria-label={`Tour ${i + 1} label`}
                        onChange={(e) => set({ models: p.models.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                      <div>
                        <input className="input" value={m.url || ""} placeholder="https://…/index.html"
                          aria-label={`Tour ${i + 1} link`}
                          onChange={(e) => set({ models: p.models.map((x, j) => j === i ? { ...x, url: e.target.value } : x) })} />
                        {bad && (
                          <span className="mono" style={{ display: "block", marginTop: 6, color: "var(--danger)" }}>
                            Must start with https://
                          </span>
                        )}
                        {m.url?.trim() && !bad && (
                          <a className="mono" style={{ display: "inline-block", marginTop: 6 }}
                            href={m.url} target="_blank" rel="noopener noreferrer">Open it to check</a>
                        )}
                      </div>
                      <button className="btn btn-sm danger"
                        onClick={() => set({ models: p.models.filter((_, j) => j !== i) })}>Remove</button>
                    </div>
                  );
                })}

                <button className="btn btn-sm" style={{ marginTop: 12 }}
                  onClick={() => set({ models: [...(p.models || []), { label: "", url: "" }] })}>
                  + Add a 3D tour
                </button>
              </>
            )}
          </div>

          {/* Uploads belong to the Media tab. Sitting beside Details and
              Compliance, they made those screens look like they were about
              files when they are not. */}
          {tab === "Media" && (
          <div>
            <span className="mono legend">Media</span>
            <div className={`drop${over ? " over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}>
              <Up />
              <h3>Drag files here</h3>
              <p>Images (JPG, PNG), 3D model (GLB), floor plans and brochure (PDF).
                Up to 50 MB each — walkthrough videos go on YouTube.</p>
              <button className="btn" onClick={() => fileRef.current.click()}>Choose files</button>
              <input ref={fileRef} type="file" multiple hidden
                onChange={(e) => take(e.target.files)} />
            </div>

            <ul className="files">
              {queue.filter((i) => !i.done).map((i) => (
                <li key={i.name}>
                  {iconFor(i.name)}
                  <span className="grow">
                    <span className="nm">{i.name}</span>
                    <span className="mono" style={{ display: "block" }}>
                      {(i.size / 1048576).toFixed(1)} MB · Uploading {i.pct}%
                    </span>
                    <span className="bar"><i style={{ width: `${i.pct}%` }} /></span>
                  </span>
                </li>
              ))}
              {(p.media || []).map((m, i) => {
                const setMedia = (patch) =>
                  set({ media: p.media.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <li key={m.url}>
                    {m.kind === "image" ? <Pic /> : iconFor(m.name)}
                    <span className="grow">
                      <span className="nm">{m.name}</span>
                      {/* Images are the gallery on the project page. The
                          caption and tag are shown there, so they belong
                          here rather than in the filename. */}
                      {m.kind === "image" ? (
                        <span className="media-meta">
                          <input className="input" value={m.cap || ""}
                            placeholder="Caption shown under the photo"
                            onChange={(e) => setMedia({ cap: e.target.value })} />
                          <input className="input" list="media-tags" value={m.tag || ""}
                            placeholder="RENDER"
                            onChange={(e) => setMedia({ tag: e.target.value })} />
                        </span>
                      ) : (
                        <span className="mono" style={{ display: "block" }}>Uploaded</span>
                      )}
                    </span>
                    <button className="btn btn-sm danger"
                      onClick={() => set({ media: p.media.filter((_, j) => j !== i) })}>Remove</button>
                  </li>
                );
              })}
              <datalist id="media-tags">
                {["RENDER", "INTERIOR", "PROGRESS", "AMENITY", "PLAN"].map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </ul>

            {/* The cover is shown whatever it points at. A project seeded
                before the console existed still carries its original file,
                which is not among the uploads below — so the picker marked
                nothing and there was no way to see what the cover even was. */}
            <span className="mono legend" style={{ marginTop: 22 }}>Cover image</span>
            <div className="cover-now">
              {p.img
                ? <img src={p.img} alt="Current cover" />
                : <span className="mono">None set</span>}
              <span className="mono">
                {!p.img
                  ? "No cover yet. Upload an image and click it below."
                  : images.some((m) => m.url === p.img)
                    ? "Used on the project card, the home page wall and the top of the project page."
                    : "This is an original file, not one of the uploads below. Click one to replace it."}
              </span>
            </div>

            {images.length > 0 && (
              <>
                <span className="mono legend" style={{ marginTop: 22 }}>Images — pick the cover</span>
                <div className="covers">
                  {images.map((m) => (
                    <button key={m.url} className={`cover${p.img === m.url ? " is-cover" : ""}`}
                      onClick={() => set({ img: m.url })} title="Use as cover">
                      <img src={m.url} alt={m.name} />
                      {p.img === m.url && <span className="tag">Cover</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          )}
        </div>
      </div>
    </>
  );
}
