import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useState, useEffect, lazy, Suspense } from "react";

// Error pages & static lightweight elements
import { NotFound, Forbidden, OfflineBanner } from "./pages/ErrorPages";
import ErrorBoundary from "./components/ErrorBoundary";
import PageLoader    from "./components/PageLoader";

import { WorkspaceProvider } from "./context/WorkspaceContext";
import { SocketProvider }    from "./context/SocketContext";

// Lazy-loaded routes for code splitting
const Home         = lazy(() => import("./pages/Home"));
const Login        = lazy(() => import("./pages/Login"));
const Signup       = lazy(() => import("./pages/Signup"));
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const Projects     = lazy(() => import("./pages/Projects"));
const Board        = lazy(() => import("./pages/Board"));
const JoinPage     = lazy(() => import("./pages/JoinPage"));
const ChannelView  = lazy(() => import("./pages/ChannelView"));
const DMView       = lazy(() => import("./pages/DMView"));
const Analytics    = lazy(() => import("./pages/Analytics"));
const Settings     = lazy(() => import("./pages/Settings"));
const MeetingNotes = lazy(() => import("./pages/MeetingNotes"));

// Lazy-loaded overlay modal
const GlobalSearch = lazy(() => import("./components/GlobalSearch"));

function App() {
  const [searchOpen, setSearchOpen] = useState(false);

  // Global Cmd+K / Ctrl+K shortcut to open search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const token = localStorage.getItem("token");
        if (token) setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <BrowserRouter>
      <SocketProvider>
        <WorkspaceProvider>
          {/* ── Global offline indicator ── */}
          <OfflineBanner />

          {/* ── Toast notifications ── */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--bg-surface, #ffffff)",
                color: "var(--text-heading, #0f172a)",
                border: "1px solid var(--border, rgba(15, 23, 42, 0.12))",
                borderRadius: "16px",
                fontSize: "13px",
                fontWeight: "600",
                boxShadow: "0 14px 36px rgba(0,0,0,0.18)",
                padding: "12px 16px",
              },
              success: {
                iconTheme: { primary: "#10b981", secondary: "#ffffff" },
                style: {
                  background: "var(--bg-surface, #ffffff)",
                  color: "var(--text-heading, #0f172a)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
                style: {
                  background: "var(--bg-surface, #ffffff)",
                  color: "var(--text-heading, #0f172a)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  boxShadow: "0 14px 36px rgba(239, 68, 68, 0.12), 0 4px 14px rgba(0,0,0,0.1)",
                },
              },
            }}
          />

          {/* ── Global Search overlay (Cmd+K) ── */}
          {searchOpen && (
            <Suspense fallback={null}>
              <GlobalSearch onClose={() => setSearchOpen(false)} />
            </Suspense>
          )}

          {/* ── Routes ── */}
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/"            element={<Home/>} />
                <Route path="/login"       element={<Login />} />
                <Route path="/signup"      element={<Signup />} />
                <Route path="/join/:token" element={<JoinPage />} />

                {/* Error pages */}
                <Route path="/403" element={<Forbidden />} />
                <Route path="/404" element={<NotFound />} />

                {/* App */}
                <Route path="/dashboard"             element={<ErrorBoundary><Dashboard/></ErrorBoundary>} />
                <Route path="/board"                 element={<ErrorBoundary><Board /></ErrorBoundary>} />
                <Route path="/boards"                element={<ErrorBoundary><Board /></ErrorBoundary>} />
                <Route path="/projects"              element={<ErrorBoundary><Projects /></ErrorBoundary>} />
                <Route path="/projects/:workspaceId" element={<ErrorBoundary><Projects /></ErrorBoundary>} />
                <Route path="/boards/:projectId"     element={<ErrorBoundary><Board /></ErrorBoundary>} />
                <Route path="/channels"              element={<ErrorBoundary><ChannelView /></ErrorBoundary>} />
                <Route path="/channels/:channelId"   element={<ErrorBoundary><ChannelView /></ErrorBoundary>} />
                <Route path="/dm/:recipientId"       element={<ErrorBoundary><DMView /></ErrorBoundary>} />
                <Route path="/analytics/:workspaceId" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
                <Route path="/meetings/:workspaceId"  element={<ErrorBoundary><MeetingNotes /></ErrorBoundary>} />
                <Route path="/settings"              element={<ErrorBoundary><Settings /></ErrorBoundary>} />

                {/* 404 fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </WorkspaceProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;