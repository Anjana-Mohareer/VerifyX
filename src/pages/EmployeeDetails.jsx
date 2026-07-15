import { useParams } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  DOC_STATUS,
  findCandidate,
  rejectCandidateDocument,
  verifyCandidateDocument,
  verifyCandidateUan,
} from "../services/employeeService";
import { updateStatus } from "../services/verificationService";
import { sendStatusMail } from "../services/mailService";

function getDocStatus(doc) {
  return doc?.status || (doc?.verified ? DOC_STATUS.VERIFIED : DOC_STATUS.PENDING);
}

function getStatusLabel(status) {
  if (status === DOC_STATUS.VERIFIED) return "Verified";
  if (status === DOC_STATUS.REJECTED) return "Rejected";
  return "Pending Review";
}

export default function EmployeeDetails() {
  const { id } = useParams();
  const [c, setC] = useState(findCandidate(id));
  const [remarks, setRemarks] = useState(c?.remarks || "");
  const [loading, setLoading] = useState(false);

  if (!c) {
    return (
      <div className="app">
        <Sidebar />
        <main className="content">
          <section className="panel">Candidate not found.</section>
        </main>
      </div>
    );
  }

  const setStatus = async (status) => {
    if (status === "Approved" && c.candidateType === "Experienced" && c.uan && !c.uanVerified) {
      alert("Please verify the candidate UAN before approving the application.");
      return;
    }

    setLoading(true);

    const updatedCandidate = updateStatus(c.id, status, remarks);
    setC(updatedCandidate);

    try {
      await sendStatusMail(updatedCandidate, status, remarks);
      alert("Status updated and mail notification sent successfully.");
    } catch (error) {
      console.error("Mail notification failed:", error);
      alert("Status updated, but mail notification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = (docName) => {
    const updated = verifyCandidateDocument(c.id, docName, "HR");
    if (updated) {
      setC(updated);
      alert(`${docName} verified successfully.`);
    }
  };

  const handleRejectDocument = (docName) => {
    const reason = window.prompt(`Enter rejection reason for ${docName}:`);
    if (reason === null) return;

    if (!reason.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }

    const updated = rejectCandidateDocument(c.id, docName, reason.trim(), "HR");
    if (updated) {
      setC(updated);
      alert(`${docName} rejected. Candidate can re-upload only this document.`);
    }
  };

  const handleVerifyUan = () => {
    if (!c.uan) {
      alert("UAN number is not available for this candidate.");
      return;
    }

    if (!/^\d{12}$/.test(String(c.uan))) {
      alert("UAN number must be exactly 12 digits before verification.");
      return;
    }

    const updated = verifyCandidateUan(c.id, "HR");
    if (updated) {
      setC(updated);
      alert("UAN verified successfully by HR.");
    }
  };

  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <h1>{c.fullName}</h1>
        <p className="muted">
          {c.id} • {c.email}
        </p>

        <section className="panel">
          <h2>Candidate Details</h2>

          <div className="skill-review-box">
            <h3>Candidate Skills</h3>
            <p><b>Technical Skills:</b> {(c.skills || []).join(", ") || "No skills selected"}</p>
            <p><b>Soft Skills:</b> {(c.softSkills || []).join(", ") || "Not provided"}</p>
            <p><b>Languages:</b> {(c.languages || []).join(", ") || "Not provided"}</p>
          </div>

          <div className="details">
            {Object.entries(c)
              .filter(([k]) => !["password", "documents"].includes(k))
              .map(([k, v]) => (
                <p key={k}>
                  <b>{k}:</b> {Array.isArray(v) ? v.join(", ") : String(v || "-")}
                </p>
              ))}
          </div>
        </section>

        {c.candidateType === "Experienced" && (
          <section className="panel">
            <h2>UAN Verification</h2>
            <p><b>UAN Number:</b> {c.uan || "Not provided"}</p>
            <p>
              <b>Status:</b>{" "}
              <span className={`doc-status-pill ${c.uanVerified ? "verified" : "pending"}`}>
                {c.uanVerified ? "Verified by HR" : "Pending HR Verification"}
              </span>
            </p>

            {c.uanVerified && c.uanVerifiedAt && (
              <p className="muted small-text">
                Verified by {c.uanVerifiedBy || "HR"} on {new Date(c.uanVerifiedAt).toLocaleString()}
              </p>
            )}

            {!c.uanVerified && (
              <button className="btn success" onClick={handleVerifyUan}>
                Verify UAN
              </button>
            )}
          </section>
        )}

        <section className="panel">
          <h2>Documents Review</h2>
          <p className="muted">
            Verify correct documents. Reject only incorrect documents with a reason so candidate can re-upload only those files.
          </p>

          {c.documents?.length ? (
            <div className="doc-review-list">
              {c.documents.map((d) => {
                const status = getDocStatus(d);
                const isVerified = status === DOC_STATUS.VERIFIED;
                const isRejected = status === DOC_STATUS.REJECTED;

                return (
                  <div className="doc-review-card" key={d.name}>
                    <div>
                      <h4>{d.name}</h4>
                      <p className="muted">{d.fileName}</p>
                      <span className={`doc-status-pill ${String(status).toLowerCase()}`}>
                        {getStatusLabel(status)}
                      </span>

                      {isRejected && d.rejectionReason && (
                        <p className="doc-reject-reason"><b>Reason:</b> {d.rejectionReason}</p>
                      )}

                      {isVerified && d.verifiedAt && (
                        <p className="muted small-text">
                          Verified by {d.verifiedBy || "HR"} on {new Date(d.verifiedAt).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="doc-review-actions">
                      <a className="btn" href={d.data} target="_blank" rel="noreferrer">
                        View
                      </a>

                      {!isVerified && (
                        <button className="btn success" onClick={() => handleVerifyDocument(d.name)}>
                          Verify
                        </button>
                      )}

                      {!isRejected && (
                        <button className="btn danger" onClick={() => handleRejectDocument(d.name)}>
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">No documents uploaded.</p>
          )}
        </section>

        <section className="panel">
          <h2>Application Verification Action</h2>

          <textarea
            placeholder="Remarks for candidate"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />

          <div className="actions">
            <button className="btn warn" disabled={loading} onClick={() => setStatus("Re-upload Required")}>
              Request Re-upload
            </button>

            <button className="btn success" disabled={loading} onClick={() => setStatus("Approved")}>
              Approve
            </button>

            <button className="btn danger" disabled={loading} onClick={() => setStatus("Rejected")}>
              Reject
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
