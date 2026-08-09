/* Trigger a site rebuild, for staff only.

   The deploy hook used to live in VITE_VERCEL_DEPLOY_HOOK, which Vite inlines
   into the browser bundle — so the URL shipped to every visitor who opened
   the console's JavaScript, and anyone could POST to it and burn the build
   quota. It now sits in VERCEL_DEPLOY_HOOK (no VITE_ prefix), which stays on
   the server, and this route is the only way to reach it. */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only." });

  const hook = process.env.VERCEL_DEPLOY_HOOK;
  if (!hook) return res.status(500).json({ error: "VERCEL_DEPLOY_HOOK is not set." });

  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ error: "Not signed in." });

  /* Verify with the caller's own token rather than a service key: the staff
     table's read policy is `is_staff()`, so a real staff member gets a row
     back and anybody else gets an empty list. No secret needed here, and the
     answer comes from the same policy that guards everything else. */
  const check = await fetch(
    `${process.env.VITE_SUPABASE_URL}/rest/v1/staff?select=email&limit=1`,
    {
      headers: {
        apikey: process.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`
      }
    }
  );

  const rows = check.ok ? await check.json() : [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(403).json({ error: "That account is not on the staff list." });
  }

  const fired = await fetch(hook, { method: "POST" });
  if (!fired.ok) return res.status(502).json({ error: `Vercel refused the rebuild (${fired.status}).` });

  res.status(200).json({ ok: true });
}
