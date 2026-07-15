import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { allCandidates, verifyCandidateUan } from "../services/employeeService";
import { Link } from "react-router-dom";

export default function VerificationRequest() {
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [itemsVersion, setItemsVersion] = useState(0);

  const getCandidateTime = (c) =>
    c.createdAt || c.appliedAt || c.updatedAt || c.submittedAt || c.id || "";

  const items = useMemo(() => {
    return allCandidates()
      .filter((c) => c.status !== "Draft")
      .sort((a, b) => {
        const dateA = new Date(getCandidateTime(a)).getTime();
        const dateB = new Date(getCandidateTime(b)).getTime();

        if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
          return dateB - dateA;
        }

        return String(getCandidateTime(b)).localeCompare(
          String(getCandidateTime(a))
        );
      });
  }, [itemsVersion]);

  const totalRecords = items.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  const handleRecordsPerPageChange = (e) => {
    setRecordsPerPage(Number(e.target.value));
    setCurrentPage(1);
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
      setItemsVersion((prev) => prev + 1);
    }
  };


  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <h1>Verification Requests</h1>
        <p className="muted">
          Applications submitted by candidates for HR/Admin review.
        </p>

        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Type</th>
                  <th>Documents</th>
                  <th>UAN Verification</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>

              <tbody>
                {paginatedItems.length ? (
                  paginatedItems.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {c.fullName}
                        <br />
                        <small>{c.email}</small>
                      </td>
                      <td>{c.candidateType}</td>
                      <td>{c.documents?.length || 0}</td>
                      <td>
                        {c.candidateType === "Experienced" ? (
                          <div className="uan-review-cell">
                            <small>{c.uan || "UAN not provided"}</small>
                            {c.uanVerified ? (
                              <span className="doc-status-pill verified">Verified by HR</span>
                            ) : (
                              <>
                                <span className="doc-status-pill pending">Pending HR Verification</span>
                                <button
                                  type="button"
                                  className="btn success small"
                                  onClick={() => handleVerifyUan(c)}
                                >
                                  Verify UAN
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="muted">Not required</span>
                        )}
                      </td>
                      <td>
                        <span className="badge">{c.status}</span>
                      </td>
                      <td>
                        <Link className="btn small primary" to={`/employees/${c.id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty">
                      No verification requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalRecords > 0 && (
            <div className="vx-pagination">
              <div className="vx-pagination-info">
                Showing <b>{startIndex + 1}</b> -{" "}
                <b>{Math.min(endIndex, totalRecords)}</b> of{" "}
                <b>{totalRecords}</b> requests
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
      </main>
    </div>
  );
}