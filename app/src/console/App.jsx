import { useCallback, useEffect, useState } from "react";
import { db, session, AuthError } from "./api.js";
import { Grid, Home, Mail, Cog, Out } from "./Icons.jsx";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import Projects from "./Projects.jsx";
import ProjectEditor from "./ProjectEditor.jsx";
import Enquiries from "./Enquiries.jsx";
import Settings from "./Settings.jsx";

const NAV = [
  ["dashboard", "Dashboard", Grid],
  ["projects", "Projects", Home],
  ["enquiries", "Enquiries", Mail],
  ["settings", "Contact & social", Cog]
];

const initials = (email) =>
  (email || "?").split("@")[0].split(/[._-]/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

export default function App() {
  const [signedIn, setSignedIn] = useState(() => Boolean(session.token()));
  const [view, setView] = useState("dashboard");
  const [editing, setEditing] = useState(null);
  const [projects, setProjects] = useState([]);
  const [counts, setCounts] = useState({});
  const [newCount, setNewCount] = useState(0);
  const [expired, setExpired] = useState("");
  const [me, setMe] = useState({ name: "", role: "" });
  const [editingMe, setEditingMe] = useState(false);

  /* Projects and enquiry counts live here rather than in each screen: the rail
     badge, the dashboard tiles and the projects table all read the same
     numbers, and fetching them three times would let them disagree. */
  const refresh = useCallback(async () => {
    if (!session.token()) return;
    try {
      const [ps, es] = await Promise.all([
        db("projects?select=*&order=sort_order.asc,id.asc"),
        db("enquiries?select=project,status")
      ]);
      setProjects(ps);
      setCounts(es.reduce((m, e) => ({ ...m, [e.project]: (m[e.project] || 0) + 1 }), {}));
      setNewCount(es.filter((e) => e.status === "New").length);
    } catch (err) {
      if (err instanceof AuthError) {
        setExpired(err.message);
        setSignedIn(false);
      }
    }
  }, []);

  useEffect(() => { if (signedIn) refresh(); }, [signedIn, refresh]);

  /* Own staff row: the name and title shown in the rail. Matched
     case-insensitively for the same reason is_staff() is — the address is
     stored however it was typed, and lowercased on the account. */
  const loadMe = useCallback(async () => {
    const email = session.email();
    if (!email) return;
    try {
      const rows = await db("staff?select=email,name,role");
      const mine = rows.find((r) => r.email?.toLowerCase() === email.toLowerCase());
      if (mine) setMe({ name: mine.name || "", role: mine.role || "" });
    } catch { /* the rail falls back to the email; not worth an error banner */ }
  }, []);

  useEffect(() => { if (signedIn) loadMe(); }, [signedIn, loadMe]);

  const saveMe = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next = { name: f.get("name").trim(), role: f.get("role").trim() };
    setMe(next);
    setEditingMe(false);
    try {
      await db(`staff?email=eq.${encodeURIComponent(session.email())}`, {
        method: "PATCH",
        body: next
      });
    } catch {
      /* Put it back rather than showing a name the database does not have. */
      loadMe();
    }
  };

  if (!signedIn) {
    return (
      <>
        {expired && <p className="err" style={{ textAlign: "center", padding: "10px 0", margin: 0 }}>{expired}</p>}
        <Login onIn={() => { setExpired(""); setSignedIn(true); }} />
      </>
    );
  }

  const signOut = () => { session.clear(); setSignedIn(false); };

  const goto = (v, id = null) => { setView(v); setEditing(id); };

  const projectNames = Object.fromEntries(projects.map((p) => [p.slug, p.name]));

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-top">
          <img src="/assets/marc-wordmark.png" alt="Marc Construction" />
          <span className="mono">Owner console</span>
        </div>

        <nav>
          {NAV.map(([key, label, Icon]) => (
            <button key={key} aria-current={view === key ? "page" : undefined}
              onClick={() => goto(key)}>
              <Icon />
              {label}
              {key === "enquiries" && newCount > 0 && <span className="count">{newCount}</span>}
            </button>
          ))}
        </nav>

        {editingMe ? (
          <form className="rail-user rail-edit" onSubmit={saveMe}>
            <label className="mono" htmlFor="me-name">Your name</label>
            <input className="input" id="me-name" name="name" defaultValue={me.name || ""}
              placeholder="Rohan Kulkarni" autoFocus />
            <label className="mono" htmlFor="me-role">Title</label>
            <input className="input" id="me-role" name="role" defaultValue={me.role || ""}
              placeholder="Director" />
            <div className="rail-edit-actions">
              <button type="submit" className="btn btn-sm btn-primary">Save</button>
              <button type="button" className="btn btn-sm" onClick={() => setEditingMe(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="rail-user">
            <span className="initials">{initials(me.name || session.email())}</span>
            {/* The whole block edits, because the thing people want to change
                is the thing they are looking at. */}
            <button className="who" onClick={() => setEditingMe(true)} title="Edit your name and title">
              {me.name || session.email()}
              <span className="mono" style={{ display: "block" }}>{me.role || "Staff"}</span>
            </button>
            <button onClick={signOut} aria-label="Sign out" title="Sign out"><Out /></button>
          </div>
        )}
      </aside>

      <main className="main">
        {view === "dashboard" && (
          <Dashboard projects={projects} projectNames={projectNames} onGoto={goto} />
        )}

        {view === "projects" && editing === null && (
          <Projects counts={counts} onOpen={(id) => setEditing(id)} onChanged={refresh} />
        )}

        {view === "projects" && editing !== null && (
          <ProjectEditor id={editing} onBack={() => { setEditing(null); refresh(); }} onChanged={refresh} />
        )}

        {view === "enquiries" && (
          <Enquiries projectNames={projectNames} onCount={setNewCount} />
        )}

        {view === "settings" && <Settings />}
      </main>
    </div>
  );
}
