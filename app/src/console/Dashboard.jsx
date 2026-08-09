import { useEffect, useState } from "react";
import { db, session } from "./api.js";
import { Alert } from "./Icons.jsx";

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const firstName = (email) => {
  const raw = (email || "").split("@")[0].split(/[._-]/)[0];
  return raw ? raw[0].toUpperCase() + raw.slice(1) : "there";
};

const clock = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const dayLabel = (iso) => {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d) / 864e5);
  if (days < 1) return clock(iso);
  if (days < 2) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }).toUpperCase();
};

export default function Dashboard({ projects, projectNames, onGoto }) {
  const [enq, setEnq] = useState(null);
  const [feed, setFeed] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      db("enquiries?select=*&order=created_at.desc&limit=200"),
      db("activity?select=*&order=at.desc&limit=6")
    ])
      .then(([e, a]) => { setEnq(e); setFeed(a); })
      .catch((err) => setError(err.message));
  }, []);

  const since = new Date(Date.now() - 864e5);
  const fresh = (enq || []).filter((e) => new Date(e.created_at) >= since).length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonth = (enq || []).filter((e) => new Date(e.created_at) >= monthStart).length;
  const blocked = projects.filter((p) => !p.published && !p.rera?.trim());

  return (
    <>
      <div className="topbar">
        <div className="grow">
          <span className="mono">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </span>
          <h1>{greet()}, {firstName(session.email())}</h1>
        </div>
        <a className="btn" href="/" target="_blank" rel="noopener noreferrer">View website</a>
        <button className="btn btn-primary" onClick={() => onGoto("projects", "new")}>+ Add project</button>
      </div>

      <div className="view">
        {error && <p className="err" role="alert">{error}</p>}

        <div className="stats">
          <div className="stat">
            <span className="mono">Total projects</span>
            <div className="n">{projects.length}</div>
            <div className="foot">
              {projects.filter((p) => p.published).length} published ·{" "}
              {projects.filter((p) => !p.published).length} draft
            </div>
          </div>
          <div className="stat">
            <span className="mono">New enquiries</span>
            <div className="n accent">{fresh}</div>
            <div className="foot">In the last 24 hours</div>
          </div>
          <div className="stat">
            <span className="mono">This month</span>
            <div className="n">{thisMonth}</div>
            <div className="foot">Enquiries across all projects</div>
          </div>
          <div className="stat">
            <span className="mono">Needs attention</span>
            <div className="n">{blocked.length}</div>
            <div className="foot">
              {blocked.length ? `${blocked[0].name} — RERA missing` : "Nothing outstanding"}
            </div>
          </div>
        </div>

        <div className="cols">
          <div>
            <div className="sec-head">
              <h2>Latest enquiries</h2>
              <button onClick={() => onGoto("enquiries")}>See all →</button>
            </div>
            {enq === null ? <p className="spinner">Loading…</p> : (
              <table className="grid">
                <thead>
                  <tr><th>When</th><th>Name</th><th>Phone</th><th>Project</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {enq.slice(0, 5).map((e) => (
                    <tr key={e.id}>
                      <td className="cell-mono">
                        {new Date(e.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, {clock(e.created_at)}
                      </td>
                      <td className="cell-name">{e.name || "—"}</td>
                      <td className="cell-mono" style={{ fontSize: 14 }}>{e.phone}</td>
                      <td>{projectNames[e.project] || e.project || "—"}</td>
                      <td><span className={`pill${e.status === "New" ? " new" : e.status === "Booked" ? " booked" : ""}`}>{e.status}</span></td>
                    </tr>
                  ))}
                  {!enq.length && (
                    <tr><td colSpan={5} style={{ color: "var(--muted)", padding: 24 }}>
                      No enquiries yet.
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <div className="sec-head"><h2>Recent activity</h2></div>
            <ul className="feed">
              {feed.map((a) => (
                <li key={a.id}>
                  <span className="mono when">{dayLabel(a.at)}</span>
                  <span>{a.summary}</span>
                </li>
              ))}
              {!feed.length && (
                <li><span style={{ color: "var(--muted)" }}>
                  Nothing yet. Saves and publishes are recorded here.
                </span></li>
              )}
            </ul>

            {blocked.length > 0 && (
              <div className="alert">
                <Alert />
                <div>
                  <h3>{blocked.length} project{blocked.length > 1 ? "s" : ""} cannot go live</h3>
                  <p>
                    {blocked.map((b) => b.name).join(", ")}{" "}
                    {blocked.length > 1 ? "are" : "is"} missing a MahaRERA number.
                  </p>
                  <button className="btn btn-sm" onClick={() => onGoto("projects", blocked[0].id)}>
                    Fix it now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
