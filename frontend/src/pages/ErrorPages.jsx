import { useNavigate } from "react-router-dom";

/* ── Shared animated background ── */
const PageWrapper = ({ children }) => (
  <div style={{
    minHeight: "100vh",
    background: "rgb(var(--bg-canvas))",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 24,
    position: "relative", overflow: "hidden",
  }}>
    {/* Decorative blobs */}
    <div style={{ position: "absolute", top: "10%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: "rgb(var(--accent) / 0.08)", filter: "blur(80px)", pointerEvents: "none" }}/>
    <div style={{ position: "absolute", bottom: "15%", right: "10%", width: 250, height: 250, borderRadius: "50%", background: "rgb(var(--accent) / 0.05)", filter: "blur(60px)", pointerEvents: "none" }}/>
    {children}
  </div>
);

const ActionButton = ({ onClick, primary, children }) => (
  <button onClick={onClick} style={{
    background: primary ? "rgb(var(--accent))" : "rgb(var(--bg-surface))",
    border: primary ? "none" : "1px solid rgb(var(--border))",
    borderRadius: 12, padding: "10px 22px",
    color: primary ? "#fff" : "rgb(var(--text-heading))",
    fontSize: 13, fontWeight: primary ? 700 : 600,
    cursor: "pointer", transition: "all 0.15s",
  }}
    onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
  >
    {children}
  </button>
);

/* ════════════════════════════════════════════════
   404 — Page Not Found
════════════════════════════════════════════════ */
export function NotFound() {
  const navigate = useNavigate();
  return (
    <PageWrapper>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        {/* Big number */}
        <div style={{
          fontSize: 120, fontWeight: 900, lineHeight: 1,
          color: "rgb(var(--accent))",
          marginBottom: 12,
          letterSpacing: "-0.04em",
        }}>
          404
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "rgb(var(--text-heading))", marginBottom: 10, letterSpacing: "-0.02em" }}>
          Page not found
        </h1>
        <p style={{ fontSize: 14, color: "rgb(var(--text-muted))", marginBottom: 36, lineHeight: 1.7 }}>
          The page you're looking for doesn't exist,<br/>may have been moved, or you don't have access.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <ActionButton primary onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </ActionButton>
          <ActionButton onClick={() => navigate(-1)}>
            ← Go Back
          </ActionButton>
        </div>

        {/* Subtle breadcrumb */}
        <div style={{ marginTop: 40, fontSize: 12, color: "rgba(255,255,255,0.18)" }}>
          DevSpace · {window.location.pathname}
        </div>
      </div>
    </PageWrapper>
  );
}

/* ════════════════════════════════════════════════
   403 — Forbidden / No Access
════════════════════════════════════════════════ */
export function Forbidden() {
  const navigate = useNavigate();
  return (
    <PageWrapper>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        {/* Lock icon */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 90, height: 90, borderRadius: "50%",
            background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.2)",
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>

        <div style={{
          fontSize: 72, fontWeight: 900, lineHeight: 1,
          color: "#EF4444",
          marginBottom: 12,
          letterSpacing: "-0.04em",
        }}>
          403
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "rgb(var(--text-heading))", marginBottom: 10, letterSpacing: "-0.02em" }}>
          Access Denied
        </h1>
        <p style={{ fontSize: 14, color: "rgb(var(--text-muted))", marginBottom: 36, lineHeight: 1.7 }}>
          You don't have permission to view this page.<br/>
          Ask your workspace owner to grant you access.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <ActionButton primary onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </ActionButton>
          <ActionButton onClick={() => navigate(-1)}>
            ← Go Back
          </ActionButton>
        </div>
      </div>
    </PageWrapper>
  );
}

/* ════════════════════════════════════════════════
   Offline banner (imported by App.jsx)
   Shows a slim toast-like bar when internet drops
════════════════════════════════════════════════ */
import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOff = () => setOffline(true);
    const goOn  = () => setOffline(false);
    window.addEventListener("offline", goOff);
    window.addEventListener("online",  goOn);
    return () => {
      window.removeEventListener("offline", goOff);
      window.removeEventListener("online",  goOn);
    };
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: "#B45309",
      color: "#fff", fontSize: 13, fontWeight: 600,
      padding: "9px 20px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
      animation: "slideDown 0.3s ease",
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
      You're offline — some features may be unavailable
    </div>
  );
}
