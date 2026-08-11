import { useRef, useState } from "react";
import { Header, SlimFooter, WhatsAppFab, ActionBar } from "../components/Chrome.jsx";
import { PROJECTS, PHONE, PHONE_DISPLAY, WHATSAPP } from "../data/projects.js";
import { sendEnquiry } from "../lib/enquiry.js";

const OFFICE = [
  ["OFFICE", "Marc House, Opposite Datta Mandir, Nagar–Manmad Road, Savedi, Ahilyanagar (Ahmednagar), Maharashtra 414003"],
  ["HOURS", "Monday–Sunday, 10:00–19:00 · Site visits by appointment"],
  ["EMAIL", "info@marcconstruction.in"],
  ["ENTITY", "Madhumalati Constructions Pvt Ltd · Member of MAREDCO and MBVA"]
];

export default function Contact() {
  const [status, setStatus] = useState("idle");
  const formRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!formRef.current.reportValidity()) return;

    const data = Object.fromEntries(new FormData(formRef.current));

    /* Honeypot: a hidden field no human can see. Bots fill every input, so
       anything here is automated. Show them the success state and drop it. */
    if (data.company) return setStatus("sent");

    setStatus("sending");
    try {
      await sendEnquiry({
        name: data.name,
        phone: data.phone,
        project: data.project,
        message: data.message,
        source: "contact"
      });
      setStatus("sent");
    } catch (err) {
      console.error("enquiry failed", err);
      setStatus("error");
    }
  };

  return (
    <>
      <Header current="Contact" />

      <main>
        <div className="wrap page-head">
          <span className="mono kicker">CONTACT</span>
          <h1>Talk to us before you decide</h1>
          <p>
            Call, WhatsApp, or leave your number. A Marc person replies the same working
            day. Site visits run every day from 10:00 to 19:00.
          </p>
        </div>

        <div className="wrap quick-actions">
          <a className="btn btn-secondary" href={`tel:${PHONE}`}>Call</a>
          <a className="btn btn-primary" href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>

        <div className="wrap contact-wrap">
          <div className="contact">
            <div className="blueprint contact-form" id="enquiry">
              {status !== "sent" ? (
                <form ref={formRef} onSubmit={submit} noValidate>
                  <h2>Request a call back</h2>
                  <p className="sub">Name and phone are enough. We do not share your number.</p>
                  <div className="stack">
                    <div className="field">
                      <label htmlFor="f-name">Full name</label>
                      <input className="input" id="f-name" name="name" type="text" autoComplete="name" placeholder="Your name" />
                    </div>
                    <div className="field">
                      <label htmlFor="f-phone">Phone number *</label>
                      <input className="input" id="f-phone" name="phone" type="tel" inputMode="numeric"
                        pattern="[0-9]{10}" required autoComplete="tel-national" placeholder="10-digit mobile" />
                    </div>
                    <div className="field">
                      <label htmlFor="f-project">Project of interest</label>
                      <select className="input" id="f-project" name="project" defaultValue="">
                        <option value="">Any, help me choose</option>
                        {PROJECTS.filter((p) => p.status === "Ongoing").map((p) => (
                          <option key={p.slug} value={p.slug}>{p.name}, {p.locality}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="f-message">Message</label>
                      <textarea className="input" id="f-message" name="message"
                        placeholder="Configuration, budget, when you plan to move" />
                    </div>
                    <div className="field hp" aria-hidden="true">
                      <label htmlFor="f-company">Company</label>
                      <input id="f-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
                      {status === "sending" ? "Sending…" : "Send enquiry"}
                    </button>
                    {status === "error" && (
                      <p className="sub" role="alert">
                        That did not send. Please call <a href={`tel:${PHONE}`}>{PHONE_DISPLAY}</a> or
                        message us on <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp</a>.
                        We do not want to lose your enquiry.
                      </p>
                    )}
                    <span className="mono consent">
                      BY SENDING THIS YOU AGREE TO BE CONTACTED ABOUT MARC PROJECTS.
                    </span>
                  </div>
                </form>
              ) : (
                <div className="sent" tabIndex={-1}>
                  <div className="mark">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                  </div>
                  <h2>Enquiry received</h2>
                  <p>
                    A Marc executive will call you today between 10:00 and 19:00.
                  </p>
                  <span className="mono">FOR ANYTHING URGENT, CALL {PHONE_DISPLAY}.</span>
                  <div className="actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setStatus("idle")}>
                      Send another enquiry
                    </button>
                    <a className="btn btn-primary" href="/projects.html">Browse projects</a>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="reach">
                <a className="blueprint" href={`tel:${PHONE}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" aria-hidden="true">
                    <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
                  </svg>
                  <span className="mono">CALL</span>
                  <h3>{PHONE_DISPLAY}</h3>
                  <p>Mon–Sun, 10:00–19:00</p>
                </a>
                <a className="blueprint" href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" aria-hidden="true">
                    <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.8A8.5 8.5 0 1 1 21 11.5z" />
                    <path d="M8.5 9.5c0 3 2.5 5.5 5.5 5.5" />
                  </svg>
                  <span className="mono">WHATSAPP</span>
                  <h3>Chat with us</h3>
                  <p>Floor plans and price sheets on request</p>
                </a>
              </div>

              <div className="blueprint map contact-map">
                <div className="shot map-canvas">
                  <iframe title="Map of Marc House, Savedi, Ahilyanagar" loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src="https://maps.google.com/maps?q=Marc%20House%2C%20Nagar-Manmad%20Road%2C%20Savedi%2C%20Ahmednagar%2C%20Maharashtra%20414003&z=15&output=embed" />
                </div>
                <div className="bar">
                  <span className="mono">SAVEDI · NAGAR–MANMAD ROAD</span>
                  <a className="btn btn-secondary" target="_blank" rel="noopener noreferrer"
                    href="https://www.google.com/maps/search/?api=1&query=Marc+House+Savedi+Ahilyanagar">
                    Get directions
                  </a>
                </div>
              </div>

              <div className="rows contact-rows">
                {OFFICE.map(([k, v]) => (
                  <div className="row-grid" key={k}>
                    <span className="mono muted">{k}</span>
                    <span>{k === "EMAIL" ? <a href={`mailto:${v}`}>{v}</a> : v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <SlimFooter />
      <WhatsAppFab />
      <ActionBar primaryHref="#enquiry" />
    </>
  );
}
