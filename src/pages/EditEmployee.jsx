import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { findCandidate, updateCandidate } from "../services/employeeService";
import { REGEX, onlyDigits, cleanPan } from "../utils/validators";

export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillsText, setSkillsText] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", candidateType: "FRESHER", appliedRole: "", address: "", pan: "", aadhaar: "", skills: [] });

  useEffect(() => {
    findCandidate(id).then((candidate) => {
      setSkillsText((Array.isArray(candidate.skills) ? candidate.skills : typeof candidate.skills === "string" ? candidate.skills.split(",") : []).join(", "));
      setForm({
        fullName: candidate.fullName || "", email: candidate.email || "", phone: candidate.phone || "",
        candidateType: candidate.candidateType || "FRESHER", appliedRole: candidate.appliedRole || "",
        address: candidate.permanentAddress || candidate.address || "", pan: candidate.pan || "", aadhaar: candidate.aadhaar || "",
        skills: Array.isArray(candidate.skills) ? candidate.skills : [],
      });
    }).catch((err) => setError(err.message || "Unable to load candidate.")).finally(() => setLoading(false));
  }, [id]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (!REGEX.mobile.test(form.phone)) return setError("Mobile number must contain exactly 10 digits and start with 6, 7, 8 or 9.");
    if (form.pan && !REGEX.pan.test(form.pan)) return setError("PAN must be in ABCDE1234F format (5 letters, 4 digits, 1 letter).");
    if (form.aadhaar && !REGEX.aadhaar.test(form.aadhaar)) return setError("Aadhaar must contain exactly 12 digits.");
    if (!REGEX.email.test(form.email)) return setError("Please enter a valid email address.");
    const skills = [...new Set(skillsText.split(",").map((v) => v.trim()).filter(Boolean))];
    setSaving(true);
    try { await updateCandidate(id, { ...form, skills }); alert("Candidate Updated Successfully."); navigate("/dashboard"); }
    catch (err) { setError(err.message || "Unable To Update Candidate."); }
    finally { setSaving(false); }
  };

  return <div className="app"><Sidebar/><main className="content">
    <div className="page-head"><div><span className="eyebrow">Candidate Workspace</span><h1>Edit Candidate</h1><p className="muted">Update The Candidate Information Without Changing The Verification Workflow.</p></div></div>
    <section className="panel">{loading ? <div className="vx-feedback">Loading Candidate...</div> : <form className="admin-add-form" onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="grid2">
        <input placeholder="Full Name" value={form.fullName} onChange={(e)=>set("fullName",e.target.value)} required/>
        <input placeholder="Email" type="email" value={form.email} onChange={(e)=>set("email",e.target.value)} required/>
        <input placeholder="Phone" type="tel" inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" title="Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9" value={form.phone} onChange={(e)=>set("phone",onlyDigits(e.target.value,10))} required/>
        <input placeholder="Applied Role" value={form.appliedRole} onChange={(e)=>set("appliedRole",e.target.value)}/>
        <input placeholder="PAN Number" maxLength={10} pattern="[A-Z]{5}[0-9]{4}[A-Z]" title="PAN format: ABCDE1234F" value={form.pan} onChange={(e)=>set("pan",cleanPan(e.target.value))}/>
        <input placeholder="Aadhaar Number" inputMode="numeric" maxLength={12} pattern="[0-9]{12}" title="Aadhaar must contain exactly 12 digits" value={form.aadhaar} onChange={(e)=>set("aadhaar",onlyDigits(e.target.value,12))}/>
        <input placeholder="Address" value={form.address} onChange={(e)=>set("address",e.target.value)}/>
        <input placeholder="Skills (comma separated)" value={skillsText} onChange={(e)=>setSkillsText(e.target.value)}/>
        <select value={form.candidateType} onChange={(e)=>set("candidateType",e.target.value)}><option value="FRESHER">Fresher</option><option value="EXPERIENCED">Experienced</option></select>
      </div>
      <div className="form-actions"><button className="btn primary" disabled={saving}>{saving ? "Saving..." : "Update Candidate"}</button><button type="button" className="btn" onClick={()=>navigate("/dashboard")}>Cancel</button></div>
    </form>}</section>
  </main></div>;
}
