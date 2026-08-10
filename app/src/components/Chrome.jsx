import { useEffect, useRef, useState } from "react";
import { PHONE, PHONE_DISPLAY, WHATSAPP, LEGAL, EMAIL, SOCIALS } from "../data/projects.js";
import { SocialIcon, networkFor } from "../lib/social.jsx";

/* Shared page furniture: header, footers, the WhatsApp button and the pinned
   mobile action bar. Plain <a href> between pages — this is a multi-page build,
   so each navigation is a real document load and a real URL. */

/* No "Home": the wordmark is the way back, and offering two controls for one
   destination just makes the row longer. */
const NAV = [
  ["/projects.html", "Projects"],
  ["/about.html", "About"],
  ["/contact.html", "Contact"]
];

export function Header({ current }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* The bar is transparent over the top of the page and takes a solid ground
     once anything is scrolled beneath it — a permanently transparent sticky
     bar lets body copy read straight through the wordmark. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`site-header${scrolled ? " is-scrolled" : ""}${open ? " open" : ""}`}
    >
      <div className="bar">
        <a className="brand" href="/index.html">
          <img src="/assets/marc-wordmark-ink.png" alt="Marc Construction" />
        </a>
        <nav className="nav-links" aria-label="Main">
          {NAV.map(([href, label]) => (
            <a
              key={href}
              className="navlink"
              href={href}
              aria-current={current === label ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <a className="btn btn-primary btn-nav" href="/contact.html">Enquire</a>
        <button
          type="button"
          className="btn btn-secondary btn-icon nav-toggle"
          aria-expanded={open}
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <img src="/assets/marc-wordmark.png" alt="Marc Construction" />
          <p className="footer-blurb">
            Also branded Marc Developers · Madhumalati Constructions Pvt Ltd
          </p>

          {/* With the wordmark and the trading names rather than under the
              phone number: these are the company's own accounts, not another
              way to reach the office. An empty list renders nothing — a row
              of dead icons says a developer has no presence anywhere. */}
          {SOCIALS.length > 0 && (
            <div className="socials">
              {SOCIALS.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer"
                  aria-label={s.label || networkFor(s.url)} title={s.label || networkFor(s.url)}>
                  <SocialIcon url={s.url} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="footer-col">
          <span className="mono">EXPLORE</span>
          <div className="footer-list">
            <a href="/projects.html">Ongoing projects</a>
            <a href="/projects.html">Completed projects</a>
            <a href="/about.html">About Marc</a>
            <a href="/contact.html">Contact</a>
          </div>
        </div>
        <div className="footer-col">
          <span className="mono">MARC HOUSE</span>
          <p className="footer-lines">
            Opp. Datta Mandir<br />Nagar–Manmad Road, Savedi<br />Ahilyanagar 414003
          </p>
        </div>
        <div className="footer-col">
          <span className="mono">REACH US</span>
          <p className="footer-lines">
            <a href={`tel:${PHONE}`}>{PHONE_DISPLAY}</a><br />
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp</a><br />
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </p>
        </div>
      </div>
      <div className="footer-legal">
        <span className="mono">{LEGAL}</span>
      </div>
    </footer>
  );
}

export function SlimFooter({ disclaimer }) {
  return (
    <footer className="footer-slim">
      <div className="wrap">
        {disclaimer && <span className="mono disclaimer">{disclaimer}</span>}
        <span className="mono">{LEGAL}</span>
      </div>
    </footer>
  );
}

export function WhatsAppFab() {
  return (
    <a className="wa-fab" href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
      <svg width="30" height="30" viewBox="0 0 89 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M64.7239 53.4372C63.6195 52.8845 58.1896 50.2134 57.1771 49.845C56.1648 49.4767 55.4287 49.2924 54.6924 50.3977C53.9561 51.503 51.8395 53.9898 51.1952 54.7267C50.551 55.4635 49.9069 55.5558 48.8024 55.003C47.698 54.4505 44.1394 53.2845 39.921 49.523C36.6378 46.5956 34.4212 42.9797 33.7769 41.8744C33.1327 40.7691 33.7083 40.1717 34.2614 39.6211C34.7579 39.1267 35.3656 38.3318 35.9178 37.687C36.47 37.0422 36.6541 36.5817 37.0223 35.8449C37.3904 35.108 37.2063 34.4632 36.9301 33.9106C36.6541 33.3579 34.4454 27.9236 33.525 25.713C32.6287 23.5601 31.7181 23.8514 31.0401 23.8177C30.3966 23.7856 29.6597 23.7788 28.9234 23.7788C28.1871 23.7788 26.9907 24.0552 25.9782 25.1603C24.9659 26.2656 22.1128 28.9369 22.1128 34.3711C22.1128 39.8054 26.0703 45.0555 26.6226 45.7924C27.1748 46.5294 34.4104 57.6813 45.4893 62.4636C48.1243 63.6012 50.1816 64.2804 51.7854 64.7895C54.4312 65.6296 56.8389 65.5112 58.7418 65.2269C60.8637 64.9099 65.2762 62.5558 66.1965 59.9768C67.1167 57.3978 67.1167 55.1872 66.8407 54.7267C66.5647 54.2662 65.8284 53.9898 64.7239 53.4372ZM44.5723 80.943H44.5574C37.9651 80.9405 31.4994 79.1702 25.8589 75.8239L24.5173 75.0278L10.6127 78.6742L14.3241 65.1217L13.4505 63.7323C9.773 57.8848 7.8308 51.1263 7.8335 44.1869C7.8416 23.9373 24.3224 7.463 44.5869 7.463C54.3996 7.4668 63.6237 11.292 70.56 18.2338C77.4962 25.1758 81.3138 34.4033 81.3098 44.2166C81.3018 64.4676 64.8214 80.943 44.5723 80.943ZM75.8391 12.9587C67.4939 4.6066 56.3959 0.0047 44.5718 0C20.209 0 0.380499 19.8209 0.370699 44.184C0.367599 51.9718 2.4028 59.5738 6.2707 66.2744L0 89.1719L23.4317 83.0276C29.8877 86.5479 37.1564 88.4029 44.5542 88.4059H44.5723C68.9328 88.4059 88.7628 68.5825 88.7728 44.2192C88.7778 32.4125 84.1848 21.3107 75.8391 12.9587Z" fill="currentColor" />
      </svg>
    </a>
  );
}

export function ActionBar({ primaryHref = "/contact.html", primaryLabel = "Book site visit" }) {
  return (
    <div className="action-bar">
      <a className="btn btn-secondary" href={`tel:${PHONE}`}>Call now</a>
      <a className="btn btn-primary" href={primaryHref}>{primaryLabel}</a>
    </div>
  );
}

/* Runs the headline figures up from zero on a cubic ease-out, and respects
   a reduced-motion preference by landing on the final value immediately. */
export function Counter({ to, suffix = "" }) {
  const [n, setN] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? to : 0
  );
  const raf = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const k = Math.min(1, (ts - start) / 1100);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [to]);

  return <>{n.toLocaleString("en-IN")}{suffix}</>;
}
