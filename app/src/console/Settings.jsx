import { useEffect, useState } from "react";
import { db, logActivity, triggerRebuild } from "./api.js";
import { SocialIcon, networkFor, NETWORKS } from "../lib/social.jsx";

/* Everything the footer and the contact buttons read. It lived in
   src/content/site.json, so changing a phone number meant a code edit. */

export default function Settings({ onChanged }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db("site?select=*&id=eq.1")
      .then((rows) => setS(rows[0] ?? null))
      .catch((e) => setError(e.message));
  }, []);

  if (error && !s) return <div className="view"><p className="err">{error}</p></div>;
  if (!s) return <div className="view"><p className="spinner">Loading…</p></div>;

  const set = (patch) => setS((cur) => ({ ...cur, ...patch }));
  const socials = s.socials || [];

  const save = async () => {
    setSaving(true); setError(""); setNote("");

    /* A number typed with spaces dials fine from a phone but breaks the
       wa.me link, so the WhatsApp URL is built from the digits rather than
       asked for separately and left to drift out of step with the number. */
    const digits = String(s.phone || "").replace(/[^\d]/g, "");
    if (digits.length < 10) {
      setError("The phone number needs at least 10 digits, with the country code — it becomes the Call button and the WhatsApp link.");
      setSaving(false);
      return;
    }

    const body = {
      phone: `+${digits}`,
      phone_display: s.phone_display?.trim() || `+${digits}`,
      whatsapp: `https://wa.me/${digits}`,
      email: (s.email || "").trim(),
      address: (s.address || "").trim(),
      legal: (s.legal || "").trim(),
      socials: socials
        .map((x) => ({ label: (x.label || "").trim(), url: (x.url || "").trim() }))
        .filter((x) => x.url)
    };

    try {
      const [row] = await db("site?id=eq.1", { method: "PATCH", body });
      setS(row);
      logActivity("Contact details and social links updated");
      onChanged?.();
      const r = await triggerRebuild();
      setNote(r.ok
        ? "Saved. The website is rebuilding — about a minute."
        : `Saved, but the website was not rebuilt (${r.reason}). It will update on the next deploy.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="grow">
          <span className="mono">Shown in the footer and on every Call and WhatsApp button</span>
          <h1>Contact &amp; social</h1>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save and publish"}
        </button>
      </div>

      <div className="view" style={{ maxWidth: 760 }}>
        {error && <p className="err" role="alert">{error}</p>}
        {note && <p className="ok" role="status">{note}</p>}

        <span className="mono legend">Contact</span>
        <div className="pair">
          <div className="field">
            <label htmlFor="s-phone">Phone, with country code</label>
            <input className="input" id="s-phone" value={s.phone || ""}
              placeholder="+919552555621" onChange={(e) => set({ phone: e.target.value })} />
            <span className="mono" style={{ display: "block", marginTop: 6 }}>
              The WhatsApp link is built from this, so the two can never disagree.
            </span>
          </div>
          <div className="field">
            <label htmlFor="s-display">Phone, as written on the page</label>
            <input className="input" id="s-display" value={s.phone_display || ""}
              placeholder="+91 95525 55621" onChange={(e) => set({ phone_display: e.target.value })} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="s-email">Email</label>
          <input className="input" id="s-email" type="email" value={s.email || ""}
            placeholder="info@marcconstruction.in" onChange={(e) => set({ email: e.target.value })} />
        </div>

        <div className="field">
          <label htmlFor="s-address">Office address</label>
          <textarea className="input" id="s-address" value={s.address || ""}
            onChange={(e) => set({ address: e.target.value })} />
        </div>

        <span className="mono legend" style={{ marginTop: 30 }}>Social links</span>
        <p className="sub" style={{ color: "var(--muted)", marginTop: -8 }}>
          Paste the address of each page. The right icon is chosen from the link —
          Instagram, Facebook, YouTube, LinkedIn, X and WhatsApp are recognised, and
          anything else gets a plain globe rather than being dropped.
        </p>

        {socials.map((x, i) => (
          <div className="spec-row" key={i}>
            <div className="social-preview">
              <SocialIcon url={x.url} size={22} />
              <span className="mono">{networkFor(x.url)}</span>
            </div>
            <input className="input" value={x.url || ""}
              placeholder="https://www.instagram.com/marcconstruction"
              aria-label={`Social link ${i + 1}`}
              onChange={(e) => set({ socials: socials.map((y, j) => j === i ? { ...y, url: e.target.value } : y) })} />
            <button className="btn btn-sm danger"
              onClick={() => set({ socials: socials.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        ))}

        <div className="plan-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-sm"
            onClick={() => set({ socials: [...socials, { url: "", label: "" }] })}>
            + Add a link
          </button>
          <span className="mono" style={{ alignSelf: "center", color: "var(--faint)" }}>
            Recognised: {NETWORKS.map((n) => n.label).join(", ")}
          </span>
        </div>

        <span className="mono legend" style={{ marginTop: 30 }}>Footer legal line</span>
        <div className="field">
          <label htmlFor="s-legal">CIN, MahaRERA and GST</label>
          <textarea className="input" id="s-legal" value={s.legal || ""}
            onChange={(e) => set({ legal: e.target.value })} />
          <span className="mono" style={{ display: "block", marginTop: 6 }}>
            Appears on every page. Check each number against the certificates before
            changing it.
          </span>
        </div>
      </div>
    </>
  );
}
