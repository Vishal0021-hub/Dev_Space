import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api"
import "../utils/signup.css"
const floatingParticles = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  delay: Math.random() * 6,
  duration: Math.random() * 8 + 6,
}));

import { toast } from "react-hot-toast";

function Signup() {
  const navigate = useNavigate();
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

  const handleSignup = async () => {
    try {
      if (!form.firstName.trim()) {
        return toast.error("Please enter your first name");
      }

      // Gmail-only restriction (front-end fast-fail)
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

      const loadingToast = toast.loading("Creating account...");
      await API.post("/auth/register", {
        name: fullName,
        email: form.email,
        password: form.password,
      });

      toast.success("Account created! Redirecting to login…", { id: loadingToast });

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      console.log(err.response?.data);
      toast.error(err.response?.data?.message || "Signup Failed");
    }
  };

  return (
    <div className="dc-page">
   

      <div className="su-root">
        {/* ── FORM (left column in grid) ── */}
        <div className="su-right">
          <div className="su-form-wrap">
            <div className="su-logo-row">
              <div className="su-logo-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 6l7-3 7 3v8l-7 3-7-3V6z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M3 6l7 3m0 8V9m7-3l-7 3" stroke="#fff" strokeWidth="1.5" />
                </svg>
              </div>
              <span className="su-logo-text">DevCollab</span>
            </div>

            {/* Stepper */}
            
            
            

              <>
                <h2 className="su-form-title">Create your account</h2>
                <p className="su-form-sub">
                  Already have one? <Link to="/login">Login →</Link>
                </p>

                <div className="su-grid2">
                  <div className="su-field">
                    <label className="su-label">First name</label>
                    <div className="su-input-wrap">
                      <svg className="su-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                      </svg>
                      <input type="text" placeholder="Alex" className="su-input" onChange={set("firstName")} />
                    </div>
                  </div>
                  <div className="su-field">
                    <label className="su-label">Last name</label>
                    <div className="su-input-wrap">
                      <svg className="su-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                      </svg>
                      <input type="text" placeholder="Rivera" className="su-input" onChange={set("lastName")} />
                    </div>
                  </div>
                </div>

                <div className="su-field">
                  <label className="su-label">Work email</label>
                  <div className="su-input-wrap">
                    <svg className="su-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 8l10 6 10-6" />
                    </svg>
                    <input type="email" placeholder="yourname@gmail.com" className="su-input" onChange={set("email")} />
                  </div>
                </div>

                <div className="su-field">
                  <label className="su-label">Password</label>
                  <div className="su-input-wrap">
                    <svg className="su-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input type="password" placeholder="Min. 8 characters" className="su-input" onChange={set("password")} />
                  </div>
                </div>

                <div className="su-field">
              <label className="su-label">Confirm Password</label>
             <div className="su-input-wrap">
                     <input
                 type="password"
               placeholder="Confirm password"
               className="su-input"
                  onChange={set("confirm")}
                  />
            </div>
            </div>

                <button className="su-btn" onClick={handleSignup}>
                  Sign Up →
                </button>
              </>
          </div>
        </div>

        {/* ── ILLUSTRATION (right column in grid) ── */}
        <div className="su-left">
          <div className="su-grid-overlay" />
          {floatingParticles.map((p) => (
            <div
              key={p.id}
              className="su-particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                "--dur": `${p.duration}s`,
                "--delay": `${p.delay}s`,
              }}
            />
          ))}

          <div className="su-stats">
            {[
              { icon: "👥", num: "12K+",  label: "Active developers",  bg: "rgba(99,102,241,0.1)"  },
              { icon: "⚡", num: "98ms",   label: "Avg. sync latency",   bg: "rgba(251,191,36,0.08)" },
              { icon: "🚀", num: "340K+",  label: "Sessions launched",   bg: "rgba(52,211,153,0.08)" },
              { icon: "🛡️", num: "99.9%",  label: "Uptime guaranteed",   bg: "rgba(244,63,94,0.08)"  },
            ].map((s) => (
              <div className="su-stat-card" key={s.label}>
                <div className="su-stat-icon" style={{ background: s.bg }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                </div>
                <div className="su-stat-number"><span>{s.num}</span></div>
                <div className="su-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="su-testimonial">
            <div className="su-quote">
              DevCollab cut our code-review cycle from two days to two hours.
              It's the missing piece every remote team needs.
            </div>
            <div className="su-reviewer">
              <div className="su-reviewer-avatar">M</div>
              <div>
                <div className="su-reviewer-name">Maya Chen</div>
                <div className="su-reviewer-role">Engineering Lead · Stripe</div>
              </div>
            </div>
          </div>

          <div className="su-tagline">
            <h2>Join thousands of<br /><span>elite dev teams.</span></h2>
            <p>
              From solo hackers to enterprise squads — DevCollab scales with you,
              keeping everyone in sync without the noise.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;