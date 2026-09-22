import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { 
  User, 
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

export default function Signup() {
  const navigate = useNavigate();
  const { theme, setTheme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
  });

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSignup = async (e) => {
    if (e) e.preventDefault();
    try {
      if (!form.firstName.trim()) {
        return toast.error("Please enter your first name");
      }

      // Gmail restriction (front-end fast-fail)
      if (!form.email || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(form.email)) {
        return toast.error("Only Gmail accounts (@gmail.com) are allowed to sign up");
      }

      if (form.password !== form.confirm) {
        return toast.error("Passwords do not match");
      }

      const strongPassword = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
      if (!strongPassword.test(form.password)) {
        return toast.error("Password must include 1 uppercase, 1 number, min 8 chars");
      }

      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

      setLoading(true);
      const loadingToast = toast.loading("Creating DevSpace account...");
      await API.post("/auth/register", {
        name: fullName,
        email: form.email,
        password: form.password,
      });

      toast.success("Account created! Redirecting to login…", { id: loadingToast });
      setTimeout(() => {
        navigate("/login");
      }, 1200);

    } catch (err) {
      toast.error(err.response?.data?.message || "Signup Failed");
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

        {/* Right Actions: Theme Toggle & Link to Login */}
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

          <Link to="/login" className="text-xs font-semibold hover:opacity-80 transition text-inherit no-underline hidden sm:inline">
            Sign in instead →
          </Link>
        </div>
      </header>

      {/* ── Main Auth Area ── */}
      <main className="auth-main">
        <div className="auth-split-grid">
          
          {/* ── FORM CARD (Left / Center on Mobile) ── */}
          <div className="auth-card">
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">
              Already have an account?{" "}
              <Link to="/login" className="brand-accent-text font-semibold hover:underline">
                Sign in →
              </Link>
            </p>

            <form onSubmit={handleSignup}>
              {/* Name Fields (2 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="auth-field">
                  <label className="auth-label">First name</label>
                  <div className="auth-input-wrap">
                    <User className="auth-input-icon" />
                    <input
                      type="text"
                      placeholder="Alex"
                      className="auth-input"
                      value={form.firstName}
                      onChange={set("firstName")}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Last name</label>
                  <div className="auth-input-wrap">
                    <User className="auth-input-icon" />
                    <input
                      type="text"
                      placeholder="Rivera"
                      className="auth-input"
                      value={form.lastName}
                      onChange={set("lastName")}
                    />
                  </div>
                </div>
              </div>

              {/* Work Email Field */}
              <div className="auth-field">
                <label className="auth-label">Gmail address</label>
                <div className="auth-input-wrap">
                  <Mail className="auth-input-icon" />
                  <input
                    type="email"
                    placeholder="yourname@gmail.com"
                    className="auth-input"
                    value={form.email}
                    onChange={set("email")}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="auth-field">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <Lock className="auth-input-icon" />
                  <input
                    type="password"
                    placeholder="Min. 8 characters (1 uppercase, 1 number)"
                    className="auth-input"
                    value={form.password}
                    onChange={set("password")}
                    required
                  />
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="auth-field">
                <label className="auth-label">Confirm Password</label>
                <div className="auth-input-wrap">
                  <Lock className="auth-input-icon" />
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    className="auth-input"
                    value={form.confirm}
                    onChange={set("confirm")}
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
                <span>{loading ? "Creating account..." : "Create DevSpace Account"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="auth-footer">
              By registering you agree to our <a href="/terms" className="text-inherit underline">Terms of Service</a> &amp; <a href="/privacy" className="text-inherit underline">Privacy Policy</a>
            </div>
          </div>

          {/* ── SHOWCASE SIDE (Right - Desktop Only, Professional SaaS) ── */}
          <div className="auth-showcase-panel">
            
            {/* Live Telemetry Card */}
            <div className="auth-telemetry-box">
              <div className="flex items-center justify-between pb-3 border-b border-inherit mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-dot"></span>
                  <span className="text-xs font-bold font-mono">DevSpace Platform</span>
                </div>
                <span className="text-[11px] opacity-60 font-mono">Real-Time MERN</span>
              </div>

              <div className="space-y-3 font-sans">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">End-to-End Sprint Cockpit</div>
                    <div className="text-[11px] opacity-70">Task dependencies, urgent priorities, and blocker flags.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Activity className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">14-Day Standup Streak Heatmaps</div>
                    <div className="text-[11px] opacity-70">Automated daily check-ins that keep asynchronous teams connected.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">Sub-15ms WebSocket Broadcasts</div>
                    <div className="text-[11px] opacity-70">Zero lag Kanban reordering, instant channel messaging & presence.</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-inherit flex items-center justify-between text-[11px] opacity-65">
                <span>⚡ Instant Team Invitation</span>
                <span className="font-mono">Free Forever Workspace</span>
              </div>
            </div>

            {/* Micro Badge */}
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-inherit text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 brand-accent-text" />
                <span className="font-semibold">Bespoke Dual Themes</span>
              </div>
              <span className="opacity-60 text-[11px]">Daylight Clean Light ☀️ &amp; HeroUI Warm Dark 🌙</span>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
}