import { useEffect, useRef, useState } from "react";
import { db, upload, logActivity, triggerRebuild } from "./api.js";
import { Back, Alert, Up, Box, Play, Doc, Pic } from "./Icons.jsx";

const TABS = ["Details", "Media", "Specifications", "Compliance"];
const LOCALITIES = ["Ahilyanagar", "Savedi", "Nalegaon", "Bhistabag", "Tarakpur", "Borude Mala"];
const STATUSES = ["Ongoing", "Completed", "Upcoming"];
const TYPES = ["Residential", "Commercial", "Mixed-Use"];
const CONFIGS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Shop", "Office"];
const AMENITIES = ["Lifts", "Power backup", "CCTV", "Landscaped garden", "Play area", "Clubhouse", "Covered parking"];

const BLANK = {
  slug: "", name: "", locality: LOCALITIES[0], status: "Ongoing", type: "Residential",
  configs: [], config_label: "", rera: "", qr_url: "", towers: "", possession: "",
  line: "", img: "", coords: "", description: "", price_band: "", specs: "",
  amenities: [], plans: [], media: [], published: false
};

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const iconFor = (n) => /\.glb$/i.test(n) ? <Box /> : /\.(mp4|mov)$/i.test(n) ? <Play /> : <Doc />;

export default function ProjectEditor({ id, onBack, onChanged }) {
  const [p, setP] = useState(id === "new" ? BLANK : null);
  const [tab, setTab] = useState("Details");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [queue, setQueue] = useState([]);      // in-flight uploads
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (id === "new") return;
    db(`projects?id=eq.${id}&select=*`)
      .then((r) => setP(r[0] ?? null))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error && !p) return <div className="view"><p className="err">{error}</p></div>;
  if (!p) return <div className="view"><p className="spinner">Loading…</p></div>;

  const set = (patch) => setP((cur) => ({ ...cur, ...patch }));
  const toggleIn = (key, value) =>
    set({ [key]: p[key].includes(value) ? p[key].filter((v) => v !== value) : [...p[key], value] });

  /* The two things MahaRERA requires on a listing. Publish stays disabled
     until both are present — the database enforces the number, this also
     watches the QR image the law asks for. */
  const pending = [
    !p.rera?.trim() && "MahaRERA registration number",
    !p.qr_url?.trim() && "MahaRERA QR code image"
  ].filter(Boolean);

  const save = async ({ publish } = {}) => {
    setSaving(true); setError(""); setNote("");
    const body = {
      ...p,
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
          : "Saved and published in the console. The website updates on its next deploy: set VITE_VERCEL_DEPLOY_HOOK to make that automatic.");
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

        <div className="edit-cols">
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
                    <label htmlFor="f-loc">Locality</label>
                    <select className="input" id="f-loc" value={p.locality}
                      onChange={(e) => set({ locality: e.target.value })}>
                      {LOCALITIES.map((l) => <option key={l}>{l}</option>)}
                    </select>
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

                <div className="field">
                  <label htmlFor="f-price">Price band</label>
                  <input className="input" id="f-price" value={p.price_band || ""}
                    placeholder="Price on request" onChange={(e) => set({ price_band: e.target.value })} />
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

                <div className="field">
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
                <span className="mono legend">Specifications &amp; amenities</span>
                <div className="field">
                  <label htmlFor="f-specs">Specifications (one per line)</label>
                  <textarea className="input" id="f-specs" style={{ minHeight: 160 }}
                    value={p.specs || ""} onChange={(e) => set({ specs: e.target.value })}
                    placeholder={"RCC framed structure\nVitrified tile flooring\nGranite kitchen platform"} />
                </div>
                <div className="field">
                  <label>Amenities</label>
                  <div className="chips">
                    {AMENITIES.map((a) => (
                      <button key={a} aria-pressed={p.amenities.includes(a)}
                        onClick={() => toggleIn("amenities", a)}>{a}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === "Compliance" && (
              <>
                <span className="mono legend">Compliance — required before publishing</span>
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

            {tab === "Media" && (
              <>
                <span className="mono legend">Floor plans</span>
                {(p.plans || []).map((pl, i) => (
                  <div className="pair" key={i}>
                    <div className="field">
                      <label>Floor</label>
                      <input className="input" value={pl.label}
                        onChange={(e) => set({ plans: p.plans.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                    </div>
                    <div className="field">
                      <label>Sheet</label>
                      <input className="input" value={pl.img}
                        onChange={(e) => set({ plans: p.plans.map((x, j) => j === i ? { ...x, img: e.target.value } : x) })} />
                    </div>
                  </div>
                ))}
                <button className="btn btn-sm"
                  onClick={() => set({ plans: [...(p.plans || []), { label: "", img: "" }] })}>
                  + Add a floor plan
                </button>
              </>
            )}
          </div>

          {/* ---- media column, always visible ---- */}
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
              {(p.media || []).map((m, i) => (
                <li key={m.url}>
                  {m.kind === "image" ? <Pic /> : iconFor(m.name)}
                  <span className="grow">
                    <span className="nm">{m.name}</span>
                    <span className="mono" style={{ display: "block" }}>Uploaded</span>
                  </span>
                  <button className="btn btn-sm"
                    onClick={() => set({ media: p.media.filter((_, j) => j !== i) })}>Remove</button>
                </li>
              ))}
            </ul>

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
        </div>
      </div>
    </>
  );
}
