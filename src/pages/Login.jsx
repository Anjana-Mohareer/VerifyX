import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import {
  loginAdmin,
  loginCandidate,
  requestCandidatePasswordReset,
  resetCandidatePassword,
  requestHrPasswordResetByIdentifier,
  resetHrPasswordByIdentifier,
} from "../services/authService";
import { api } from '../services/apiService';
import { getRememberLogin } from '../services/storage';
import "./Login.css";

export default function Login({ mode }) {
  const nav = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const isAdmin = mode === "admin";
  const [form, setForm] = useState({ email: "", password: "" });
  const [forgot, setForgot] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberLogin());
  const [showPassword, setShowPassword] = useState(false);
  const [reset, setReset] = useState({ identifier: "", otp: "", newPassword: "", confirmPassword: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(location.state?.message || "");

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErr(""); setMsg("");
    const email = form.email.trim().toLowerCase();
    const errors = {};
    if (!email) errors.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email address.";
    if (!form.password || !form.password.trim()) errors.password = "Please enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      isAdmin
        ? await loginAdmin(email, form.password, rememberMe)
        : await loginCandidate(email, form.password, rememberMe);
      refresh();
      if (isAdmin) {
        nav('/dashboard', { replace: true });
      } else {
        // Profile is sourced from backend; never infer registration from local browser data.
        try {
          const profile = await api.candidateProfile();
          nav(profile && Object.keys(profile).length ? '/candidate' : '/candidate-welcome', { replace: true });
        } catch (profileError) {
          if (profileError?.status === 404) nav('/candidate-welcome', { replace: true });
          else setErr(profileError?.message || 'Unable to load your profile from the server.');
        }
      }
    } catch (x) {
      // Authentication failures include unknown accounts, invalid passwords, and
      // backend implementations that return 400/404/422 instead of 401.
      const status = x?.status;
      const serverMessage = String(x?.message || '');
      const rejectedCredentials = [400, 401, 403, 404, 422].includes(status)
        || /invalid credentials|invalid (email|password)|wrong password|user not found|account not found|email not (found|registered)|unregistered|bad credentials|authentication failed/i.test(serverMessage);
      setErr(rejectedCredentials
        ? 'Invalid email address or password. Please try again.'
        : serverMessage || 'Unable to login. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const sendResetOtp = async () => {
    const identifier = reset.identifier.trim();
    if (!identifier) return setErr("Enter your registered email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return setErr("Enter a valid registered email address.");
    try {
      const result = isAdmin
        ? await requestHrPasswordResetByIdentifier(identifier, "email")
        : await requestCandidatePasswordReset(identifier);
      const devOtp = String(result || "").match(/DEV_OTP=(\d{6})/)?.[1];
      setOtpSent(true);
      if (devOtp) setReset((current) => ({ ...current, otp: devOtp }));
      setMsg(devOtp
        ? `Local verification OTP: ${devOtp}. Connect email/SMS delivery in the backend for production.`
        : "If this address is registered, an OTP will be sent to your email.");
    } catch (x) { setErr(x.message); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (!otpSent) return sendResetOtp();
    if (!/^\d{6}$/.test(reset.otp)) return setErr("Enter the 6-digit OTP.");
    if (reset.newPassword.length < 8) return setErr("Password must be at least 8 characters.");
    if (reset.newPassword !== reset.confirmPassword) return setErr("Passwords do not match.");
    try {
      if (isAdmin) await resetHrPasswordByIdentifier(reset.identifier.trim().toLowerCase(), reset.otp, reset.newPassword, "email");
      else await resetCandidatePassword(reset.identifier.trim().toLowerCase(), reset.otp, reset.newPassword);
      setMsg("Password reset successfully. You can login now.");
      setReset({ identifier: "", otp: "", newPassword: "", confirmPassword: "" });
      setForgot(false); setOtpSent(false);
      setForm((f) => ({ ...f, email: reset.identifier.trim().toLowerCase(), password: "" }));
    } catch (x) { setErr(x.message); }
  };

  const resetForgotState = () => {
    setForgot(false); setOtpSent(false); setErr(""); setMsg("");
    setReset({ identifier: "", otp: "", newPassword: "", confirmPassword: "" });
  };

  return <main className="vx-login-page">
    <section className="vx-login-shell page-enter">
      <aside className="vx-login-illustration" aria-hidden="true" />

      <section className="vx-login-form-area">
        <form noValidate className="vx-auth-login-card" onSubmit={forgot ? handleForgotPassword : submit}>
          <div className="vx-login-brand">
            <img src="/verify-x-logo.svg" alt="VerifyX" />
          </div>
          <h1>{forgot ? "Recover Your Account" : isAdmin ? "HR Login" : "Candidate Login"}</h1>
          <p className="vx-login-subtitle">{forgot
            ? `Verify your registered email address to create a new ${isAdmin ? "HR" : "candidate"} password.`
            : isAdmin ? "Review candidate profiles, documents and verification requests" : "Continue your Profile, Documents and Verification Journey"}</p>

          {err && <div className="error vx-login-message" role="alert">{err}</div>}
          {msg && <div className="success vx-login-message">{msg}</div>}

          {!forgot ? <>
            <div className={`vx-input-box ${fieldErrors.email ? "vx-input-invalid" : ""}`}>
              <span className="vx-input-icon" aria-hidden="true">✉</span>
              <div className="vx-input-content">
                <label htmlFor="login-email">Email</label>
                <input id="login-email" type="email" autoComplete="email" placeholder="abc@gmail.com" value={form.email} onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setFieldErrors((f) => ({ ...f, email: "" })); if (err) setErr(""); }} onBlur={() => { const value = form.email.trim(); if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) setFieldErrors((f) => ({ ...f, email: "Please enter a valid email address." })); }} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "login-email-error" : undefined} required />
                {fieldErrors.email && <span id="login-email-error" className="vx-field-error" role="alert">{fieldErrors.email}</span>}
              </div>
            </div>

            <div className={`vx-input-box vx-password-box ${fieldErrors.password ? "vx-input-invalid" : ""}`}>
              <span className="vx-input-icon vx-key-icon" aria-hidden="true">◆</span>
              <div className="vx-input-content">
                <label htmlFor="login-password">Password</label>
                <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••••" value={form.password} onChange={(e)=>{setForm((f)=>({...f,password:e.target.value}));setFieldErrors((f)=>({...f,password:""}));if(err)setErr("");}} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? "login-password-error" : undefined} required />
                {fieldErrors.password && <span id="login-password-error" className="vx-field-error" role="alert">{fieldErrors.password}</span>}
              </div>
              <button type="button" className="vx-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={()=>setShowPassword(!showPassword)}>{showPassword ? "◉" : "⊙"}</button>
            </div>

            <div className="vx-login-options">
              <label className="vx-remember-row" htmlFor="vx-remember-me"><input id="vx-remember-me" className="vx-remember-checkbox" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /><span>Remember Me</span></label>
              <button type="button" className="vx-forgot-link" onClick={()=>{setErr("");setMsg("");setOtpSent(false);setForgot(true);setReset((r)=>({...r,identifier:form.email.trim().toLowerCase(),otp:"",newPassword:"",confirmPassword:""}))}}>Forgot Password?</button>
            </div>

            <button className="vx-login-submit" disabled={submitting}>{submitting ? "Logging in..." : "Login"}</button>
            {!isAdmin && <p className="vx-signup-line">Don’t have an account? <Link to="/candidate-register">Register</Link></p>}
          </> : <>
            <label className="vx-reset-label">Registered Email</label>
            <input className="vx-reset-input" type="email" autoComplete="email" placeholder="name@example.com" value={reset.identifier} onChange={(e)=>setReset({...reset,identifier: e.target.value})} required />
            {otpSent && <>
              <label className="vx-reset-label">Verification OTP</label><input className="vx-reset-input" inputMode="numeric" maxLength={6} placeholder="6-digit OTP" value={reset.otp} onChange={(e)=>setReset({...reset,otp:e.target.value.replace(/\D/g,"").slice(0,6)})} required />
              <label className="vx-reset-label">New Password</label><input className="vx-reset-input" type="password" placeholder="Minimum 8 characters" value={reset.newPassword} onChange={(e)=>setReset({...reset,newPassword:e.target.value})} required />
              <label className="vx-reset-label">Confirm Password</label><input className="vx-reset-input" type="password" placeholder="Confirm new password" value={reset.confirmPassword} onChange={(e)=>setReset({...reset,confirmPassword:e.target.value})} required />
            </>}
            <button className="vx-login-submit">{otpSent ? "Verify OTP & Reset Password" : "Send Verification OTP"}</button>
            <button type="button" className="vx-back-login" onClick={resetForgotState}>← Back to Login</button>
          </>}
        </form>
      </section>
    </section>
  </main>;
}
