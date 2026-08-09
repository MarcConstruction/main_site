import { useEffect, useMemo, useState } from "react";
import { db, logActivity } from "./api.js";

const STATUSES = ["New", "Called", "Site visit", "Booked", "Closed"];
const RANGES = {
  "This month": () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  "Last 3 months": () => new Date(Date.now() - 90 * 864e5),
  "All time": () => null
};

const when = (iso) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const pillClass = (s) =>
  `pill${s === "New" ? " new" : s === "Booked" ? " booked" : ""}`;

/* Excel opens a CSV with the system locale's separator, and a phone number
   like 9822041155 arrives as a number and loses nothing — but a leading zero
   would. Quoting every field keeps commas in messages from splitting columns. */
function toCSV(rows, names) {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Received", "Name", "Phone", "Project", "Status", "Message"];
  const body = rows.map((r) =>
    [new Date(r.created_at).toLocaleString("en-IN"), r.name, r.phone,
     names[r.project] || r.project || "", r.status, r.message].map(cell).join(",")
  );
  return [head.map(cell).join(","), ...body].join("\r\n");
}

export default function Enquiries({ projectNames, onCount }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [range, setRange] = useState("This month");
  const [ticked, setTicked] = useState(() => new Set());

  useEffect(() => {
    db("enquiries?select=*&order=created_at.desc")
      .then((d) => { setRows(d); onCount?.(d.filter((r) => r.status === "New").length); })
      .catch((e) => setError(e.message));
  }, [onCount]);

  const shown = useMemo(() => {
    if (!rows) return [];
    const from = RANGES[range]();
    const needle = q.trim().toLowerCase();
    return rows.filter((r) =>
      (filter === "All" || r.status === filter) &&
      (!from || new Date(r.created_at) >= from) &&
      (!needle || `${r.name || ""} ${r.phone}`.toLowerCase().includes(needle))
    );
  }, [rows, filter, q, range]);

  const setStatus = async (row, status) => {
    const before = row.status;
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)));
    try {
      await db(`enquiries?id=eq.${row.id}`, { method: "PATCH", body: { status } });
      logActivity(`Enquiry from ${row.name || row.phone} marked ${status}`);
    } catch (e) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: before } : r)));
      setError(e.message);
    }
  };

  const exportCSV = () => {
    const picked = ticked.size ? shown.filter((r) => ticked.has(r.id)) : shown;
    const blob = new Blob(["﻿" + toCSV(picked, projectNames)], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `marc-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const toggle = (id) => setTicked((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  return (
    <>
      <div className="topbar">
        <div className="grow">
          <span className="mono">Showing {shown.length} of {rows?.length ?? 0}</span>
          <h1>Enquiries</h1>
        </div>
        <input className="input" style={{ maxWidth: 260 }} placeholder="Search name or phone"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 170 }} value={range}
          onChange={(e) => setRange(e.target.value)}>
          {Object.keys(RANGES).map((r) => <option key={r}>{r}</option>)}
        </select>
        <button className="btn btn-primary" onClick={exportCSV} disabled={!shown.length}>
          Export CSV
        </button>
      </div>

      <div className="view">
        <div className="filters">
          {["All", ...STATUSES].map((s) => (
            <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>

        {error && <p className="err" role="alert">{error}</p>}
        {rows === null && !error && <p className="spinner">Loading enquiries…</p>}

        {rows && (
          <div className="card">
            <table className="grid">
              <thead>
                <tr>
                  <th style={{ width: 34 }} />
                  <th>Received</th><th>Name</th><th>Phone</th><th>Project</th><th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <input type="checkbox" checked={ticked.has(r.id)}
                        onChange={() => toggle(r.id)} aria-label={`Select ${r.name || r.phone}`} />
                    </td>
                    <td className="cell-mono">{when(r.created_at)}</td>
                    <td className="cell-name">{r.name || "—"}</td>
                    <td className="cell-mono" style={{ fontSize: 14 }}>{r.phone}</td>
                    <td>{projectNames[r.project] || r.project || "—"}</td>
                    <td>
                      <select className={pillClass(r.status)} value={r.status}
                        onChange={(e) => setStatus(r, e.target.value)}
                        style={{ border: 0, appearance: "none", cursor: "pointer" }}
                        aria-label={`Status for ${r.name || r.phone}`}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="row-actions">
                        <a className="btn btn-sm" href={`tel:+91${r.phone}`}>Call</a>
                        <a className="btn btn-sm" target="_blank" rel="noopener noreferrer"
                          href={`https://wa.me/91${r.phone}`}>WhatsApp</a>
                      </div>
                    </td>
                  </tr>
                ))}
                {!shown.length && (
                  <tr><td colSpan={7} style={{ color: "var(--muted)", padding: 30 }}>
                    Nothing matches that filter.
                  </td></tr>
                )}
              </tbody>
            </table>
            <div className="table-foot">
              <span className="mono">
                {ticked.size ? `${ticked.size} ticked — export sends only these` :
                  "Tick rows to export a subset · enquiries are kept indefinitely"}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
