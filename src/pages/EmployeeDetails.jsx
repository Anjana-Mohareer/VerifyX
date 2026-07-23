import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
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

const FRESHER_REQUIRED_DOCUMENTS = ["Resume", "Offer Letter", "Aadhaar Card", "PAN Card"];
const EXPERIENCED_REQUIRED_DOCUMENTS = [
  "Resume", "Offer Letter", "Last Month Salary Slip", "Relieving Letter",
  "Experience Letter", "PAN Card", "UAN Proof",
];

function getRequiredDocuments(candidate) {
  return candidate?.candidateType === "Experienced"
    ? EXPERIENCED_REQUIRED_DOCUMENTS
    : FRESHER_REQUIRED_DOCUMENTS;
}

function getMissingDocuments(candidate) {
  const uploaded = candidate?.documents || [];
  return getRequiredDocuments(candidate).filter(
    (name) => !uploaded.some((doc) => doc.name === name)
  );
}

function isDocumentVerified(candidate, name) {
  const doc = (candidate?.documents || []).find((item) => item.name === name);
  return doc && getDocStatus(doc) === DOC_STATUS.VERIFIED;
}


function formatFieldLabel(key) {
  const labels = {
    id: "ID",
    createdAt: "Created At",
    updatedAt: "Updated At",
    submittedAt: "Submitted At",
    fullName: "Full Name",
    candidateType: "Candidate Type",
    profileStep: "Profile Step",
    appliedRole: "Applied Role",
    employmentStatus: "Employment Status",
    currentlyEmployed: "Currently Employed",
    holdingOfferLetter: "Holding Offer Letter",
    aadhaar: "Aadhaar",
    pan: "PAN",
    uan: "UAN",
    uanNumber: "UAN Number",
    uanVerified: "UAN Verified",
    uanVerifiedBy: "UAN Verified By",
    uanVerifiedAt: "UAN Verified At",
    lastCtc: "Last CTC",
  };

  if (labels[key]) return labels[key];

  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
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

  const missingDocuments = c ? getMissingDocuments(c) : [];
  const criticalDocuments = c?.candidateType === "Experienced"
    ? ["PAN Card", "UAN Proof", "Offer Letter"]
    : ["PAN Card", "Aadhaar Card", "Offer Letter"];
  const unverifiedCriticalDocuments = c
    ? criticalDocuments.filter((name) => !isDocumentVerified(c, name))
    : [];

  useEffect(() => {
    if (!c || missingDocuments.length === 0) return;
    const alertKey = `verifyx-hr-missing-docs-${c.id}-${missingDocuments.join("|")}`;
    if (sessionStorage.getItem(alertKey)) return;
    sessionStorage.setItem(alertKey, "shown");
    alert(
      `Missing Document Alert for HR

The following required documents are missing:

• ${missingDocuments.join("\n• ")}

Ask the candidate to upload them.`
    );
  }, [c?.id, missingDocuments.join("|")]);

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
    if (status === "Approved" && missingDocuments.length > 0) {
      alert(
        `Cannot approve. Required documents are missing:

• ${missingDocuments.join("\n• ")}`
      );
      return;
    }

    if (status === "Approved" && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(c.pan || "").toUpperCase())) {
      alert("Cannot approve. PAN must be in a valid format such as ABCDE1234F.");
      return;
    }

    if (status === "Approved" && c.candidateType === "Experienced" && !/^\d{12}$/.test(String(c.uan || ""))) {
      alert("Cannot approve. UAN must contain exactly 12 digits.");
      return;
    }

    if (status === "Approved" && c.candidateType === "Experienced" && !c.uanVerified) {
      alert("Please verify the candidate UAN number before approving the application.");
      return;
    }

    if (status === "Approved" && unverifiedCriticalDocuments.length > 0) {
      alert(
        `Cannot approve. HR must validate these critical documents:

• ${unverifiedCriticalDocuments.join("\n• ")}`
      );
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
          </div>

          <div className="details">
            {Object.entries(c)
              .filter(([k]) => !["password", "documents", "softSkills", "languages"].includes(k))
              .map(([k, v]) => (
                <p key={k}>
                  <b>{formatFieldLabel(k)}:</b> {Array.isArray(v) ? v.join(", ") : String(v || "-")}
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

        {missingDocuments.length > 0 && (
          <section className="panel missing-document-alert" role="alert">
            <h2>⚠ Missing Document Alert</h2>
            <p>The candidate must upload the following documents:</p>
            <ul>{missingDocuments.map((name) => <li key={name}>{name}</li>)}</ul>
            <button className="btn warn" onClick={() => setStatus("Re-upload Required")}>Alert Candidate / Request Upload</button>
          </section>
        )}

        <section className="panel">
          <h2>Critical Document Validation</h2>
          <p className="muted">HR must validate PAN, UAN proof and Offer Letter before final approval.</p>
          <div className="critical-validation-grid">
            {criticalDocuments.map((name) => {
              const uploaded = (c.documents || []).find((doc) => doc.name === name);
              const verified = isDocumentVerified(c, name);
              return (
                <div className={`critical-validation-card ${verified ? "verified" : "pending"}`} key={name}>
                  <strong>{name}</strong>
                  <span>{!uploaded ? "Missing" : verified ? "Validated by HR" : "Pending HR validation"}</span>
                </div>
              );
            })}
          </div>
        </section>

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
