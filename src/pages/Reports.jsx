import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { allCandidates, isSubmittedCandidate } from "../services/employeeService";
import { getReport } from "../services/reportService";

const EMPTY_REPORT = {
  total: 0,
  verified: 0,
  pending: 0,
  rejected: 0,
};

const normalizeCandidates = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.candidates)) return response.candidates;
  return [];
};

const normalizeReport = (response) => {
  const source = response?.data && typeof response.data === "object"
    ? response.data
    : response;

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return EMPTY_REPORT;
  }

  return source;
};

const reportFromCandidates = (candidates = []) => {
  const status = (candidate) => String(candidate.status || candidate.verificationStatus || "PENDING").toUpperCase();
  return {
    total: candidates.length,
    verified: candidates.filter((candidate) => status(candidate).includes("VERIFIED") || status(candidate).includes("APPROVED")).length,
    pending: candidates.filter((candidate) => !status(candidate).includes("VERIFIED") && !status(candidate).includes("APPROVED") && !status(candidate).includes("REJECTED")).length,
    rejected: candidates.filter((candidate) => status(candidate).includes("REJECTED")).length,
  };
};

export default function Reports() {
  const [report, setReport] = useState(EMPTY_REPORT);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const candidateResponse = await allCandidates();
      const candidateRows = normalizeCandidates(candidateResponse).filter(isSubmittedCandidate);
      setCandidates(candidateRows);
      setReport(reportFromCandidates(candidateRows));

      try {
        const backendReport = normalizeReport(await getReport());
        if (Number(backendReport.total) > 0 || candidateRows.length === 0) {
          setReport({ ...reportFromCandidates(candidateRows), ...backendReport });
        }
      } catch {
        // The local candidate report above remains available when the backend is offline.
      }
    } catch (err) {
      console.error("Unable to load reports:", err);
      setCandidates([]);
      setReport(EMPTY_REPORT);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Unable to load reports. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const getCandidateTime = (candidate) =>
    candidate.submittedAt ||
    candidate.updatedAt ||
    candidate.createdAt ||
    candidate.appliedAt ||
    candidate.id ||
    "";

  const rows = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const dateA = new Date(getCandidateTime(a)).getTime();
      const dateB = new Date(getCandidateTime(b)).getTime();

      if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
        return dateB - dateA;
      }

      return String(getCandidateTime(b)).localeCompare(
        String(getCandidateTime(a))
      );
    });
  }, [candidates]);

  const totalRecords = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRows = rows.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const exportCsv = () => {
    if (!rows.length) {
      window.alert("No report records are available to export.");
      return;
    }

    const header = ["ID", "Name", "Email", "Phone", "Type", "Status", "Role"];

    const csv = [
      header.join(","),
      ...rows.map((candidate, index) =>
        [
          Number.isFinite(Number(candidate.candidateId)) ? Number(candidate.candidateId) : index + 1,
          candidate.fullName || candidate.name,
          candidate.email,
          candidate.phone,
          candidate.candidateType,
          candidate.status || candidate.verificationStatus,
          candidate.appliedRole,
        ]
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "verify-x-report.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleRecordsPerPageChange = (event) => {
    setRecordsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <div className="page-head">
          <div>
            <h1>Reports</h1>
            <p className="muted">Verification Report and Export.</p>
          </div>

          <button
            className="btn primary"
            onClick={exportCsv}
            disabled={loading || rows.length === 0}
          >
            Export CSV
          </button>
        </div>

        {error && (
          <section className="panel">
            <p className="empty">{error}</p>
            <button className="btn primary" onClick={loadReports}>
              Retry
            </button>
          </section>
        )}

        <div className="cards">
          {Object.entries(report).map(([key, value]) => (
            <div className="card" key={key}>
              <small>{key.replaceAll("_", " ").toUpperCase()}</small>
              <b>{value ?? 0}</b>
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
                {loading ? (
                  <tr>
                    <td colSpan="5" className="empty">
                      Loading report records...
                    </td>
                  </tr>
                ) : paginatedRows.length ? (
                  paginatedRows.map((candidate, index) => (
                    <tr key={candidate.id || candidate.email}>
                      <td>{Number.isFinite(Number(candidate.candidateId)) ? Number(candidate.candidateId) : startIndex + index + 1}</td>
                      <td>{candidate.fullName || candidate.name || "-"}</td>
                      <td>{candidate.candidateType || "-"}</td>
                      <td>
                        {candidate.status ||
                          candidate.verificationStatus ||
                          "PENDING"}
                      </td>
                      <td>{candidate.appliedRole || "-"}</td>
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

                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                >
                  First
                </button>

                <button
                  onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
                  disabled={safeCurrentPage === 1}
                >
                  Previous
                </button>

                <span>
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((previous) =>
                      Math.min(previous + 1, totalPages)
                    )
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
