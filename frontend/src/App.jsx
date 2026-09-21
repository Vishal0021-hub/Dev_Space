import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useState, useEffect, lazy, Suspense } from "react";

// Error pages & static lightweight elements
import { NotFound, Forbidden, OfflineBanner } from "./pages/ErrorPages";
import CustomCursor  from "./components/CustomCursor";
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
                background: "#0a0c14",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                fontSize: "14px",
                fontFamily: "Figtree, sans-serif",
              },
              success: { iconTheme: { primary: "#34d399", secondary: "#fff" } },
              error:   { iconTheme: { primary: "#f87171", secondary: "#fff" } },
            }}
          />

          <CustomCursor />

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
                <Route path="/projects/:workspaceId" element={<ErrorBoundary><Projects /></ErrorBoundary>} />
                <Route path="/boards/:projectId"     element={<ErrorBoundary><Board /></ErrorBoundary>} />
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