import { useState } from "react";
import { signIn, resetPassword } from "./api.js";
import { Lock, Eye } from "./Icons.jsx";

export default function Login({ onIn }) {
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(""); setSent("");
    try {
      await signIn(f.get("email").trim(), f.get("password"), f.get("remember") === "on");
      onIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const forgot = async (e) => {
    e.preventDefault();
    const email = document.getElementById("c-email").value.trim();
    if (!email) return setError("Enter your email address first, then press Forgot password.");
    setError("");
    try {
      await resetPassword(email);
      setSent(`If ${email} has an account, a reset link is on its way.`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login">
      <div className="login-brand">
        <div className="login-mark">
          <img src="/assets/marc-wordmark.png" alt="Marc Construction" />
          <span className="mono">Owner console</span>
        </div>

        <div className="login-pitch">
          <h1>The website is edited here — nowhere else.</h1>
          <p>
            Projects, photographs, floor plans, RERA numbers and enquiries.
            Changes go live the moment you press Publish.
          </p>
        </div>

        <span className="mono login-foot">
          Private system · Authorised users only
        </span>
      </div>

      <div className="login-form">
        <form onSubmit={submit}>
          <span className="mono">Sign in</span>
          <h1>Welcome back</h1>
          <p className="sub">Use the email Marc registered for you.</p>

          <div className="field">
            <label htmlFor="c-email">Email address</label>
            <input className="input" id="c-email" name="email" type="email"
              autoComplete="username" placeholder="you@marcconstruction.in" required />
          </div>

          <div className="field">
            <label htmlFor="c-pass">Password</label>
            <div className="pw">
              <input className="input" id="c-pass" name="password"
                type={show ? "text" : "password"} autoComplete="current-password" required />
              <button type="button" onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}>
                <Eye />
              </button>
            </div>
          </div>

          <div className="login-row">
            <label htmlFor="c-remember">
              <input id="c-remember" name="remember" type="checkbox" />
              Keep me signed in
            </label>
            <a href="#forgot" onClick={forgot}>Forgot password?</a>
          </div>

          <button type="submit" className="btn btn-primary" disabled={busy}
            style={{ width: "100%", padding: "13px" }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>

          {error && <p className="err" role="alert">{error}</p>}
          {sent && <p className="ok" role="status">{sent}</p>}

          <div className="login-note">
            <Lock />
            <span>
              Access is granted by adding an address to the staff list.
              Ask your developer to add anyone else.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
