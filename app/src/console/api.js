/* Supabase over plain fetch — the console's whole data layer.

   No client library, same reasoning as the contact form: this is a handful of
   REST calls against PostgREST plus one auth endpoint, and the README asks
   that a dependency earn its place. What a library would buy us is token
   refresh, which is handled below by simply asking for a new token when the
   old one expires. */

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const KEY_TOKEN = "marc.console.token";
const KEY_REFRESH = "marc.console.refresh";
const KEY_EMAIL = "marc.console.email";

/* "Keep me signed in" is the difference between localStorage (survives closing
   the browser) and sessionStorage (does not). On a shared office machine the
   default matters, so it defaults to off. */
export const session = {
  token: () => localStorage.getItem(KEY_TOKEN) || sessionStorage.getItem(KEY_TOKEN),
  refresh: () => localStorage.getItem(KEY_REFRESH) || sessionStorage.getItem(KEY_REFRESH),
  email: () => localStorage.getItem(KEY_EMAIL) || sessionStorage.getItem(KEY_EMAIL),
  save({ access_token, refresh_token }, email, remember) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(KEY_TOKEN, access_token);
    if (refresh_token) store.setItem(KEY_REFRESH, refresh_token);
    store.setItem(KEY_EMAIL, email);
  },
  clear() {
    for (const s of [localStorage, sessionStorage]) {
      for (const k of [KEY_TOKEN, KEY_REFRESH, KEY_EMAIL]) s.removeItem(k);
    }
  }
};

const expiry = (jwt) => {
  try { return JSON.parse(atob(jwt.split(".")[1])).exp * 1000; }
  catch { return 0; }
};

/* Supabase expires an access token after an hour. Without this the console
   kept using the dead one, and Supabase treats an expired JWT as anonymous
   rather than rejecting it -- so a request would fail the `to authenticated`
   policy and come back as "new row violates row-level security policy",
   which points at the policy instead of the token. Refresh a minute early so
   a slow upload cannot expire mid-flight. */
export async function freshToken() {
  const token = session.token();
  if (!token) return null;
  if (Date.now() < expiry(token) - 60_000) return token;

  const refresh_token = session.refresh();
  if (!refresh_token) return token;   // pre-refresh session; let the 401 handle it

  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token })
  });
  if (!res.ok) return token;

  const data = await res.json();
  const remember = Boolean(localStorage.getItem(KEY_TOKEN));
  session.save(data, session.email(), remember);
  return data.access_token;
}

export class AuthError extends Error {}

export async function signIn(email, password, remember) {
  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Sign in failed");
  session.save(data, email, remember);
  return data.access_token;
}

export async function resetPassword(email) {
  const res = await fetch(`${SB_URL}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!res.ok) throw new Error("Could not send the reset email.");
}

/* One door for every table call. A 401 means the hour-long token expired, and
   throwing AuthError lets the shell drop straight back to the login screen
   rather than each screen inventing its own handling. */
export async function db(path, { method = "GET", body, headers = {}, raw = false } = {}) {
  const token = await freshToken();
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: method === "GET" ? "" : "return=representation",
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (res.status === 401) {
    session.clear();
    throw new AuthError("Your session expired. Please sign in again.");
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  if (raw) return res;
  return res.status === 204 ? null : res.json();
}

/* Shrink an image before it leaves the browser.

   thumbs.mjs generates resized copies of everything in public/assets, which
   is why the masthead went from 28.6 MB to 630 KB. It cannot touch files in
   Supabase Storage — different host, and the build never sees them. Without
   this, a phone photograph straight off a site visit would be served at full
   size into a gallery grid and quietly undo that work.

   1800px matches the `hero` tier, the widest the site ever draws. Anything
   already smaller, or that fails to convert, is sent untouched: a slightly
   large image beats a failed upload. */
async function shrink(file, max = 1800, quality = 0.82) {
  if (!/^image\//.test(file.type) || /svg/i.test(file.type)) return file;

  try {
    const bmp = await createImageBitmap(file);
    if (bmp.width <= max) { bmp.close?.(); return file; }

    const canvas = document.createElement("canvas");
    canvas.width = max;
    canvas.height = Math.round(bmp.height * (max / bmp.width));
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();

    const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", quality));
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[a-z0-9]+$/i, ".webp"), { type: "image/webp" });
  } catch {
    return file;
  }
}

/* Storage upload. XMLHttpRequest rather than fetch purely because fetch cannot
   report upload progress, and the editor shows a percentage per file. */
export async function upload(original, onProgress) {
  const file = await shrink(original);
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const path = `${Date.now()}-${safe}`;
  /* Storage authenticates the JWT itself. An expired one is treated as
     anonymous, not rejected, so this must be fresh before the upload starts
     or the failure arrives disguised as a policy problem. */
  const token = await freshToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SB_URL}/storage/v1/object/project-media/${path}`);
    xhr.setRequestHeader("apikey", SB_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    /* No x-upsert. It made storage evaluate the UPDATE policy as well as
       INSERT, which is a second way to be rejected, and the filename above
       carries a timestamp so nothing is ever overwritten anyway. */

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status < 300
        ? resolve(`${SB_URL}/storage/v1/object/public/project-media/${path}`)
        : reject(new Error(`Upload failed (${xhr.status}) — ${xhr.responseText}`));
    xhr.onerror = () => reject(new Error("Upload failed — network error."));
    xhr.send(file);
  });
}

export const logActivity = (summary) =>
  db("activity", { method: "POST", body: { summary, actor: session.email() } })
    .catch(() => {});   // the feed is a nicety; never fail a save over it

/* Publishing rebuilds the static site.

   Via our own /api/publish rather than the Vercel hook directly: the hook URL
   must not reach the browser, or anyone who reads this bundle can trigger
   builds until the quota is gone. The route checks the caller is on the staff
   list before firing.

   If it is not configured the console says so plainly rather than pretending
   the website updated. */
export async function triggerRebuild() {
  try {
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { Authorization: `Bearer ${await freshToken()}` }
    });
    if (res.ok) return { ok: true };
    const { error } = await res.json().catch(() => ({}));
    return { ok: false, reason: error || `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}
