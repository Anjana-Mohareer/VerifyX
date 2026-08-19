import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import useAuth from "../hooks/useAuth";
import {
  loginAdmin,
  loginCandidate,
  requestCandidatePasswordReset,
  resetCandidatePassword,
  requestHrPasswordResetByIdentifier,
  resetHrPasswordByIdentifier,
} from "../services/authService";
import { getLocalCandidates } from '../services/storage';
import { getApplication } from '../services/candidateApplicationService';
import "./Login.css";

export default function Login({ mode }) {
  const nav = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const isAdmin = mode === "admin";
  const [form, setForm] = useState({ email: "", password: "" });
  const [forgot, setForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState("email");
  const [reset, setReset] = useState({ identifier: "", otp: "", newPassword: "", confirmPassword: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState(location.state?.message || "");
  const registeredCandidateEmails = useMemo(() => {
    if (isAdmin) return [];
    return [...new Set(getLocalCandidates().map((candidate) => String(candidate.email || '').trim().toLowerCase()).filter(Boolean))].sort();
  }, [isAdmin]);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    try {
      const loggedSession = isAdmin
        ? await loginAdmin(form.email, form.password)
        : await loginCandidate(form.email, form.password);
      refresh();
      if (isAdmin) {
        nav("/dashboard");
      } else {
        const identity = loggedSession?.id || loggedSession?.email || form.email;
        const existingApplication = getApplication(identity);
        if (existingApplication) {
          localStorage.setItem(`verifyx_portal_access_${identity}`, 'true');
          sessionStorage.setItem(`verifyx_show_return_progress_${identity}`, 'true');
          nav("/candidate", { replace: true });
        } else {
          localStorage.removeItem(`verifyx_portal_access_${identity}`);
          nav("/candidate-welcome", { replace: true });
        }
      }
    } catch (x) {
      if (!isAdmin && x?.code === "CANDIDATE_NOT_REGISTERED") {
        nav("/candidate-register", { state: { message: "First-time candidate? Please register before logging in.", email: form.email } });
        return;
      }
      setErr(x.message);
    }
  };

  const sendResetOtp = async () => {
    const identifier = reset.identifier.trim();
    if (!identifier) return setErr(`Enter your registered ${verificationMethod === "email" ? "email" : "phone number"}.`);
    if (verificationMethod === "email" && !/^\S+@\S+\.\S+$/.test(identifier)) return setErr("Enter a valid registered email address.");
    if (verificationMethod === "phone" && !/^\d{10}$/.test(identifier)) return setErr("Enter a valid 10-digit registered phone number.");
    try {
      const result = isAdmin
        ? await requestHrPasswordResetByIdentifier(identifier, verificationMethod)
        : await requestCandidatePasswordReset(identifier);
      const devOtp = String(result || "").match(/DEV_OTP=(\d{6})/)?.[1];
      setOtpSent(true);
      if (devOtp) setReset((current) => ({ ...current, otp: devOtp }));
      setMsg(devOtp
        ? `Local verification OTP: ${devOtp}. Connect email/SMS delivery in the backend for production.`
        : `A 6-digit OTP has been sent to your registered ${verificationMethod}.`);
    } catch (x) { setErr(x.message); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (!otpSent) return sendResetOtp();
    if (!/^\d{6}$/.test(reset.otp)) return setErr("Enter the 6-digit OTP.");
    if (reset.newPassword.length < 8) return setErr("Password must be at least 8 characters.");
    if (reset.newPassword !== reset.confirmPassword) return setErr("Passwords do not match.");
    try {
      if (isAdmin) await resetHrPasswordByIdentifier(reset.identifier.trim(), reset.otp, reset.newPassword, verificationMethod);
      else await resetCandidatePassword(reset.identifier.trim(), reset.otp, reset.newPassword);
      setMsg("Password reset successfully. You can login now.");
      setForgot(false); setOtpSent(false);
      if (verificationMethod === "email") setForm((f) => ({ ...f, email: reset.identifier.trim(), password: "" }));
    } catch (x) { setErr(x.message); }
  };

  const resetForgotState = () => {
    setForgot(false); setOtpSent(false); setErr(""); setMsg("");
    setReset({ identifier: "", otp: "", newPassword: "", confirmPassword: "" });
  };

  return <>
    <Navbar />
    <main className="auth-wrap auth-modern-wrap login-page-rich">
      <section className="auth-modern-shell page-enter">
        <form className="auth-card auth-modern-card" onSubmit={forgot ? handleForgotPassword : submit}>
          <span className="auth-mini-label">{isAdmin ? "HR Secure Access" : "Candidate Secure Access"}</span>
          <h1>{forgot ? "Recover Your Account" : isAdmin ? "HR Login" : "Candidate Login"}</h1>
          <p className="muted auth-subtitle">{forgot
            ? `Verify Your Registered Email Or Phone Number To Create A New ${isAdmin ? "HR" : "candidate"} Password.`
            : isAdmin ? "Review Candidate Profiles, Documents And Verification Requests Securely." : "Continue Your Profile, Documents And Verification Journey."}</p>
          {err && <div className="error">{err}</div>}{msg && <div className="success">{msg}</div>}

          {!forgot ? <>
            <label className="field-label" htmlFor="login-email">Email</label>
            <input id="login-email" type="email" list={!isAdmin ? "registered-candidate-emails" : undefined} autoComplete="email" placeholder="Start typing your registered email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} required />
            {!isAdmin && <datalist id="registered-candidate-emails">{registeredCandidateEmails.map((email) => <option value={email} key={email} />)}</datalist>}
            {!isAdmin && registeredCandidateEmails.length > 0 && <small className="login-history-hint">Start typing to select a previously registered candidate email.</small>}
            <label className="field-label" htmlFor="login-password">Password</label>
            <div className="password-wrap"><input id="login-password" type={showPassword ? "text" : "password"} placeholder="Enter password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} required/><button type="button" className="password-toggle" onClick={()=>setShowPassword(!showPassword)}>{showPassword ? "🙈" : "👁️"}</button></div>
            <div className="auth-options"><label className="remember-row"><input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)}/><span>Remember me</span></label><button type="button" className="forgot-button" onClick={()=>{setForgot(true);setReset((r)=>({...r,identifier:form.email}))}}>Forgot Password?</button></div>
            <button className="btn primary full auth-login-btn">Login Securely</button>
            {!isAdmin && <p className="signup-line">First Time Here? <Link to="/candidate-register">Create Candidate Account</Link></p>}
          </> : <>
            <div className="verification-tabs" role="tablist">
              <button type="button" className={verificationMethod === "email" ? "active" : ""} onClick={()=>{setVerificationMethod("email");setOtpSent(false);}}>Email Verification</button>
              <button type="button" className={verificationMethod === "phone" ? "active" : ""} onClick={()=>{setVerificationMethod("phone");setOtpSent(false);}}>Phone Verification</button>
            </div>
            <label className="field-label">Registered {verificationMethod === "email" ? "Email" : "Phone Number"}</label>
            <input type={verificationMethod === "email" ? "email" : "tel"} inputMode={verificationMethod === "phone" ? "numeric" : undefined} maxLength={verificationMethod === "phone" ? 10 : undefined} placeholder={verificationMethod === "email" ? "name@example.com" : "10-digit mobile number"} value={reset.identifier} onChange={(e)=>setReset({...reset,identifier: verificationMethod === "phone" ? e.target.value.replace(/\D/g,"").slice(0,10) : e.target.value})} required />
            {otpSent && <>
              <label className="field-label">Verification OTP</label><input inputMode="numeric" maxLength={6} placeholder="6-digit OTP" value={reset.otp} onChange={(e)=>setReset({...reset,otp:e.target.value.replace(/\D/g,"").slice(0,6)})} required />
              <label className="field-label">New Password</label><input type="password" placeholder="Minimum 8 characters" value={reset.newPassword} onChange={(e)=>setReset({...reset,newPassword:e.target.value})} required />
              <label className="field-label">Confirm Password</label><input type="password" placeholder="Confirm new password" value={reset.confirmPassword} onChange={(e)=>setReset({...reset,confirmPassword:e.target.value})} required />
            </>}
            <button className="btn primary full auth-login-btn">{otpSent ? "Verify OTP & Reset Password" : "Send Verification OTP"}</button>
            <button type="button" className="forgot-button back-login-btn" onClick={resetForgotState}>← Back to Login</button>
          </>}
        </form>
        <aside className="login-visual-card login-story-card" aria-hidden="true"><div className="story-orb"><img src="/verify-x-mark-white.svg" alt="" className="story-orb-logo" /></div><h2>Identity. Experience. Trust.</h2><p>A Secure Verification Journey Designed For Candidates And HR Teams.</p><div className="story-steps"><span>01 Profile</span><span>02 Documents</span><span>03 Verification</span></div></aside>
      </section>
    </main>
  </>;
}
