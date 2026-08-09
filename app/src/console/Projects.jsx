import { useEffect, useState } from "react";
import { db, logActivity, triggerRebuild } from "./api.js";
import { Pencil, Trash, Eye } from "./Icons.jsx";

const asDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function Projects({ counts, onOpen, onChanged }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);

  const load = () =>
    db("projects?select=*&order=sort_order.asc,id.asc")
      .then(setRows).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const shown = (rows || []).filter((r) =>
    !q.trim() || `${r.name} ${r.locality}`.toLowerCase().includes(q.trim().toLowerCase()));

  const togglePublished = async (row) => {
    const next = !row.published;
    /* The database refuses to publish a row without a RERA value. Saying so
       here means the owner learns why rather than meeting a raw constraint
       error from Postgres. */
    if (next && !row.rera?.trim()) {
      setError(`${row.name} needs a MahaRERA value before it can go live. Open it and fill the Compliance tab.`);
      return;
    }
    setError(""); setNote("");
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, published: next } : r)));
    try {
      await db(`projects?id=eq.${row.id}`, { method: "PATCH", body: { published: next } });
      logActivity(`${row.name} ${next ? "published" : "moved to draft"}`);
      onChanged?.();

      /* This switch changes what the public site shows, so it has to rebuild
         it — the same as Publish in the editor. Without this, flipping a
         project to draft looked like it worked while the website carried on
         serving it, which is exactly how this was found. */
      const r = await triggerRebuild();
      setNote(r.ok
        ? `${row.name} is now ${next ? "published" : "a draft"}. The website is rebuilding — about a minute.`
        : `Saved, but the website was not rebuilt (${r.reason}). It will update on the next deploy.`);
    } catch (e) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, published: !next } : r)));
      setError(e.message);
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete ${row.name}? Its enquiries are kept, but the project and its page go for good.`)) return;
    try {
      await db(`projects?id=eq.${row.id}`, { method: "DELETE" });
      logActivity(`${row.name} deleted`);
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      onChanged?.();
    } catch (e) { setError(e.message); }
  };

  /* Drag to reorder. HTML5 drag-and-drop rather than a library: rows are a
     single flat list, and dnd-kit would be 40 kB to move one integer. */
  const drop = async (target) => {
    setOver(null);
    if (!drag || drag.id === target.id) return setDrag(null);

    const list = [...rows];
    const from = list.findIndex((r) => r.id === drag.id);
    const to = list.findIndex((r) => r.id === target.id);
    list.splice(to, 0, ...list.splice(from, 1));

    const renumbered = list.map((r, i) => ({ ...r, sort_order: i * 10 }));
    setRows(renumbered);
    setDrag(null);

    try {
      /* One upsert with the whole list, not one PATCH per row: reordering ten
         projects should be one request, and a partial failure mid-loop would
         leave the running order scrambled. */
      await db("projects?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: renumbered.map(({ id, sort_order }) => ({ id, sort_order }))
      });
      logActivity("Project order changed");
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="grow">
          <span className="mono">
            {rows?.length ?? 0} projects · {rows?.filter((r) => r.published).length ?? 0} published
            · {rows?.filter((r) => !r.published).length ?? 0} draft
          </span>
          <h1>Projects</h1>
        </div>
        <input className="input" style={{ maxWidth: 260 }} placeholder="Search projects"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-primary" onClick={() => onOpen("new")}>+ Add project</button>
      </div>

      <div className="view">
        {error && <p className="err" role="alert">{error}</p>}
        {note && <p className="ok" role="status">{note}</p>}
        {rows === null && !error && <p className="spinner">Loading projects…</p>}

        {rows && (
          <div className="card">
            <table className="grid">
              <thead>
                <tr>
                  <th style={{ width: 34 }} />
                  <th>Project</th><th>Locality</th><th>Status</th><th>MahaRERA</th>
                  <th>Enquiries</th><th>Last edited</th><th>Live</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}
                    draggable={!q}
                    className={`${drag?.id === r.id ? "dragging" : ""} ${over === r.id ? "drop-target" : ""}`}
                    onDragStart={() => setDrag(r)}
                    onDragEnd={() => { setDrag(null); setOver(null); }}
                    onDragOver={(e) => { e.preventDefault(); setOver(r.id); }}
                    onDrop={(e) => { e.preventDefault(); drop(r); }}>
                    <td className="drag" title={q ? "Clear the search to reorder" : "Drag to reorder"}>⠿</td>
                    <td className="cell-name">{r.name}</td>
                    <td>{r.locality}</td>
                    <td>{r.status}</td>
                    <td className="cell-mono">{r.rera?.trim() || "Not filled"}</td>
                    <td>{counts[r.slug] ?? 0}</td>
                    <td className="cell-mono">{asDate(r.updated_at)}</td>
                    <td>
                      <span className="switch">
                        <button role="switch" aria-checked={r.published}
                          aria-label={`${r.published ? "Unpublish" : "Publish"} ${r.name}`}
                          onClick={() => togglePublished(r)} />
                        <span className="lbl">{r.published ? "Published" : "Draft"}</span>
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-icon" title="Edit" onClick={() => onOpen(r.id)}><Pencil /></button>
                        <a className="btn btn-icon" title="View on site" target="_blank" rel="noopener noreferrer"
                          href={`/project.html?p=${r.slug}`}><Eye /></a>
                        <button className="btn btn-icon danger" title="Delete" onClick={() => remove(r)}><Trash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-foot">
              <span className="mono">
                {q ? "Clear the search to change the order"
                   : "Drag the handle to change the order on the website"}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
