import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../console/App.jsx";
import "../styles/console.css";

/* A crash used to leave a white page and nothing else — no message, no clue
   which of the console's screens broke. For an internal tool with one user
   and no error reporting, showing the actual error is worth fifteen lines. */
class Boundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error("Console crashed:", err); }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <main className="wrap" style={{ padding: 40, maxWidth: 720 }}>
        <span className="mono">Console error</span>
        <h1>Something broke on this screen</h1>
        <p style={{ color: "var(--muted)" }}>
          The rest of the console is fine — reload to get back to it. Send this
          text on and it names the cause exactly.
        </p>
        <pre style={{
          background: "var(--panel)", border: "1px solid var(--line)",
          padding: 16, overflowX: "auto", fontSize: 13
        }}>{String(this.state.err?.stack || this.state.err)}</pre>
        <button className="btn btn-primary" onClick={() => location.reload()}>Reload</button>
      </main>
    );
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </StrictMode>
);
