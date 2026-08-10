import { useEffect, useRef, useState } from "react";
import { PHONE, PHONE_DISPLAY, WHATSAPP } from "../data/projects.js";
import { sendEnquiry, fetchBrochure } from "../lib/enquiry.js";

/* The brochure is worth a name and a number. Same fields as the contact form
   and the same insert, tagged source: "brochure" so the console can tell the
   two apart.

   The file only arrives after the enquiry is recorded. If the insert fails
   the download does not happen and the dialog says so — handing over the PDF
   anyway would mean losing the lead silently, which is the whole point of
   asking. */

export default function BrochureDialog({ project, onClose }) {
  const [status, setStatus] = useState("idle");
  const formRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("input")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!formRef.current.reportValidity()) return;
    const data = Object.fromEntries(new FormData(formRef.current));
    if (data.company) return setStatus("sent");     // honeypot

    setStatus("sending");
    try {
      await sendEnquiry({
        name: data.name,
        phone: data.phone,
        project: project.slug,
        message: data.message,
        source: "brochure"
      });
      setStatus("sent");
      fetchBrochure(project.brochureUrl, `${project.slug}-brochure.pdf`);
    } catch (err) {
      console.error("brochure enquiry failed", err);
      setStatus("error");
    }
  };

  return (
    <div className="lightbox brochure-modal" role="dialog" aria-modal="true"
      aria-label={`Download the ${project.name} brochure`}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="blueprint brochure-card" ref={dialogRef}>
        <button type="button" className="btn btn-icon brochure-close"
          aria-label="Close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        {status !== "sent" ? (
          <form ref={formRef} onSubmit={submit} noValidate>
            <span className="mono kicker">{project.name} · Brochure</span>
            <h2>Where should we send it?</h2>
            <p className="sub">
              Name and phone are enough. The download starts as soon as you send this.
            </p>

            <div className="stack">
              <div className="field">
                <label htmlFor="b-name">Full name</label>
                <input className="input" id="b-name" name="name" type="text"
                  autoComplete="name" placeholder="Your name" />
              </div>
              <div className="field">
                <label htmlFor="b-phone">Phone number *</label>
                <input className="input" id="b-phone" name="phone" type="tel"
                  inputMode="numeric" pattern="[0-9]{10}" required
                  autoComplete="tel-national" placeholder="10-digit mobile" />
              </div>
              <div className="field">
                <label htmlFor="b-message">Anything you want to ask</label>
                <textarea className="input" id="b-message" name="message"
                  placeholder="Configuration, budget, when you plan to move" />
              </div>

              <div className="field hp" aria-hidden="true">
                <label htmlFor="b-company">Company</label>
                <input id="b-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send and download"}
              </button>

              {status === "error" && (
                <p className="sub" role="alert">
                  That did not send, so the brochure has not downloaded. Call{" "}
                  <a href={`tel:${PHONE}`}>{PHONE_DISPLAY}</a> or message us on{" "}
                  <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp</a> and
                  we will send it across.
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
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" /></svg>
            </div>
            <h2>On its way</h2>
            <p>
              The {project.name} brochure is downloading. A Marc executive will call you
              today between 10:00 and 19:00.
            </p>
            <div className="actions">
              {/* Browsers block downloads they did not tie to a click often
                  enough that a second, explicit one is worth having. */}
              <a className="btn btn-secondary" href={project.brochureUrl}
                target="_blank" rel="noopener noreferrer">Download again</a>
              <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
