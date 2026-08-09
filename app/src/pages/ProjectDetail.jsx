import { useEffect, useState } from "react";
import { Header, SlimFooter, WhatsAppFab, ActionBar } from "../components/Chrome.jsx";
import { PROJECTS, bySlug, WALKTHROUGHS } from "../data/projects.js";
import { card } from "../lib/img.js";

const GALLERY = [
  { cap: "Signature elevation, east approach", tag: "RENDER", img: "/assets/rainflower-elevation.png" },
  { cap: "Street view at dusk", tag: "RENDER", img: "/assets/rainflower-dusk.png" },
  { cap: "Daylight elevation from the avenue", tag: "RENDER", img: "/assets/rainflower-day.png" },
  { cap: "Aerial view of the podium and landscape court", tag: "RENDER", img: "/assets/rainflower-aerial.png" },
  { cap: "Living room, 3 BHK", tag: "INTERIOR", img: "/assets/interior-living.png" },
  { cap: "Family lounge, 2 BHK", tag: "INTERIOR", img: "/assets/interior-lounge.png" }
];

/* Defaults, used only where a project has none of its own. They describe how
   Marc builds generally, so they were right as a shared baseline — but they
   were the ONLY source, which made the console's Specifications and Amenities
   fields write to a database nothing ever read. A project that fills either
   now overrides the corresponding list. */

/* Console specs are one per line. "Label: value" splits into the two-column
   row this page draws; a plain line becomes a single wide row, so nobody has
   to learn a format to get a sensible result. */
const parseSpecs = (text) =>
  String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(":");
      return at > 0
        ? [line.slice(0, at).trim().toUpperCase(), line.slice(at + 1).trim()]
        : ["", line];
    });

const DEFAULT_SPECS = [
  ["STRUCTURE", "RCC framed, earthquake-resistant design to IS 1893"],
  ["FLOORING", "800×800 vitrified tiles; anti-skid in wet areas"],
  ["KITCHEN", "Granite platform, stainless sink, glazed dado"],
  ["DOORS", "Teak-finish main door; flush internal doors"],
  ["WINDOWS", "Three-track powder-coated aluminium with mosquito net"],
  ["ELECTRICAL", "Concealed copper wiring, modular switches, AC points"],
  ["WATER", "Underground + overhead tanks, solar water heating provision"]
];

const DEFAULT_AMENITIES = [
  "Two automatic lifts per wing",
  "Generator power backup, common areas & lifts",
  "Landscaped garden & walking loop",
  "Children's play area with soft flooring",
  "CCTV surveillance, entry gate & lobbies",
  "Covered parking, visitor bays",
  "Community hall & society office",
  "Rainwater harvesting"
];

const NEARBY = [
  ["Nearest bus stop", "400 M"], ["Sanjivani English School", "1.1 KM"],
  ["Booth Hospital", "2.4 KM"], ["Nagar–Manmad Road", "2.8 KM"],
  ["Ahilyanagar railway station", "5.6 KM"], ["Market Yard", "6.2 KM"]
];

/* Paste a Google My Maps id here to show every site on one map with this
   project centred; until then each page shows its own exact pin. */
const MY_MAP_ID = "";

const Pending = ({ children }) => {
  const pending = children === "To confirm" || children === "—";
  return <b className={pending ? "pending" : undefined}>{children}</b>;
};

