import { useEffect, useState } from "react";

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TOKEN_KEY = "marc.enquiries.token";

/* Supabase Auth over plain fetch, same reasoning as the contact form: two
   endpoints do not earn a client library.

   ponytail: the access token sits in sessionStorage and is never refreshed.
   Supabase expires it after an hour, which just shows the sign-in form again
   -- fine for a list somebody opens a few times a day. Add refresh-token
   handling if that turns annoying.

   Reading this list requires a signed-in user: the anon key alone cannot see
   these rows. Which means public sign-ups MUST stay disabled in Supabase, or
   anyone could register and read every customer's phone number. */

export default function Enquiries() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signOut = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setRows(null);
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `${SB_URL}/rest/v1/enquiries?select=*&order=created_at.desc`,
          { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } }
        );
        if (res.status === 401) return signOut();
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const signIn = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { email, password } = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: SB_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.msg || "Sign in failed");
      sessionStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <main className="wrap">
        <form className="blueprint enq-login" onSubmit={signIn}>
          <h1>Enquiries</h1>
          <p className="sub">Marc staff only.</p>
          <div className="stack">
            <div className="field">
              <label htmlFor="e-email">Email</label>
              <input className="input" id="e-email" name="email" type="email"
                autoComplete="username" required />
            </div>
            <div className="field">
              <label htmlFor="e-pass">Password</label>
              <input className="input" id="e-pass" name="password" type="password"
                autoComplete="current-password" required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            {error && <p className="sub" role="alert">{error}</p>}
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="page-head enq-head-row">
        <div>
          <span className="mono kicker">ENQUIRIES</span>
          <h1>Incoming enquiries</h1>
        </div>
        <button type="button" className="btn btn-secondary" onClick={signOut}>Sign out</button>
      </div>

      {error && <p className="sub" role="alert">{error}</p>}
      {rows === null && !error && <p>Loading…</p>}
      {rows?.length === 0 && <p>Nothing yet. New enquiries appear here as they come in.</p>}

      {rows?.map((r) => (
        <article className="blueprint enq" key={r.id}>
          <div className="enq-top">
            <h3>{r.name || "No name given"}</h3>
            <span className="mono muted">
              {new Date(r.created_at).toLocaleString("en-IN", {
                dateStyle: "medium", timeStyle: "short"
              })}
            </span>
          </div>
          {r.project && <span className="mono">{r.project.toUpperCase()}</span>}
          {r.message && <p>{r.message}</p>}
          <div className="enq-actions">
            <a className="btn btn-primary" href={`tel:+91${r.phone}`}>Call {r.phone}</a>
            <a className="btn btn-secondary" href={`https://wa.me/91${r.phone}`}
              target="_blank" rel="noopener noreferrer">WhatsApp</a>
          </div>
        </article>
      ))}
    </main>
  );
}
