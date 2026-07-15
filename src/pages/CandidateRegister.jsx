import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { registerCandidate } from "../services/authService";
import useAuth from "../hooks/useAuth";
import { REGEX, onlyDigits, onlyLetters } from "../utils/validators";

export default function CandidateRegister() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    candidateType: "Fresher",
    appliedRole: "",
  });

  const set = (key, value) => {
    let safeValue = value;
    if (key === "fullName") safeValue = onlyLetters(value);
    if (key === "phone") safeValue = onlyDigits(value, 10);
    setForm({ ...form, [key]: safeValue });
  };

  const submit = (e) => {
    e.preventDefault();
    setErr("");

    if (!REGEX.name.test(form.fullName.trim())) {
      setErr("Full name must contain only letters and spaces.");
      return;
    }

    if (!REGEX.email.test(form.email.trim())) {
      setErr("Please enter a valid email address.");
      return;
    }

    if (!REGEX.mobile.test(form.phone.trim())) {
      setErr("Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9.");
      return;
    }

    try {
      registerCandidate(form);
      refresh();
      nav("/candidate");
    } catch (x) {
      setErr(x.message);
    }
  };

  return (
    <>
      <Navbar />
      <main className="auth-wrap">
        <form className="auth-card wide" onSubmit={submit}>
          <h1>Candidate Sign Up</h1>
          <p className="muted">Register first. Then complete fresher or experienced application.</p>

          {err && <div className="error">{err}</div>}

          <div className="grid2">
            <input
              placeholder="Full Name"
              value={form.fullName}
              maxLength={60}
              onChange={(e) => set("fullName", e.target.value)}
              required
            />

            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />

            <input
              placeholder="Phone"
              value={form.phone}
              maxLength={10}
              inputMode="numeric"
              onChange={(e) => set("phone", e.target.value)}
              required
            />

            <input
              placeholder="Applied Role"
              value={form.appliedRole}
              onChange={(e) => set("appliedRole", e.target.value)}
            />

            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
            />

            <select
              value={form.candidateType}
              onChange={(e) => set("candidateType", e.target.value)}
            >
              <option>Fresher</option>
              <option>Experienced</option>
            </select>
          </div>

          <button className="btn primary full">Create Account</button>

          <p>Already registered? <Link to="/candidate-login">Login</Link></p>
        </form>
      </main>
    </>
  );
}