export default function ProjectDetail() {
  const [p, setP] = useState(null);
  const [vid, setVid] = useState(0);
  const [model, setModel] = useState(false);
  const [plan, setPlan] = useState(0);
  const [lb, setLb] = useState(-1);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("p");
    /* PROJECTS can legitimately be empty — every project drafted in the
       console publishes an empty portfolio. Reading .name off undefined threw
       here and blanked the page, so fall back to nothing and let the guard
       below render instead. */
    const found = bySlug(slug) || PROJECTS[0] || null;
    setP(found);
    if (found) document.title = `${found.name} · Marc Construction`;
  }, []);

  useEffect(() => {
    if (lb < 0) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLb(-1);
      if (e.key === "ArrowLeft") setLb((i) => (i + GALLERY.length - 1) % GALLERY.length);
      if (e.key === "ArrowRight") setLb((i) => (i + 1) % GALLERY.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lb]);

  if (!p) return null;

  /* A project's own films win; the shared set stands in for the ones that
     have none, which is every project until Marc adds them. */
  const vids = p.videos?.length ? p.videos : WALKTHROUGHS;
  const v = vids[Math.min(vid, vids.length - 1)];
  const plans = p.plans || [];
  /* A project's own specs and amenities win; the shared defaults fill in for
     the ones nobody has written yet. */
  const ownSpecs = parseSpecs(p.specs);
  const specs = ownSpecs.length ? ownSpecs : DEFAULT_SPECS;
  const amenities = p.amenities?.length ? p.amenities : DEFAULT_AMENITIES;
  const q = encodeURIComponent(
    p.coords || (p.locality === "Ahilyanagar" ? "Ahmednagar, Maharashtra, India"
      : `${p.locality}, Ahmednagar, Maharashtra, India`)
  );
  const mapSrc = MY_MAP_ID
    ? `https://www.google.com/maps/d/embed?mid=${MY_MAP_ID}${p.coords ? `&ll=${p.coords}&z=16` : ""}`
    : `https://maps.google.com/maps?q=${q}&z=${p.coords ? 17 : 14}&output=embed`;

  return (
    <>
      <Header current="Projects" />

      <main>
        <section className="hero hero-detail">
          <img src={p.img} alt={`${p.name} elevation`} />
          <div className="hero-scrim" />
          <div className="hero-body">
            <div className="wrap">
              <div>
                <span className="mono eyebrow">
                  PROJECTS / {p.status.toUpperCase()} / {p.locality.toUpperCase()}
                </span>
                <div className="detail-head">
                  <div>
                    <div className="tags">
                      <span className="tag tag-status">{p.status}</span>
                      <span className="tag tag-ghost">{p.configLabel}</span>
                    </div>
                    <h1>{p.name}</h1>
                    <p className="lede">
                      {p.locality} · {p.configLabel} residences · Price on request
                    </p>
                  </div>
                  <div className="actions">
                    <a className="btn btn-secondary btn-on-dark" href="/contact.html">Download brochure</a>
                    <a className="btn btn-primary" href="/contact.html">Enquire</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="specstrip">
          <div className="wrap">
            <div className="cell"><span className="mono">CONFIGURATION</span><Pending>{p.configLabel}</Pending></div>
            <div className="cell"><span className="mono">POSSESSION</span><Pending>{p.possession}</Pending></div>
            <div className="cell"><span className="mono">TOWERS</span><Pending>{p.towers}</Pending></div>
            <div className="cell"><span className="mono">CARPET RANGE</span><Pending>To confirm</Pending></div>
            <div className="cell"><span className="mono">MAHARERA</span><Pending>{p.rera}</Pending></div>
          </div>
        </section>

        {/* Only shown when the project actually has a model. The button used
            to be inert on every page, which promises something the site
            cannot deliver. */}
        {p.modelUrl && (
          <section className="wrap sec">
            <div className="sec-head"><span className="mono kicker">01</span><h2>Walk the building in 3D</h2></div>
            <div className="blueprint mediabox">
              {model ? (
                /* Loaded on click, never on page load: these tours pull many
                   megabytes of textures and would otherwise cost every visitor
                   who never presses the button. */
                <iframe className="shot model-frame" src={p.modelUrl}
                  title={`${p.name} 3D walkthrough`} allow="fullscreen; xr-spatial-tracking"
                  loading="lazy" />
              ) : (
                <div className="shot">
                  <img src={card(p.img || "/assets/rainflower-aerial.png")}
                    alt={`${p.name} 3D model`} loading="lazy" />
                </div>
              )}
              <div className="bar">
                {model ? (
                  <a className="btn btn-secondary btn-nav" href={p.modelUrl}
                    target="_blank" rel="noopener noreferrer">Open full screen</a>
                ) : (
                  <button type="button" className="btn btn-primary btn-nav"
                    onClick={() => setModel(true)}>Launch 3D model</button>
                )}
                <span className="mono spacer">DRAG TO LOOK AROUND · SCROLL TO ZOOM</span>
              </div>
            </div>
            <span className="mono caption">ARTISTIC IMPRESSION; ACTUALS MAY VARY</span>
          </section>
        )}

        <section className="wrap sec">
          <div className="detail-split">
            <div>
              <div className="sec-head">
                <span className="mono kicker">02</span><h2>Video walkthroughs</h2>
                <span className="note">One film per configuration.</span>
              </div>
              <div className="tabrow" role="tablist" aria-label="Walkthrough configuration">
                {vids.map((w, i) => (
                  <button key={w.label} type="button" className="tab" role="tab"
                    aria-selected={vid === i} onClick={() => setVid(i)}>
                    {w.label}
                  </button>
                ))}
              </div>
              <a className="blueprint video" href={v.url} target="_blank" rel="noopener noreferrer">
                {/* A video added in the console may have no poster of its own;
                    the project's cover stands in rather than a broken image. */}
                <div className="shot"><img src={card(v.img || p.img)} alt={`${p.name} ${v.label} walkthrough`} loading="lazy" /></div>
                <div className="play">
                  <span><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l12 7-12 7z" /></svg></span>
                </div>
                <div className="bar">
                  <span className="mono">{v.len}</span>
                  <span className="track"><i /></span>
                  <span className="mono">{v.label} WALKTHROUGH · YOUTUBE</span>
                </div>
              </a>
            </div>

            <div>
              <div className="sec-head"><span className="mono kicker">03</span><h2>Progress</h2></div>
              <div className="rows">
                <div className="row"><span>Excavation &amp; footing</span><span className="mono kicker">COMPLETE</span></div>
                <div className="row"><span>Wing A, 11 slabs</span><span className="mono kicker">COMPLETE</span></div>
                <div className="row"><span>Wing B, 7 of 11 slabs</span><span className="mono muted">IN PROGRESS</span></div>
                <div className="row"><span>Blockwork &amp; plaster</span><span className="mono muted">IN PROGRESS</span></div>
                <div className="row"><span>Finishing &amp; handover</span><span className="mono pending">MAR 2027</span></div>
              </div>
              <div className="blueprint progress-note">
                <h3>Regular progress on WhatsApp</h3>
                <p>Every booked family gets dated site photographs.</p>
                <a className="btn btn-secondary" href="https://wa.me/919552555621" target="_blank" rel="noopener noreferrer">Get updates</a>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap sec">
          <div className="sec-head">
            <span className="mono kicker">04</span><h2>Gallery</h2>
            <span className="note">Renders and dated construction progress. Click any frame to enlarge.</span>
          </div>
          <div className="gallery">
            {GALLERY.map((g, i) => (
              <figure className="blueprint" key={g.cap} tabIndex={0} role="button"
                onClick={() => setLb(i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLb(i); } }}>
                <div className="shot"><img src={card(g.img)} alt={g.cap} loading="lazy" /></div>
                <figcaption><span>{g.cap}</span><span className="mono">{g.tag}</span></figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="wrap sec">
          <div className="sec-head"><span className="mono kicker">05</span><h2>Floor plans</h2></div>
          {plans.length ? (
            <>
              {plans.length > 1 && (
                <div className="tabrow" role="tablist" aria-label="Floor plan">
                  {plans.map((pl, i) => (
                    <button key={pl.label} type="button" className="chip" role="tab"
                      aria-selected={plan === i} onClick={() => setPlan(i)}>
                      {pl.label}
                    </button>
                  ))}
                </div>
              )}
              <figure className="blueprint plan-sheet">
                <img src={plans[Math.min(plan, plans.length - 1)].img}
                  alt={`${p.name}, ${plans[Math.min(plan, plans.length - 1)].label} plan`} />
              </figure>
              <figcaption className="mono plan-note">
                {plans[Math.min(plan, plans.length - 1)].label.toUpperCase()} · AREAS AS PRINTED ON THE SHEET · RERA CARPET
              </figcaption>
            </>
          ) : (
            <div className="plans">
              <div className="blueprint plan-figure">
                <div className="shot"><span className="slot">Floor plan to be supplied</span></div>
              </div>
            </div>
          )}
          <div className="plan-actions">
            <a className="btn btn-primary" href="/contact.html">Download plan PDF</a>
            <a className="btn btn-secondary" href="/contact.html">Request price sheet</a>
          </div>
        </section>

        <section className="wrap sec">
          <div className="two-col">
            <div>
              <div className="sec-head"><span className="mono kicker">06</span><h2>Specifications</h2></div>
              <div className="rows">
                {specs.map(([k, val], i) => (
                  <div className="row-grid" key={`${k}-${i}`}>
                    <span className="mono muted">{k}</span><span>{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="sec-head"><span className="mono kicker">07</span><h2>Amenities</h2></div>
              <div className="rows">
                {amenities.map((a) => (
                  <div className="amen" key={a}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" aria-hidden="true">
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                    {a}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="wrap sec">
          <div className="sec-head"><span className="mono kicker">08</span><h2>Location</h2></div>
          <div className="location">
            <div className="blueprint map">
              <div className="shot map-canvas">
                <iframe title={`Map of ${p.name}, ${p.locality}`} loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade" src={mapSrc} />
              </div>
              <div className="bar">
                <span className="mono">
                  {p.coords
                    ? `${p.locality.toUpperCase()} · ${(+p.coords.split(",")[0]).toFixed(4)}° N, ${(+p.coords.split(",")[1]).toFixed(4)}° E`
                    : `${p.locality.toUpperCase()} · LOCATION PENDING`}
                </span>
                <a className="btn btn-secondary" target="_blank" rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${q}`}>Open in Maps</a>
              </div>
            </div>
            <div>
              <span className="mono muted band-label">NEARBY</span>
              <div className="rows">
                {NEARBY.map(([place, dist]) => (
                  <div className="row" key={place}><span>{place}</span><span className="mono muted">{dist}</span></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rera on-dark">
          <div className="wrap">
            <div>
              <span className="mono">MAHARERA REGISTRATION</span>
              <h2>{p.rera === "To confirm" || p.rera === "—" ? "Registration number pending" : p.rera}</h2>
              <p>
                Registered with the Maharashtra Real Estate Regulatory Authority. Scan the
                code or verify the number directly on the MahaRERA portal before booking.
              </p>
              <div className="actions">
                <a className="btn btn-primary" href="https://maharera.maharashtra.gov.in/" target="_blank" rel="noopener noreferrer">Verify on MahaRERA</a>
                <a className="btn btn-secondary btn-on-dark" href="/contact.html">Download RERA certificate</a>
              </div>
            </div>
            <div className="blueprint rera-qr">
              <img src="/assets/rera-qr-arabella.jpg" alt="MahaRERA QR code" />
            </div>
          </div>
        </section>
      </main>

      {lb > -1 && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Gallery"
          onClick={(e) => e.target === e.currentTarget && setLb(-1)}>
          <div className="lb-head">
            <span className="mono">{GALLERY[lb].tag}</span>
            <h2>{GALLERY[lb].cap}</h2>
            <button type="button" className="btn btn-icon" aria-label="Close gallery" onClick={() => setLb(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="lb-body">
            <button type="button" className="btn btn-icon" aria-label="Previous image"
              onClick={() => setLb((i) => (i + GALLERY.length - 1) % GALLERY.length)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="blueprint lb-frame">
              <img src={GALLERY[lb].img} alt={GALLERY[lb].cap} />
            </div>
            <button type="button" className="btn btn-icon" aria-label="Next image"
              onClick={() => setLb((i) => (i + 1) % GALLERY.length)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
          <span className="mono lb-foot">ARTISTIC IMPRESSION; ACTUALS MAY VARY · PRESS ESC TO CLOSE</span>
        </div>
      )}

      <SlimFooter disclaimer="ARTISTIC IMPRESSION; ACTUALS MAY VARY. AREAS STATED ARE RERA CARPET AREAS. THIS PAGE IS NOT AN OFFER OR CONTRACT." />
      <WhatsAppFab />
      <ActionBar primaryLabel="Enquire" />
    </>
  );
}
