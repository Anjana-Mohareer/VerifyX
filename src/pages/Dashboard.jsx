import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { allCandidates, deleteCandidate } from "../services/employeeService";
import "./DashboardPro.css";

const label = (value = "Draft") => String(value || "Draft").replaceAll("_", " ").replaceAll("-", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const statusClass = (status = "") => {
  const value = String(status).toLowerCase();
  if (value.includes("reject")) return "rejected";
  if (value.includes("approv") || (value.includes("verif") && !value.includes("pending"))) return "approved";
  return "pending";
};
const rowKey = (candidate = {}) => String(candidate.email || candidate.id || candidate.identity || candidate.fullName || "").trim().toLowerCase();
const dedupe = (list = []) => {
  const rows = new Map();
  list.forEach((candidate) => {
    const key = rowKey(candidate);
    if (!key) return;
    const existing = rows.get(key);
    if (!existing) rows.set(key, candidate);
    else {
      const existingScore = Object.values(existing).filter(Boolean).length;
      const nextScore = Object.values(candidate).filter(Boolean).length;
      rows.set(key, nextScore >= existingScore ? { ...existing, ...candidate } : { ...candidate, ...existing });
    }
  });
  return Array.from(rows.values());
};

function CandidatePhoto({ candidate }) {
  const photo = candidate.photo || candidate.photoUrl || candidate.profilePhoto || candidate.profilePhotoUrl || candidate.imageUrl;
  const initial = (candidate.fullName || candidate.name || "C").charAt(0).toUpperCase();
  return photo
    ? <img className="hr-candidate-photo" src={photo} alt={`${candidate.fullName || "Candidate"} profile`} />
    : <span className="hr-candidate-photo hr-photo-fallback">{initial}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    setLoading(true); setError("");
    try { setCandidates(dedupe(await allCandidates())); }
    catch (err) { setError(err?.message || "Unable to load candidates."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((candidate) => {
      const skills = Array.isArray(candidate.skills) ? candidate.skills.join(" ") : candidate.skills || "";
      return [candidate.id, candidate.applicationId, candidate.fullName, candidate.phone, candidate.email, candidate.candidateType, skills, candidate.appliedRole, candidate.status]
        .some((field) => String(field || "").toLowerCase().includes(q));
    });
  }, [candidates, query]);

  const summary = useMemo(() => {
    const status = (candidate) => String(candidate.status || candidate.verificationStatus || "DRAFT").toUpperCase();
    const type = (candidate) => String(candidate.candidateType || "FRESHER").toUpperCase();
    return [
      { key: "total", icon: "👥", label: "Total Candidates", value: candidates.length },
      { key: "verified", icon: "✅", label: "Verified", value: candidates.filter((candidate) => status(candidate).includes("VERIFIED")).length },
      { key: "rejected", icon: "⊘", label: "Rejected", value: candidates.filter((candidate) => status(candidate).includes("REJECTED")).length },
      { key: "approved", icon: "☑", label: "Approved", value: candidates.filter((candidate) => status(candidate).includes("APPROVED")).length },
      { key: "freshers", icon: "🎓", label: "Freshers", value: candidates.filter((candidate) => type(candidate).includes("FRESHER")).length },
      { key: "experienced", icon: "💼", label: "Experienced", value: candidates.filter((candidate) => type(candidate).includes("EXPERIENCED")).length },
    ];
  }, [candidates]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  useEffect(() => { setPage(1); }, [query, pageSize]);

  const pathFor = (candidate, suffix = "") => `/employees/${encodeURIComponent(candidate.id || candidate.identity)}${suffix}`;
  const remove = async (candidate) => {
    if (!window.confirm(`Delete ${candidate.fullName || candidate.email || "this candidate"}? This action cannot be undone.`)) return;
    try { await deleteCandidate(candidate.id || candidate.identity); await load(); }
    catch (err) { alert(err?.message || "Unable to delete candidate."); }
  };

  return <div className="app hr-dashboard-app">
    <Sidebar />
    <main className="content hr-dashboard-content">
      <header className="hr-dashboard-heading">
        <div><span className="eyebrow">HR Workspace</span><h1>Candidate Dashboard</h1><p>Review and manage every candidate from one clear table.</p></div>
        <div className="hr-heading-actions"><span className="hr-total-count">{loading ? "…" : `${filtered.length} Candidates`}</span><button className="btn primary hr-add-candidate" onClick={() => navigate("/add-employee")}>+ Add Candidate</button></div>
      </header>

      <section className="hr-summary-grid" aria-label="Candidate summary">
        {summary.map((card) => <article className={`hr-summary-card ${card.key}`} key={card.key}>
          <span className="hr-summary-icon" aria-hidden="true">{card.icon}</span>
          <div><small>{card.label}</small><strong>{loading ? "…" : card.value}</strong></div>
        </article>)}
      </section>

      <section className="hr-dashboard-table-panel">
        <div className="hr-table-toolbar">
          <label className="hr-dashboard-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ID, name, phone, email, skill or role" aria-label="Search candidates" /></label>
          <label className="hr-page-size"><span>Rows</span><select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
        </div>
        {error && <div className="error hr-dashboard-feedback">{error}<button onClick={load}>Retry</button></div>}

        <div className="hr-candidate-table-wrap">
          <table className="hr-candidate-table">
            <thead><tr><th>Photo</th><th>ID</th><th>Name</th><th>Phone</th><th>Email ID</th><th>Type</th><th>Skills</th><th>Applied Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="10" className="hr-empty-row">Loading candidates…</td></tr> :
                visible.length ? visible.map((candidate, index) => {
                  const id = Number.isFinite(Number(candidate.candidateId)) ? Number(candidate.candidateId) : start + index + 1;
                  const skills = Array.isArray(candidate.skills) ? candidate.skills.filter(Boolean) : [];
                  return <tr key={rowKey(candidate) || id}>
                    <td data-label="Photo"><CandidatePhoto candidate={candidate} /></td>
                    <td data-label="ID"><span className="hr-id-cell" title={String(id)}>{String(id)}</span></td>
                    <td data-label="Name"><strong className="hr-name-cell">{candidate.fullName || candidate.name || "Not added"}</strong></td>
                    <td data-label="Phone">{candidate.phone || candidate.mobile || "Not added"}</td>
                    <td data-label="Email ID"><span className="hr-email-cell">{candidate.email || "Not added"}</span></td>
                    <td data-label="Type"><span className="hr-type-pill">{label(candidate.candidateType || "Fresher")}</span></td>
                    <td data-label="Skills"><div className="hr-skill-list">{skills.length ? skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>) : <em>Not added</em>}{skills.length > 3 && <span>+{skills.length - 3}</span>}</div></td>
                    <td data-label="Applied Role">{candidate.appliedRole || "Not added"}</td>
                    <td data-label="Status"><span className={`hr-status-pill ${statusClass(candidate.status)}`}>{label(candidate.status)}</span></td>
                    <td data-label="Actions"><div className="hr-action-buttons">
                      <button className="hr-icon-button view" onClick={() => navigate(pathFor(candidate))} aria-label="View candidate" title="View profile">👁</button>
                      <button className="hr-icon-button edit" onClick={() => navigate(pathFor(candidate, "/edit"))} aria-label="Edit candidate" title="Edit candidate">✎</button>
                      <button className="hr-icon-button delete" onClick={() => remove(candidate)} aria-label="Delete candidate" title="Delete candidate">🗑</button>
                    </div></td>
                  </tr>;
                }) : <tr><td colSpan="10" className="hr-empty-row">No candidates match your search.</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className="hr-table-footer">
          <span>{filtered.length ? `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length}` : "0 candidates"}</span>
          <div><button disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button><b>Page {safePage} of {totalPages}</b><button disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button></div>
        </footer>
      </section>
    </main>
  </div>;
}
