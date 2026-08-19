import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { registerCandidate, resendCandidateVerification, verifyCandidateEmail } from "../services/authService";
import { REGEX, onlyDigits, onlyLetters } from "../utils/validators";
import { IT_ROLES } from "../utils/constants";
import { sendWelcomeMail, sendHrCandidateRegisteredMail, sendProfileCompletionReminder } from "../services/mailService";
import { ensureRegistrationReminder } from '../services/notificationService';

export default function CandidateRegister() {
  const nav = useNavigate();
  const location = useLocation();
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState(location.state?.message || "");
  const [otp, setOtp] = useState("");
  const [verificationStep, setVerificationStep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: location.state?.email || "", phone: "", password: "", candidateType: "Fresher", appliedRole: "" });

  const set = (key, value) => {
    let safeValue = value;
    if (key === "fullName") safeValue = onlyLetters(value);
    if (key === "phone") safeValue = onlyDigits(value, 10);
    setForm({ ...form, [key]: safeValue });
  };

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (!REGEX.name.test(form.fullName.trim())) return setErr("Full name must contain only letters and spaces.");
    if (!REGEX.email.test(form.email.trim())) return setErr("Please enter a valid email address.");
    if (!REGEX.mobile.test(form.phone.trim())) return setErr("Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9.");
    if (form.password.length < 8) return setErr("Password must contain at least 8 characters.");
    try { setBusy(true); const result = await registerCandidate(form); ensureRegistrationReminder(form); setVerificationStep(true); const devOtp = String(result || "").match(/DEV_OTP=(\d{6})/)?.[1]; setMsg(devOtp ? `Account created. Local test OTP: ${devOtp} (enable mail settings for real email delivery).` : "Account created. We sent a 6-digit verification OTP to your email."); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault(); setErr("");
    if (!/^\d{6}$/.test(otp)) return setErr("Enter the 6-digit OTP from your email.");
    try { setBusy(true); await verifyCandidateEmail(form.email, otp); sendWelcomeMail(form).catch(()=>{}); sendProfileCompletionReminder(form, true).catch(()=>{}); sendHrCandidateRegisteredMail(form).catch(()=>{}); nav("/candidate-login", { state: { message: "Email verified successfully. Please login to continue." } }); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  const resend = async () => {
    try { setErr(""); await resendCandidateVerification(form.email); setMsg("A fresh OTP has been sent to your email."); }
    catch (x) { setErr(x.message); }
  };

  return <>
    <Navbar />
    <main className="auth-wrap register-premium-wrap">
      <section className="register-premium-shell">
        <div className="register-copy">
          <span className="auth-mini-label">Candidate onboarding</span>
          <h1>Build a verified career profile.</h1>
          <p>One secure profile for identity, education, employment and offer-document verification.</p>
          <div className="register-benefits"><span>✓ Email verified registration</span><span>✓ Secure document tracking</span><span>✓ Live verification status</span></div>
        </div>
        <form className="auth-card wide register-card" onSubmit={verificationStep ? verify : submit}>
          <h1>{verificationStep ? "Verify Email" : "Candidate Sign Up"}</h1>
          <p className="muted">{verificationStep ? `Enter the OTP sent to ${form.email}` : "Create your account first. After email verification, you will be redirected to login."}</p>
          {err && <div className="error">{err}</div>}{msg && <div className="success">{msg}</div>}
          {!verificationStep ? <div className="grid2">
            <input placeholder="Full Name" value={form.fullName} maxLength={60} onChange={(e)=>set("fullName",e.target.value)} required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e)=>set("email",e.target.value)} required />
            <input placeholder="Phone" value={form.phone} maxLength={10} inputMode="numeric" onChange={(e)=>set("phone",e.target.value)} required />
            <select aria-label="Applied Role" value={form.appliedRole} onChange={(e)=>set("appliedRole",e.target.value)} required>
              <option value="" disabled>Select Applied IT Role</option>
              {IT_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <input placeholder="Password (minimum 8 characters)" type="password" value={form.password} onChange={(e)=>set("password",e.target.value)} required />
            <select value={form.candidateType} onChange={(e)=>set("candidateType",e.target.value)}><option>Fresher</option><option>Experienced</option></select>
          </div> : <div className="otp-box">
            <input className="otp-input" placeholder="6-digit OTP" inputMode="numeric" maxLength={6} value={otp} onChange={(e)=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} autoFocus />
            <button type="button" className="forgot-button" onClick={resend}>Resend OTP</button>
          </div>}
          <button className="btn primary full" disabled={busy}>{busy ? "Please wait..." : verificationStep ? "Verify & Continue to Login" : "Create Account & Send OTP"}</button>
          <p>Already registered? <Link to="/candidate-login">Login</Link></p>
        </form>
      </section>
    </main>
  </>;
}
