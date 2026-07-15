import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { allCandidates } from "../services/employeeService";
import { getReport } from "../services/reportService";

export default function Reports() {
  const r = getReport();
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);

  const getCandidateTime = (c) =>
    c.submittedAt || c.updatedAt || c.createdAt || c.appliedAt || c.id || "";

  const rows = useMemo(() => {
    return [...allCandidates()].sort((a, b) => {
      const dateA = new Date(getCandidateTime(a)).getTime();
      const dateB = new Date(getCandidateTime(b)).getTime();

      if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
        return dateB - dateA;
      }

      return String(getCandidateTime(b)).localeCompare(String(getCandidateTime(a)));
    });
  }, []);

  const totalRecords = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRows = rows.slice(startIndex, endIndex);

  const exportCsv = () => {
    const header = ["ID", "Name", "Email", "Phone", "Type", "Status", "Role"];

    const csv = [
      header.join(","),
      ...rows.map((c) =>
        [
          c.id,
          c.fullName,
          c.email,
          c.phone,
          c.candidateType,
          c.status,
          c.appliedRole,
        ]
          .map((v) => `"${String(v || "").replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "verify-x-report.csv";
    a.click();
  };

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
            <h1>Reports</h1>
            <p className="muted">Verification report and export.</p>
          </div>

          <button className="btn primary" onClick={exportCsv}>
            Export CSV
          </button>
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
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Role</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRows.length ? (
                  paginatedRows.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.fullName}</td>
                      <td>{c.candidateType}</td>
                      <td>{c.status}</td>
                      <td>{c.appliedRole || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty">
                      No report records found.
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
                <b>{totalRecords}</b> records
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

                <button onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}>
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
          )}
        </section>
      </main>
    </div>
  );
}