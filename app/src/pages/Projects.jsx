import { useMemo, useState } from "react";
import { Header, SlimFooter, WhatsAppFab, ActionBar } from "../components/Chrome.jsx";
import { PROJECTS } from "../data/projects.js";
import { card } from "../lib/img.js";
import FoldText from "../components/FoldText.jsx";

const FACETS = [
  ["status", "STATUS", ["All", "Ongoing", "Completed", "Upcoming"]],
  ["type", "TYPE", ["All", "Residential", "Commercial", "Mixed-Use"]],
  ["config", "CONFIG", ["All", "1 BHK", "2 BHK", "3 BHK", "Shop", "Office"]],
  ["locality", "LOCALITY", ["All", "Savedi", "Nalegaon", "Bhistabag", "Tarakpur", "Borude Mala"]]
];

const CLEAR = { status: "All", type: "All", config: "All", locality: "All" };

export default function Projects() {
  const [f, setF] = useState(CLEAR);

  const list = useMemo(
    () => PROJECTS.filter((p) =>
      (f.status === "All" || p.status === f.status) &&
      (f.type === "All" || p.type === f.type) &&
      (f.config === "All" || p.configs.includes(f.config)) &&
      (f.locality === "All" || p.locality === f.locality)
    ),
    [f]
  );

  return (
    <>
      <Header current="Projects" />

      <main>
        <div className="wrap page-head">
          <span className="mono kicker">PORTFOLIO · 1987 → 2026</span>
          {/* Folds in on mount; the real string stays in the DOM for screen
              readers and search engines via the component's sr-only span. */}
          <h1 className="fold-head">
            <FoldText
              text="Projects in Ahilyanagar"
              splitBy="char"
              hinge="top"
              trigger="mount"
              duration={0.6}
              stagger={0.028}
              ease="power3.out"
              perspective={800}
              creaseShading={0.42}
              fontSize="clamp(36px, 4.6vw, 68px)"
              fontWeight={600}
              color="var(--color-text)"
            />
          </h1>
          <p>
            Five sites under construction, 100+ addresses delivered. Filter by what
            you are looking for. Every registration number is on the card.
          </p>
        </div>

        <div className="wrap filters-wrap">
          <div className="filters">
            {FACETS.map(([key, label, values]) => (
              <div className="filter-row" key={key}>
                <span className="mono">{label}</span>
                <div className="filter-opts">
                  {values.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="chip"
                      aria-pressed={f[key] === v}
                      onClick={() => setF((s) => ({ ...s, [key]: v }))}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="filter-summary">
            <span className="mono" aria-live="polite">
              {list.length} {list.length === 1 ? "PROJECT" : "PROJECTS"}
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setF(CLEAR)}>
              Clear all filters
            </button>
          </div>
        </div>

        <div className="wrap list-wrap">
          {list.length > 0 ? (
            <div className="card-grid">
              {list.map((p) => (
                <a className="blueprint pcard" href={`/project.html?p=${p.slug}`} key={p.slug}>
                  <div className="shot"><img src={card(p.img)} alt={p.name} loading="lazy" /></div>
                  <div className="body">
                    <div className="meta">
                      <span className="tag tag-status">{p.status}</span>
                      <span className="mono muted">{p.locality.toUpperCase()}</span>
                    </div>
                    <h3>{p.name}</h3>
                    <p className="line">{p.line}</p>
                    <div className="foot">
                      <span className="mono muted">{p.rera}</span>
                      <span className="view">View →</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="blueprint empty">
              <h2>Nothing in this combination yet</h2>
              <p>
                Upcoming launches are announced on WhatsApp first. Leave your number and
                we will send the plan the day it is registered.
              </p>
              <div className="empty-actions">
                <a className="btn btn-primary" href="/contact.html">Get launch alerts</a>
                <button type="button" className="btn btn-secondary" onClick={() => setF(CLEAR)}>
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <SlimFooter />
      <WhatsAppFab />
      <ActionBar />
    </>
  );
}
