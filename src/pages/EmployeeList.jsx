import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { allCandidates, deleteCandidate, verifyCandidateUan } from "../services/employeeService";

export default function EmployeeList() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState(allCandidates());
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);

  const getCandidateTime = (c) =>
    c.createdAt || c.appliedAt || c.updatedAt || c.submittedAt || c.id || "";

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateA = new Date(getCandidateTime(a)).getTime();
      const dateB = new Date(getCandidateTime(b)).getTime();

      if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
        return dateB - dateA;
      }

      return String(getCandidateTime(b)).localeCompare(
        String(getCandidateTime(a))
      );
    });
  }, [items]);

  const filtered = useMemo(() => {
    const search = q.toLowerCase().trim();

    return sortedItems.filter((c) =>
      `${c.fullName || c.name || ""} ${c.email || ""} ${c.phone || ""} ${
        c.id || ""
      } ${(c.skills || []).join(" ")}`
        .toLowerCase()
        .includes(search)
    );
  }, [sortedItems, q]);

  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedCandidates = filtered.slice(startIndex, endIndex);

  const del = (id) => {
    if (confirm("Delete this candidate?")) {
      deleteCandidate(id);
      setItems(allCandidates());
      setCurrentPage(1);
    }
  };


  const handleVerifyUan = (candidate) => {
    if (!candidate.uan) {
      alert("UAN number is not available for this candidate.");
      return;
    }

    if (!/^\d{12}$/.test(String(candidate.uan))) {
      alert("UAN number must be exactly 12 digits before HR verification.");
      return;
    }

    const updated = verifyCandidateUan(candidate.id, "HR");
    if (updated) {
      alert("UAN verified successfully by HR.");
      setItems(allCandidates());
    }
  };

  const handleSearchChange = (e) => {
    setQ(e.target.value);
    setCurrentPage(1);
  };

  const handleRecordsPerPageChange = (e) => {
    setRecordsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const statusClass = (status = "Draft") =>
    status.toLowerCase().replaceAll(" ", "-");

  const initial = (name = "Candidate") => name.charAt(0).toUpperCase();

  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <div className="vx-page-header">
          <div>
            <span className="eyebrow">Candidate workspace</span>
            <h1>Candidate Management</h1>
            <p>Search, review and manage all candidate applications.</p>
          </div>

          <Link className="btn primary" to="/add-employee">
            + Add Candidate
          </Link>
        </div>

        <div className="vx-toolbar">
          <div className="vx-search">
            <span>⌕</span>
            <input
              placeholder="Search by name, email, phone, application ID or skill"
              value={q}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <section className="vx-table-card">
          <div className="table-wrap">
            <table className="vx-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Skills</th>
                  <th>UAN</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedCandidates.length ? (
                  paginatedCandidates.map((c) => {
                    const name = c.fullName || c.name || "Candidate";

                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="vx-candidate-cell">
                            <div className="vx-avatar">{initial(name)}</div>
                            <div>
                              <strong>{name}</strong>
                              <small>{c.email || "No email"}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="vx-phone">☎️ {c.phone || "-"}</span>
                        </td>

                        <td>
                          <span className="vx-type">
                            💼 {c.candidateType || "-"}
                          </span>
                        </td>

                        <td>
                          <div className="skill-tags-small">
                            {(c.skills || []).slice(0, 3).map((skill) => (
                              <span key={skill}>{skill}</span>
                            ))}
                            {(c.skills || []).length > 3 && <small>+{(c.skills || []).length - 3}</small>}
                            {!(c.skills || []).length && <span>-</span>}
                          </div>
                        </td>

                        <td>
                          {c.candidateType === "Experienced" ? (
                            <div className="uan-review-cell">
                              <small>{c.uan || "UAN not provided"}</small>
                              {c.uanVerified ? (
                                <span className="doc-status-pill verified">Verified by HR</span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn success small"
                                  onClick={() => handleVerifyUan(c)}
                                >
                                  Verify UAN
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="muted">Not required</span>
                          )}
                        </td>

                        <td>
                          <span className={`vx-status ${statusClass(c.status)}`}>
                            {c.status || "Draft"}
                          </span>
                        </td>

                        <td>
                          <div className="vx-actions">
                            <Link className="vx-view-btn" to={`/employees/${c.id}`}>
                              View
                            </Link>

                            <button
                              className="vx-delete-btn"
                              onClick={() => del(c.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="empty">
                      No candidates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="vx-pagination">
            <div className="vx-pagination-info">
              Showing{" "}
              <b>{totalRecords === 0 ? 0 : startIndex + 1}</b> -{" "}
              <b>{Math.min(endIndex, totalRecords)}</b> of{" "}
              <b>{totalRecords}</b> candidates
            </div>

            <div className="vx-pagination-actions">
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
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
        </section>
      </main>
    </div>
  );
}