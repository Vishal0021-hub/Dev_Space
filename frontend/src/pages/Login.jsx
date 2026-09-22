import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Sun, 
  Moon, 
  CheckCircle2, 
  ShieldCheck, 
  Activity,
  Zap
} from "lucide-react";
import API from "../services/api";
import { useTheme, THEMES } from "../context/ThemeContext";
import "../utils/Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const { theme, setTheme, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return toast.error("Please enter your email and password");
    }

    setLoading(true);
    const loadingToast = toast.loading("Authenticating...");
    try {
      const res = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      toast.success("Welcome back!", { id: loadingToast });
      setTimeout(() => {
        navigate(redirect);
      }, 500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login Failed", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-grid-pattern">
      
      {/* ── Top Navigation Bar ── */}
      <header className="auth-nav">
        <Link to="/" className="flex items-center gap-2.5 text-inherit no-underline">
          <div className="w-8 h-8 rounded-xl btn-brand-accent flex items-center justify-center font-black text-xs font-mono shadow-md">
            DS
          </div>
          <span className="font-extrabold text-base sm:text-lg tracking-tight">DevSpace</span>
        </Link>

        {/* Right Actions: Theme Toggle & Link to Signup */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-black/5 dark:bg-white/5 border border-inherit p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setTheme(THEMES.DAYLIGHT)}
              className={`px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                !isDark 
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm" 
                  : "opacity-60 hover:opacity-100"
              }`}
              title="Switch to Daylight Light"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Daylight</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme(THEMES.WARM_DARK)}
              className={`px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                isDark 
                  ? "brand-accent-text bg-amber-500/15 border border-amber-500/30 shadow-sm" 
                  : "opacity-60 hover:opacity-100"
              }`}
              title="Switch to HeroUI Warm Dark"
            >
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Warm Dark</span>
            </button>
          </div>

          <Link to="/signup" className="text-xs font-semibold hover:opacity-80 transition text-inherit no-underline hidden sm:inline">
            Create account →
          </Link>
        </div>
      </header>

      {/* ── Main Auth Area ── */}
      <main className="auth-main">
        <div className="auth-split-grid">
          
          {/* ── FORM CARD (Left / Center on Mobile) ── */}
          <div className="auth-card">
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">
              Don't have a DevSpace account?{" "}
              <Link to="/signup" className="brand-accent-text font-semibold hover:underline">
                Create one free →
              </Link>
            </p>

            <form onSubmit={handleLogin}>
              {/* Email Field */}
              <div className="auth-field">
                <label className="auth-label">Email address</label>
                <div className="auth-input-wrap">
                  <Mail className="auth-input-icon" />
                  <input
                    type="email"
                    placeholder="name@company.dev"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="auth-field">
                <div className="flex items-center justify-between mb-1">
                  <label className="auth-label" style={{ marginBottom: 0 }}>Password</label>
                  <a href="/forgot-password" className="text-[11px] opacity-70 hover:opacity-100 text-inherit">
                    Forgot?
                  </a>
                </div>
                <div className="auth-input-wrap">
                  <Lock className="auth-input-icon" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    className="auth-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="auth-submit-btn btn-brand-accent shadow-md"
                disabled={loading}
              >
                <span>{loading ? "Authenticating..." : "Sign in to DevSpace"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="auth-divider">or continue with</div>

            {/* OAuth Buttons */}
            <div className="auth-oauth-grid">
              <button 
                type="button" 
                onClick={() => toast("GitHub SSO available for enterprise workspaces")}
                className="auth-oauth-btn"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
                </svg>
                <span>GitHub</span>
              </button>

              <button 
                type="button" 
                onClick={() => toast("Google SSO available for enterprise workspaces")}
                className="auth-oauth-btn"
              >
                <svg width="15" height="15" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Google</span>
              </button>
            </div>

            <div className="auth-footer">
              Protected by 256-bit encryption · <a href="/terms" className="text-inherit underline">Terms</a> &amp; <a href="/privacy" className="text-inherit underline">Privacy</a>
            </div>
          </div>

          {/* ── SHOWCASE SIDE (Right - Desktop Only, Professional SaaS) ── */}
          <div className="auth-showcase-panel">
            
            {/* Live Telemetry Card */}
            <div className="auth-telemetry-box">
              <div className="flex items-center justify-between pb-3 border-b border-inherit mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-dot"></span>
                  <span className="text-xs font-bold font-mono">DevSpace Active Sprint</span>
                </div>
                <span className="text-[11px] opacity-60 font-mono">Sprint 42</span>
              </div>

              <div className="space-y-3 font-sans">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">Optimistic Drag-and-Drop Kanban</div>
                    <div className="text-[11px] opacity-70">Real-time state broadcast with sub-15ms sync.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Activity className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">Async Daily Standups & Heatmaps</div>
                    <div className="text-[11px] opacity-70">Keep teams aligned without 30-minute status meetings.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">Socket.IO Real-Time Channels</div>
                    <div className="text-[11px] opacity-70">Sub-20ms latency direct messaging & engineering rooms.</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-inherit flex items-center justify-between text-[11px] opacity-65">
                <span>⚡ 4 Engineers Active</span>
                <span className="font-mono">99.9% Telemetry SLA</span>
              </div>
            </div>

            {/* Micro Badge */}
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-inherit text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 brand-accent-text" />
                <span className="font-semibold">Dual Theme System</span>
              </div>
              <span className="opacity-60 text-[11px]">Daylight &amp; Warm Dark</span>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
}