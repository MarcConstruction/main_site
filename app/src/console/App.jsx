import { useCallback, useEffect, useState } from "react";
import { db, session, AuthError } from "./api.js";
import { Grid, Home, Mail, Out } from "./Icons.jsx";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import Projects from "./Projects.jsx";
import ProjectEditor from "./ProjectEditor.jsx";
import Enquiries from "./Enquiries.jsx";

const NAV = [
  ["dashboard", "Dashboard", Grid],
  ["projects", "Projects", Home],
  ["enquiries", "Enquiries", Mail]
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

        <div className="rail-user">
          <span className="initials">{initials(session.email())}</span>
          <span className="who">
            {session.email()}
            <span className="mono" style={{ display: "block" }}>Director</span>
          </span>
          <button onClick={signOut} aria-label="Sign out" title="Sign out"><Out /></button>
        </div>
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
      </main>
    </div>
  );
}
