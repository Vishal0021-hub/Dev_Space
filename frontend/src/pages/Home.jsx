import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { 
  ArrowRight, 
  Terminal, 
  Kanban, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Sun, 
  Moon, 
  Zap, 
  CheckCircle2, 
  Command, 
  Users,
  Activity
} from "lucide-react";
import { useTheme, THEMES } from "../context/ThemeContext";
import "../utils/Home.css";

export default function Home() {
  const { theme, setTheme, isDark } = useTheme();
  const terminalLogRef = useRef(null);

  // Initial Terminal Log Stream
  const [logs, setLogs] = useState([
    { type: "info", text: "// DevSpace interactive command stream initialized" },
    { type: "cmd", text: "$ devspace sprint status --health" },
    { type: "ok", text: "✓ Sprint 42: Active (82% complete · 28 of 34 story points shipped)" },
    { type: "ok", text: "✓ Socket.IO Broadcast: 4 peers online, sub-15ms sync active" },
    { type: "warn", text: "! 1 Blocker flagged on task #DES-102 (resolved in PR #91)" },
  ]);

  // Scroll terminal to bottom on new logs
  useEffect(() => {
    if (terminalLogRef.current) {
      terminalLogRef.current.scrollTop = terminalLogRef.current.scrollHeight;
    }
  }, [logs]);

  // Interactive Command Runner
  const runCommand = (cmdKey) => {
    if (cmdKey === "task") {
      setLogs((prev) => [
        ...prev,
        { type: "cmd", text: '$ devspace task create --urgent "Sub-15ms WebSocket Broadcast"' },
        { type: "ok", text: "✓ Task #DES-105 created · assigned to team · priority: urgent · status: To Do" },
      ]);
      toast.success("CLI Task Created: #DES-105 (Urgent)");
    } else if (cmdKey === "standup") {
      setLogs((prev) => [
        ...prev,
        { type: "cmd", text: '$ devspace standup post --yesterday "PR #88 merged" --streak 15' },
        { type: "ok", text: "✓ Standup recorded for today · streak updated: 15 consecutive days" },
      ]);
      toast.success("CLI Standup Logged: 15-day streak!");
    } else if (cmdKey === "board") {
      setLogs((prev) => [
        ...prev,
        { type: "cmd", text: '$ devspace board move #DES-102 --to "Done"' },
        { type: "ok", text: "✓ Task #DES-102 moved to Done · Sprint velocity updated to 91%" },
      ]);
      toast.success("Task #DES-102 moved to Done (+9% velocity)");
    } else if (cmdKey === "theme") {
      const nextTheme = isDark ? THEMES.DAYLIGHT : THEMES.WARM_DARK;
      setTheme(nextTheme);
      setLogs((prev) => [
        ...prev,
        { type: "cmd", text: "$ devspace theme toggle" },
        { type: "ok", text: `✓ Theme toggled to ${nextTheme === THEMES.DAYLIGHT ? "Daylight Light ☀️" : "HeroUI Warm Dark 🌙"}` },
      ]);
      toast.success(`Theme switched to ${nextTheme === THEMES.DAYLIGHT ? "Daylight ☀️" : "Warm Dark 🌙"}`);
    }
  };

  return (
    <div className="home-container">
      
      {/* ── Top Navigation Bar ── */}
      <nav className="home-nav">
        {/* Brand Monogram + Wordmark */}
        <Link to="/" className="flex items-center gap-2.5 text-inherit no-underline">
          <div className="w-8 h-8 rounded-xl btn-brand-accent flex items-center justify-center font-black text-xs font-mono shadow-md">
            DS
          </div>
          <span className="font-extrabold text-base sm:text-lg tracking-tight">DevSpace</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 opacity-70 ml-1 hidden sm:inline">
            v2.4
          </span>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <div className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium opacity-80">
          <a href="#features" className="text-inherit no-underline hover:opacity-100 transition">Features</a>
          <a href="#command-center" className="text-inherit no-underline hover:opacity-100 transition">Command Center</a>
          <a href="#keybindings" className="text-inherit no-underline hover:opacity-100 transition">Shortcuts</a>
        </div>

        {/* Right Actions: Theme Switcher & Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Dedicated Daylight vs Warm Dark Toggle */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 border border-inherit p-0.5 sm:p-1 rounded-2xl gap-0.5">
            <button
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

          {/* Auth Links */}
          <Link to="/login" className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold hover:opacity-80 transition text-inherit no-underline">
            Sign In
          </Link>
          <Link to="/signup" className="btn-brand-accent px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 no-underline">
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
          </Link>
        </div>
      </nav>

      {/* ── Hero Section (Option 1 Text + Option 3 Command Center) ── */}
      <section className="home-hero home-grid-pattern">
        
        {/* Live Status Capsule */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-inherit text-xs font-semibold mb-5 sm:mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot"></span>
          <span>DevSpace 2.0 Autonomous Engineering</span>
          <span className="opacity-40">|</span>
          <span className="brand-accent-text font-bold">Zero Latency MERN</span>
        </div>

        {/* Headline (Option 1 copy, fully responsive) */}
        <h1 className="home-title">
          The high-velocity workspace for modern software teams.
        </h1>

        {/* Subhead (Option 1 copy, punchy & uncluttered) */}
        <p className="home-sub">
          Streamline your sprint cycles, drag-and-drop Kanban, async standups, and live Socket.IO messaging in one unified cockpit. No friction, zero context switching.
        </p>

        {/* CTA Button Group */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10 sm:mb-12 w-full px-2">
          <Link
            to="/signup"
            className="btn-brand-accent px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 w-full sm:w-auto no-underline"
          >
            <span>Start Building for Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#command-center"
            className="saas-card px-5 py-3 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition w-full sm:w-auto text-inherit no-underline"
          >
            <kbd className="font-mono text-[11px] bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
            <span>Test Drive Commands</span>
          </a>
        </div>

        {/* =============================================================== */}
        {/* INTERACTIVE COMMAND CENTER TERMINAL WIDGET (Option 3 Hero)     */}
        {/* =============================================================== */}
        <div id="command-center" className="terminal-window">
          
          {/* Terminal Window Chrome */}
          <div className="flex items-center justify-between pb-3 border-b border-inherit mb-3 text-[11px] opacity-70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="ml-1 font-bold">devspace.workspace/command-stream</span>
            </div>
            <span className="text-[10px] opacity-50 hidden sm:inline">Socket.IO: Connected (12ms)</span>
          </div>

          {/* Quick Interactive Command Launcher Chips */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3.5">
            <button
              onClick={() => runCommand("task")}
              className="px-2.5 py-1.2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-amber-500/20 hover:text-amber-400 border border-inherit transition text-[11px] font-semibold text-left"
            >
              &gt; task create --urgent
            </button>
            <button
              onClick={() => runCommand("standup")}
              className="px-2.5 py-1.2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-emerald-500/20 hover:text-emerald-400 border border-inherit transition text-[11px] font-semibold text-left"
            >
              &gt; standup post
            </button>
            <button
              onClick={() => runCommand("board")}
              className="px-2.5 py-1.2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-sky-500/20 hover:text-sky-400 border border-inherit transition text-[11px] font-semibold text-left"
            >
              &gt; board move #DES-102
            </button>
            <button
              onClick={() => runCommand("theme")}
              className="px-2.5 py-1.2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-purple-500/20 hover:text-purple-400 border border-inherit transition text-[11px] font-semibold text-left"
            >
              &gt; theme toggle
            </button>
          </div>

          {/* Terminal Screen Stream */}
          <div className="terminal-screen" ref={terminalLogRef}>
            {logs.map((log, index) => (
              <div
                key={index}
                className={`break-words ${
                  log.type === "cmd"
                    ? "text-emerald-400 font-bold"
                    : log.type === "ok"
                    ? "opacity-85"
                    : log.type === "warn"
                    ? "text-amber-400"
                    : "opacity-50 italic"
                }`}
              >
                {log.text}
              </div>
            ))}
          </div>

          {/* Terminal Footer */}
          <div className="mt-3 pt-2.5 border-t border-inherit flex items-center justify-between text-[10px] sm:text-[11px] opacity-60">
            <span>💡 Click any command pill above to simulate live MERN execution</span>
            <span className="font-mono">Real-time telemetry</span>
          </div>

        </div>

      </section>

      {/* ── Keybindings Matrix (2-col mobile, 4-col desktop) ── */}
      <section id="keybindings" className="w-full max-w-3xl px-4 sm:px-6 mb-12 sm:mb-16">
        <div className="text-xs font-bold tracking-wider uppercase opacity-60 mb-3 text-center sm:text-left">
          Keystroke Navigation
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 text-left">
          <div className="saas-card p-3 rounded-xl">
            <div className="font-mono text-xs font-bold brand-accent-text mb-1">G + B</div>
            <div className="text-xs opacity-75">Kanban Board</div>
          </div>
          <div className="saas-card p-3 rounded-xl">
            <div className="font-mono text-xs font-bold brand-accent-text mb-1">C + T</div>
            <div className="text-xs opacity-75">Create Task</div>
          </div>
          <div className="saas-card p-3 rounded-xl">
            <div className="font-mono text-xs font-bold brand-accent-text mb-1">S + D</div>
            <div className="text-xs opacity-75">Async Standup</div>
          </div>
          <div className="saas-card p-3 rounded-xl">
            <div className="font-mono text-xs font-bold brand-accent-text mb-1">⌘ + K</div>
            <div className="text-xs opacity-75">Quick Search</div>
          </div>
        </div>
      </section>

      {/* ── Feature Grid (Spacious 1-col mobile, 2-col desktop) ── */}
      <section id="features" className="w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12 border-t border-inherit">
        <div className="text-center mb-8 sm:mb-10">
          <div className="text-xs font-bold tracking-wider uppercase opacity-60 mb-2">Engineered For Velocity</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Everything your engineering team actually uses</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          
          {/* Card 1: Kanban */}
          <div className="saas-card p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 brand-accent-text flex items-center justify-center mb-3.5">
                <Kanban className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base sm:text-lg mb-1.5">Zero-Lag Drag-and-Drop Board</h3>
              <p className="text-xs sm:text-sm opacity-75 leading-relaxed mb-4">
                Full-fidelity Kanban boards with urgent priorities, blocker flags, GitHub PR backlinks, and MongoDB state persistence with instant optimistic re-ordering.
              </p>
            </div>
            <div className="bg-black/5 dark:bg-black/40 p-2.5 rounded-xl border border-inherit font-mono text-[11px] flex items-center justify-between">
              <span className="text-emerald-400">✓ Optimistic UI update</span>
              <span className="opacity-50">&lt;12ms backend sync</span>
            </div>
          </div>

          {/* Card 2: Async Standups */}
          <div className="saas-card p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-3.5">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base sm:text-lg mb-1.5">Async Standups & Streak Heatmaps</h3>
              <p className="text-xs sm:text-sm opacity-75 leading-relaxed mb-4">
                Replace 30-minute status meetings with structured async check-ins, automatic blocker alerts, and 14-day team participation streaks.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-emerald-500/30"></div>
              <div className="w-3.5 h-3.5 rounded bg-emerald-500/50"></div>
              <div className="w-3.5 h-3.5 rounded bg-emerald-500/80"></div>
              <div className="w-3.5 h-3.5 rounded bg-emerald-500"></div>
              <span className="text-[11px] opacity-65 ml-2 font-semibold">14-Day Consecutive Streak</span>
            </div>
          </div>

          {/* Card 3: Chat Channels */}
          <div className="saas-card p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center mb-3.5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base sm:text-lg mb-1.5">Engineering Channels & DMs</h3>
              <p className="text-xs sm:text-sm opacity-75 leading-relaxed mb-4">
                Sub-20ms team chat with typing indicators, presence stack, and auto-scrolling message streams wired cleanly via Socket.IO.
              </p>
            </div>
            <span className="text-[11px] font-mono text-sky-400 font-semibold">#engineering · #releases</span>
          </div>

          {/* Card 4: Meeting Notes */}
          <div className="saas-card p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-3.5">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base sm:text-lg mb-1.5">Rich Meeting Notes with Backlinks</h3>
              <p className="text-xs sm:text-sm opacity-75 leading-relaxed mb-4">
                Collaborative markdown notes linked directly to sprint tasks, blockers, and decisions. Never lose sprint retrospective outcomes again.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10">Sprint 42 Retro.md</span>
              <span className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10">ADR #14</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── Bottom Call To Action ── */}
      <section className="w-full max-w-5xl px-4 sm:px-6 py-10 sm:py-16 text-center">
        <div className="saas-card p-6 sm:p-10 relative overflow-hidden">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Ready to accelerate your engineering workflow?</h2>
          <p className="text-xs sm:text-sm opacity-75 max-w-xl mx-auto mb-6">
            Join hundreds of developers shipping faster with DevSpace. No credit card required.
          </p>
          <Link
            to="/signup"
            className="btn-brand-accent px-7 py-3 rounded-xl font-extrabold text-xs sm:text-sm shadow-xl inline-flex items-center gap-2 no-underline"
          >
            <span>Create Free Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full max-w-5xl px-4 sm:px-6 py-6 border-t border-inherit flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-60">
        <div className="flex items-center gap-2">
          <span className="font-bold">DevSpace</span>
          <span>·</span>
          <span>Autonomous High-Velocity Engineering Workspace</span>
        </div>
        <div>
          <span>© 2026 DevSpace. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}