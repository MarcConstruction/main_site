import { useState } from "react";
import { Header, SlimFooter, WhatsAppFab, ActionBar } from "../components/Chrome.jsx";
import { ERAS } from "../data/projects.js";
import { card } from "../lib/img.js";

const LEADERS = [
  ["FOUNDER & MANAGING DIRECTOR", "Mr. Makarand Madhav Kulkarni",
   "Civil engineer by training, on site since 1987. Signs off every structural drawing and still walks each project before slab-pour."],
  ["DIRECTOR", "Mr. Rohan Makarand Kulkarni",
   "Second generation. Leads design, RERA compliance and the customer side, from first enquiry to possession letter."]
];

const REGS = [
  ["MahaRERA", "ALL ACTIVE PROJECTS REGISTERED"],
  ["CREDAI", "MEMBER · AHMEDNAGAR CHAPTER"],
  ["ISO 9001", "QUALITY MANAGEMENT SYSTEM"],
  ["CIN", "U45202MH1996PTC100650"]
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
              <h1>A builder the district has watched for 39 years</h1>
              <p>
                Marc Construction has built in one city since 1987. We are answerable to
                the people we meet at the market, which is a stricter standard than any
                brochure.
              </p>
            </div>
            <figure className="blueprint">
              <img src={card("/assets/trident-aerial.png")} alt="A Marc project in Ahilyanagar" loading="lazy" />
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
            {LEADERS.map(([role, name, bio]) => (
              <div className="blueprint leader" key={name}>
                <div className="shot"><span className="slot">{name}</span></div>
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
              <div><b>3,000+</b><span className="mono">FAMILIES HOUSED</span></div>
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
