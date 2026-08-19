import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { addCandidate } from "../services/employeeService";
import { onlyDigits } from "../utils/validators";

export default function AddEmployeeForm() {
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    candidateType: "Fresher",
    appliedRole: "",
    status: "Draft",
  });

  const set = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!fullName) {
      setErr("Full name is required.");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setErr("Phone number must contain only numbers and be exactly 10 digits.");
      return;
    }

    setSaving(true);
    try {
      await addCandidate({ ...form, fullName, email, phone });
      alert("Candidate added successfully.");
      // Go to the full Candidate Management list, which shows every
      // candidate regardless of status. (The Dashboard overview only
      // shows candidates who have submitted documents, so a freshly
      // added "Draft" candidate would otherwise appear to vanish.)
      navigate("/employees");
    } catch (error) {
      setErr(error.message || "Failed to add candidate.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <div className="page-head">
          <div>
            <span className="eyebrow">Admin Workspace</span>
            <h1>Add Candidate</h1>
            <p className="muted">
              Add a Candidate Directly From HR/Admin Panel.
            </p>
          </div>
        </div>

        <section className="panel">
          <form className="admin-add-form" onSubmit={submit}>
            {err && <div className="error">{err}</div>}

            <div className="grid2">
              <input
                placeholder="Full Name"
                value={form.fullName}
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
                placeholder="Phone (10 digits)"
                value={form.phone}
                onChange={(e) => set("phone", onlyDigits(e.target.value, 10))}
                inputMode="numeric"
                maxLength={10}
                required
              />

              <input
                placeholder="Applied Role"
                value={form.appliedRole}
                onChange={(e) => set("appliedRole", e.target.value)}
              />

              <select
                value={form.candidateType}
                onChange={(e) => set("candidateType", e.target.value)}
              >
                <option>Fresher</option>
                <option>Experienced</option>
              </select>

              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Draft</option>
                <option>Pending Verification</option>
                <option>Approved</option>
                <option>Rejected</option>
                <option>Re-upload Required</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "Saving..." : "Save Candidate"}
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
