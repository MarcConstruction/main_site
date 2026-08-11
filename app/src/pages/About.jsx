import { useState } from "react";
import { Header, SlimFooter, WhatsAppFab, ActionBar } from "../components/Chrome.jsx";
import { ERAS } from "../data/projects.js";
import { card } from "../lib/img.js";

const LEADERS = [
  {
    role: "FOUNDER & MANAGING DIRECTOR",
    name: "Mr. Makarand Madhav Kulkarni",
    photo: "/assets/leader-makarand.png",
    bio: "Civil engineer by training, on site since 1987. Signs off every structural drawing and still walks each project before slab-pour."
  },
  {
    role: "DIRECTOR",
    name: "Mr. Rohan Makarand Kulkarni",
    photo: "/assets/leader-rohan.png",
    bio: "Second generation. Leads design, RERA compliance and the customer side, from first enquiry to possession letter."
  }
];

const REGS = [
  ["MahaRERA", "ALL ACTIVE PROJECTS REGISTERED"],
  ["CREDAI", "MEMBER · AHMEDNAGAR CHAPTER"],
  ["MAREDCO", "MEMBER"],
  ["MBVA", "MEMBER"]
];

export default function About() {
  const [era, setEra] = useState(0);
  const e = ERAS[era];

  return (
    <>
      <Header current="About" />

      <main>
        <div className="wrap page-head">
          <div className="about-head">
            <div>
              <span className="mono kicker">ABOUT MARC · <span lang="mr">रचनात्मक | समयबद्ध | नवनिर्मिती</span></span>
              <h1>A developer the city has watched for 39 years</h1>
              <p>
                Marc Construction has built in one city since 1987. We are answerable to
                the people we meet at the market, which is a stricter standard than any
                brochure.
              </p>
            </div>
            {/* The mark rather than a project render: this heading is about
                the company, and a single building beside it reads as that
                building's page. */}
            <figure className="blueprint about-mark">
              <img src="/assets/marc-mark.png" alt="Marc Construction" />
              <figcaption className="mono">Marc Construction</figcaption>
            </figure>
          </div>
        </div>

        <section className="wrap sec">
          <div className="sec-head">
            <span className="mono kicker">01</span><h2>The story, by decade</h2>
            <span className="note">Select a year.</span>
          </div>
          <div className="era-tabs" role="tablist" aria-label="Decade">
            {ERAS.map((x, i) => (
              <button key={x.year} type="button" className="era-tab" role="tab"
                aria-selected={era === i} onClick={() => setEra(i)}>
                {x.year}
              </button>
            ))}
          </div>
          <div className="era-body">
            <span className="era-year">{e.year}</span>
            <div>
              <h3>{e.title}</h3>
              <p>{e.body}</p>
            </div>
          </div>
        </section>

        <section className="wrap sec">
          <div className="sec-head"><span className="mono kicker">02</span><h2>Leadership</h2></div>
          <div className="leaders">
            {LEADERS.map(({ role, name, photo, bio }) => (
              <div className="blueprint leader" key={name}>
                {/* The name placeholder stays for anyone without a portrait
                    yet, rather than leaving an empty frame. */}
                <div className="shot">
                  {photo
                    ? <img src={card(photo)} alt={name} loading="lazy" />
                    : <span className="slot">{name}</span>}
                </div>
                <div className="body">
                  <span className="mono">{role}</span>
                  <h3>{name}</h3>
                  <p>{bio}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="wrap sec">
          <div className="sec-head"><span className="mono kicker">03</span><h2>Registrations &amp; recognition</h2></div>
          <div className="regs">
            {REGS.map(([title, note]) => (
              <div key={title}>
                <h3>{title}</h3>
                <span className="mono">{note}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="band-accent on-dark tight gap-top">
          <div className="wrap">
            <div className="bignums">
              <div><b>39</b><span className="mono">YEARS OF BUILDING</span></div>
              <div><b>100+</b><span className="mono">PROJECTS DELIVERED</span></div>
              <div><b>1,000+</b><span className="mono">FAMILIES HOUSED</span></div>
              <div><b>5</b><span className="mono">SITES UNDER CONSTRUCTION</span></div>
            </div>
          </div>
        </section>
      </main>

      <SlimFooter />
      <WhatsAppFab />
      <ActionBar />
    </>
  );
}
