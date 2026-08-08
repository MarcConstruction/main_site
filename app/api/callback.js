/* Step 2 of Decap's GitHub login: swap the code GitHub sent for a token, then
   hand it to the CMS window that opened this one.

   Decap's handshake is fixed: this page posts "authorizing:github" to its
   opener, waits for the same message back, then replies with
   "authorization:github:success:<json>". Deviate and the popup hangs. */

export default async function handler(req, res) {
  const { code, state } = req.query;
  const expected = /(?:^|;\s*)cms_oauth_state=([a-f0-9]+)/.exec(req.headers.cookie || "")?.[1];

  if (!code || !state || !expected || state !== expected) {
    return res.status(400).send("Login state did not match. Start again from /admin/.");
  }

  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });

  const data = await r.json();
  if (!data.access_token) {
    return res
      .status(400)
      .send(`GitHub refused the token exchange: ${data.error_description || data.error || "unknown error"}`);
  }

  const payload = JSON.stringify({ token: data.access_token, provider: "github" });

  // One-shot cookie; burn it so the same state cannot be replayed.
  res.setHeader("Set-Cookie", "cms_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<meta charset="utf-8" />
<title>Signing in…</title>
<p>Signing you in…</p>
<script>
(function () {
  function receive(e) {
    if (e.data !== "authorizing:github") return;
    window.removeEventListener("message", receive, false);
    window.opener.postMessage('authorization:github:success:${payload}', e.origin);
  }
  window.addEventListener("message", receive, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>`);
}
