import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import useAuth from "../hooks/useAuth";
import { loginAdmin, loginCandidate } from "../services/authService";

export default function Login({ mode }) {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const isAdmin = mode === "admin";

  const [form, setForm] = useState({
    email: isAdmin ? "admin@verifyx.com" : "",
    password: isAdmin ? "admin123" : "",
  });

  const [forgot, setForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [reset, setReset] = useState({
    email: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setErr("");

    try {
      isAdmin
        ? loginAdmin(form.email, form.password)
        : loginCandidate(form.email, form.password);

      refresh();
      nav(isAdmin ? "/dashboard" : "/candidate");
    } catch (x) {
      setErr(x.message);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!reset.email || !reset.newPassword || !reset.confirmPassword) {
      setErr("Please fill all fields.");
      return;
    }

    if (reset.newPassword !== reset.confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    if (reset.newPassword.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }

    const keys = ["candidates", "verifyx_candidates", "vx_candidates"];
    let updated = false;

    for (const key of keys) {
      const data = JSON.parse(localStorage.getItem(key) || "[]");

      if (Array.isArray(data)) {
        const index = data.findIndex(
          (c) => c.email?.toLowerCase() === reset.email.toLowerCase()
        );

        if (index !== -1) {
          data[index].password = reset.newPassword;
          localStorage.setItem(key, JSON.stringify(data));
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      setErr("Candidate email not found.");
      return;
    }

    setMsg("Password reset successfully. Please login with your new password.");
    setForgot(false);
    setForm({ ...form, email: reset.email, password: "" });
    setReset({ email: "", newPassword: "", confirmPassword: "" });
  };

  return (
    <>
      <Navbar />

      <main className="auth-wrap auth-modern-wrap">
        <section className="auth-modern-shell">
          <form
            className="auth-card auth-modern-card"
            onSubmit={forgot ? handleForgotPassword : submit}
          >
            <span className="auth-mini-label">
              {isAdmin ? "HR Access" : "Candidate Access"}
            </span>

            <h1>
              {forgot
                ? "Forgot Password"
                : isAdmin
                ? "HR Login"
                : "Candidate Login"}
            </h1>

            <p className="muted auth-subtitle">
              {forgot
                ? "Reset your candidate account password securely."
                : isAdmin
                ? "Login to review candidates, documents and verification requests."
                : "Login to access your Verify-X candidate portal."}
            </p>

            {err && <div className="error">{err}</div>}
            {msg && <div className="success">{msg}</div>}

            {!forgot ? (
              <>
                <label className="field-label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="john.doe@gmail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />

                <label className="field-label" htmlFor="login-password">
                  Password
                </label>
                <div className="password-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>

                <div className="auth-options">
                  <label className="remember-row">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  {mode !== "admin" && (
                    <button
                      type="button"
                      className="forgot-button"
                      onClick={() => setForgot(true)}
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>

                <button className="btn primary full auth-login-btn">Login</button>

                {mode !== "admin" && (
                  <>
                    <p className="signup-line">
                      Don&apos;t have an account?{" "}
                      <Link to="/candidate-register">Sign up</Link>
                    </p>

                    <div className="auth-divider">
                      <span />
                      <small>Or login with</small>
                      <span />
                    </div>

                    <div className="social-row" aria-hidden="true">
                      <button type="button">f</button>
                      <button type="button">G</button>
                      <button type="button"></button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <label className="field-label" htmlFor="reset-email">
                  Registered Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="Registered Email"
                  value={reset.email}
                  onChange={(e) => setReset({ ...reset, email: e.target.value })}
                  required
                />

                <label className="field-label" htmlFor="new-password">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="New Password"
                  value={reset.newPassword}
                  onChange={(e) =>
                    setReset({ ...reset, newPassword: e.target.value })
                  }
                  required
                />

                <label className="field-label" htmlFor="confirm-password">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm Password"
                  value={reset.confirmPassword}
                  onChange={(e) =>
                    setReset({ ...reset, confirmPassword: e.target.value })
                  }
                  required
                />

                <button className="btn primary full auth-login-btn">
                  Reset Password
                </button>

                <button
                  type="button"
                  className="forgot-button back-login-btn"
                  onClick={() => setForgot(false)}
                >
                  Back to Login
                </button>
              </>
            )}
          </form>

          <aside className="login-visual-card" aria-hidden="true">
            <div className="phone-illustration">
              <div className="shield-badge">✓</div>
              <div className="phone-lock">🔒</div>
              <div className="pin-bar">••••</div>
            </div>
            <div className="visual-dots">
              <span className="active" />
              <span />
              <span />
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
