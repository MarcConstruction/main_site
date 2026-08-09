/* Supabase over plain fetch — the console's whole data layer.

   No client library, same reasoning as the contact form: this is a handful of
   REST calls against PostgREST plus one auth endpoint, and the README asks
   that a dependency earn its place. What a library would buy us is token
   refresh, which is handled below by simply asking for a new token when the
   old one expires. */

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const KEY_TOKEN = "marc.console.token";
const KEY_EMAIL = "marc.console.email";

/* "Keep me signed in" is the difference between localStorage (survives closing
   the browser) and sessionStorage (does not). On a shared office machine the
   default matters, so it defaults to off. */
export const session = {
  token: () => localStorage.getItem(KEY_TOKEN) || sessionStorage.getItem(KEY_TOKEN),
  email: () => localStorage.getItem(KEY_EMAIL) || sessionStorage.getItem(KEY_EMAIL),
  save(token, email, remember) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(KEY_TOKEN, token);
    store.setItem(KEY_EMAIL, email);
  },
  clear() {
    for (const s of [localStorage, sessionStorage]) {
      s.removeItem(KEY_TOKEN);
      s.removeItem(KEY_EMAIL);
    }
  }
};

export class AuthError extends Error {}

export async function signIn(email, password, remember) {
  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Sign in failed");
  session.save(data.access_token, email, remember);
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
  const token = session.token();
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

/* Storage upload. XMLHttpRequest rather than fetch purely because fetch cannot
   report upload progress, and the editor shows a percentage per file. */
export function upload(file, onProgress) {
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const path = `${Date.now()}-${safe}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SB_URL}/storage/v1/object/project-media/${path}`);
    xhr.setRequestHeader("apikey", SB_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${session.token()}`);
    xhr.setRequestHeader("x-upsert", "true");

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

/* Publishing rebuilds the static site. Without the hook set, changes sit in
   Supabase until the next deploy — so this says so out loud rather than
   pretending the site updated. */
export async function triggerRebuild() {
  const hook = import.meta.env.VITE_VERCEL_DEPLOY_HOOK;
  if (!hook) return { ok: false, reason: "no-hook" };
  try {
    await fetch(hook, { method: "POST" });
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
