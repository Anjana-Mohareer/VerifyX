import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { addCandidate } from "../services/employeeService";

export default function AddEmployeeForm() {
  const navigate = useNavigate();
  const [err, setErr] = useState("");

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

  const submit = (e) => {
    e.preventDefault();
    setErr("");

    try {
      addCandidate(form);
      alert("Candidate added successfully.");
      navigate("/employees");
    } catch (error) {
      setErr(error.message || "Failed to add candidate.");
    }
  };

  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <div className="page-head">
          <div>
            <span className="eyebrow">Admin workspace</span>
            <h1>Add Candidate</h1>
            <p className="muted">
              Add a candidate directly from HR/Admin panel.
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
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
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
              <button type="submit" className="btn primary">
                Save Candidate
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => navigate("/employees")}
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