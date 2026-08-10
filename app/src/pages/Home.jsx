import { useEffect, useMemo, useState } from "react";
import DriftWall from "../components/DriftWall.jsx";
import ScrollExpand from "../components/ScrollExpand.jsx";
import { Header, Footer, WhatsAppFab, ActionBar, Counter } from "../components/Chrome.jsx";
import { PROJECTS, TESTIMONIALS } from "../data/projects.js";
import { thumb, card, hero } from "../lib/img.js";
import { reraLabel } from "../lib/rera.js";

const WHY = [
  ["01", "On-time possession", "Committed dates in the agreement, and a regular progress update to every buyer."],
  ["02", "Quality construction", "Construction according to RCC design. Concrete and steel are checked at site as the work goes up."],
  ["03", "Transparent dealings", "One price sheet, no hidden heads, clear payment milestones against work done."],
  ["04", "RERA-compliant", "Every project registered, every number printed on its page with the official QR."]
];

function ProjectCard({ p }) {
  return (
    <a className="blueprint pcard" href={`/project.html?p=${p.slug}`}>
      <div className="shot"><img src={card(p.img)} alt={p.name} loading="lazy" /></div>
      <div className="body">
        <div className="meta">
          <span className="tag tag-status">{p.status}</span>
          <span className="mono muted">{p.locality.toUpperCase()}</span>
        </div>
        <h3>{p.name}</h3>
        <p className="line">{p.line}</p>
        <div className="foot">
          <span className="mono muted">{p.reraApplicable === false ? "" : reraLabel(p.rera)}</span>
          <span className="view">View →</span>
        </div>
      </div>
    </a>
  );
}

export default function Home() {
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const testi = TESTIMONIALS[t];
  const featured = PROJECTS.slice(0, 3);

  /* Advances every 2.3s. Keyed on `t`, so each quote schedules the next one and
     tapping prev/next restarts the clock instead of racing a fixed interval.
     Holds while hovered or keyboard-focused, and never auto-advances for a
     reader who has asked for reduced motion — text that moves itself away is
     hard to finish reading otherwise. */
  useEffect(() => {
    if (paused) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setTimeout(
      () => setT((i) => (i + 1) % TESTIMONIALS.length),
      2300
    );
    return () => clearTimeout(id);
  }, [t, paused]);

  /* Every project becomes a drifting tile that links to its own page — the
     hero is the portfolio, not a single decorative render. Tiles paint at
     190×126, so they use the generated thumbnails: the full renders would
     pull ~28 MB to draw postage stamps. Run `npm run thumbs` after adding
     any image to /public/assets. */
  const tiles = useMemo(
    () => PROJECTS.map((p) => ({
      image: thumb(p.img),
      title: `${p.name} · ${p.locality}`,
      href: `/project.html?p=${p.slug}`
    })),
    []
  );

  return (
    <>
      <Header current="Home" />

      <main>
        <section className="masthead">
          <div className="wrap">
            <div className="masthead-grid">
              <div>
                <p className="tagline" lang="mr">रचनात्मक | समयबद्ध | नवनिर्मिती</p>
                <h1>Homes Ahilyanagar has trusted since 1987</h1>
                <p className="lede">
                  Marc Construction has 100+ delivered addresses across one district,
                  every one on the register.
                </p>
                <div className="hero-actions">
                  <a className="btn btn-primary" href="/projects.html">View projects</a>
                  <a className="btn btn-secondary" href="/contact.html">Enquire</a>
                </div>
              </div>

              <div className="masthead-wall">
                <DriftWall
                  items={tiles}
                  columns={4}
                  tileWidth={190}
                  tileHeight={126}
                  gap={16}
                  radius={10}
                  tilt={14}
                  turn={-16}
                  perspective={1100}
                  depth={110}
                  speed={30}
                  direction="up"
                  variance={0.45}
                  parallax={0.55}
                  lift={54}
                  fade={0.62}
                  dim={0.62}
                  overlayColor="#2b2119"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="ledger">
          <div className="wrap">
            <div className="ledger-row">
              <div className="fig"><b><Counter to={39} /></b><span className="mono">YEARS</span></div>
              <div className="fig"><b><Counter to={100} suffix="+" /></b><span className="mono">DELIVERED</span></div>
              <div className="fig"><b><Counter to={3000} suffix="+" /></b><span className="mono">FAMILIES HOUSED</span></div>
              <div className="creds">
                <span className="mono">CREDAI MEMBER</span>
                <span className="mono">ISO 9001</span>
                <span className="mono">MAHARERA REGISTERED</span>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap sec">
          <div className="band-head">
            <div>
              <span className="mono kicker">FEATURED</span>
              <h2>Now building in Ahilyanagar</h2>
            </div>
            <a className="btn btn-secondary btn-nav" href="/projects.html">All projects →</a>
          </div>
          <div className="card-grid">
            {featured.map((p) => <ProjectCard key={p.slug} p={p} />)}
          </div>
        </section>

        {/* The frame opens as you scroll — a plate on paper that takes the whole
            stage, carrying only the headline. The standard itself is read
            afterwards, on paper, where prose belongs. */}
        <section className="why-expand">
          <ScrollExpand
            useWindowScroll
            src={hero("/assets/bluebell-elevation.png")}
            alt="Bluebell, Ahilyanagar, elevation"
            title="Thirty-nine years in one district"
            scrollHint="SCROLL"
            startWidth={46}
            startHeight={62}
            startRadius={16}
            endRadius={0}
            /* 1 = no zoom. The component eases the media from mediaZoom back
               to 1 as the frame opens; holding it at 1 keeps the building at a
               constant size so only the frame grows. */
            mediaZoom={1}
            scrollDistance={1.1}
            holdDistance={0.3}
            overlayScrim={0.5}
          />
        </section>

        <section className="wrap sec why-after">
          <span className="mono kicker">WHY MARC</span>
          <p className="why-lede">
            Marc has built only in and around Ahilyanagar since 1987. The families who
            bought our first flats live beside our newest sites, and that proximity is
            the whole standard.
          </p>
          <div className="why-points">
            {WHY.map(([n, title, body]) => (
              <div className="why-point" key={n}>
                <span className="mono">{n}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="band-accent on-dark gap-top-lg"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="wrap">
            <span className="mono band-label">FROM THE FAMILIES WHO LIVE HERE</span>
            <div className="testi">
              <div className="testi-body">
                <blockquote>“{testi.quote}”</blockquote>
                <p className="who">{testi.name} · {testi.locality}</p>
              </div>
              <div className="testi-nav">
                <button
                  type="button" className="btn btn-icon btn-on-dark" aria-label="Previous testimonial"
                  onClick={() => setT((i) => (i + TESTIMONIALS.length - 1) % TESTIMONIALS.length)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <button
                  type="button" className="btn btn-icon btn-on-dark" aria-label="Next testimonial"
                  onClick={() => setT((i) => (i + 1) % TESTIMONIALS.length)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppFab />
      <ActionBar />
    </>
  );
}
