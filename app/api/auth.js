import { randomBytes } from "node:crypto";

/* Step 1 of Decap's GitHub login: bounce the editor to GitHub.
   Netlify gave this away as Git Gateway; on Vercel it is two small functions.

   The client secret never appears here -- this endpoint only carries the
   public client id. The secret is used once, server-side, in callback.js. */

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return res.status(500).send("GITHUB_CLIENT_ID is not set in Vercel.");

  /* CSRF: GitHub hands this value back on the return trip, and callback.js
     refuses anything that does not match the cookie. Without it, an attacker
     can complete someone else's login. */
  const state = randomBytes(16).toString("hex");
  const host = req.headers["x-forwarded-host"] || req.headers.host;

  res.setHeader(
    "Set-Cookie",
    `cms_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `https://${host}/api/callback`,
    /* ponytail: public_repo, not repo. The token then cannot touch any of your
       private repositories. If main_site is ever made private this must become
       `repo`, or the CMS will fail to load with a confusing 404. */
    scope: "public_repo",
    state
  });

  res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
}
