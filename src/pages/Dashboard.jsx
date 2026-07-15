import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { getReport } from "../services/reportService";
import { allCandidates } from "../services/employeeService";

export default function Dashboard() {
  const r = getReport();

  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);

  const statusClass = (status = "Draft") =>
    status.toLowerCase().replaceAll(" ", "-");

  const getCandidateTime = (c) =>
    c.createdAt || c.appliedAt || c.updatedAt || c.submittedAt || c.id || "";

  const candidates = allCandidates();

  const recent = [...candidates].sort((a, b) => {
    const dateA = new Date(getCandidateTime(a)).getTime();
    const dateB = new Date(getCandidateTime(b)).getTime();

    if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
      return dateB - dateA;
    }

    return String(getCandidateTime(b)).localeCompare(String(getCandidateTime(a)));
  });

  const totalRecords = recent.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecent = recent.slice(startIndex, endIndex);

  const handleRecordsPerPageChange = (e) => {
    setRecordsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <div className="page-head">
          <div>
            <span className="eyebrow">Admin workspace</span>
            <h1>Verification Dashboard</h1>
            <p className="muted">
              Monitor candidate applications, documents and verification status.
            </p>
          </div>
        </div>

        <div className="cards">
          {Object.entries(r).map(([k, v]) => (
            <div className="card" key={k}>
              <small>{k.toUpperCase()}</small>
              <b>{v}</b>
            </div>
          ))}
        </div>

        <section className="panel">
          <div className="table-title">
            <h2>Recent Applications</h2>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Skills</th>
                  <th>Applied Role</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRecent.length ? (
                  paginatedRecent.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="candidate-cell">
                          <div className="candidate-avatar">
                            {(c.fullName || "C").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{c.fullName || "Candidate"}</strong>
                            <small>{c.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{c.candidateType || "-"}</td>
                      <td>
                        <span className={`badge ${statusClass(c.status)}`}>
                          {c.status || "Draft"}
                        </span>
                      </td>
                      <td>
                        <div className="skill-tags-small">
                          {(c.skills || []).slice(0, 2).map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                          {!(c.skills || []).length && <span>-</span>}
                        </div>
                      </td>
                      <td>{c.appliedRole || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty">
                      No applications yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalRecords > 0 && (
            <div className="pagination">
              <p>
                Showing <b>{startIndex + 1}</b> -{" "}
                <b>{Math.min(endIndex, totalRecords)}</b> of{" "}
                <b>{totalRecords}</b> records
              </p>

              <div className="pagination-actions">
                <select
                  value={recordsPerPage}
                  onChange={handleRecordsPerPageChange}
                >
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>

                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                >
                  First
                </button>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={safeCurrentPage === 1}
                >
                  Previous
                </button>

                <span>
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={safeCurrentPage === totalPages}
                >
                  Next
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Workflow</h2>
          <p className="muted">
            Candidate registers, uploads fresher/experience documents, submits
            application. HR/Admin reviews uploaded files and updates status.
          </p>
        </section>
      </main>
    </div>
  );
}