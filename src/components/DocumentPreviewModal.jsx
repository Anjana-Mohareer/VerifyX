import { useEffect, useMemo, useState } from "react";
import {
  getHrDocumentPreviewUrl,
  verifyCandidateDocument,
  rejectCandidateDocument,
} from "../services/employeeService";

const isImageUrl = (url = "", fileName = "") => {
  const target = `${fileName} ${url}`.toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(target) || target.startsWith("data:image");
};

const isPdfUrl = (url = "", fileName = "") => {
  const target = `${fileName} ${url}`.toLowerCase();
  return /\.pdf(\?|$)/.test(target) || target.startsWith("data:application/pdf");
};

export default function DocumentPreviewModal({ doc, candidate, onClose, onChanged }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const url = await getHrDocumentPreviewUrl(doc);
        if (!active) return;
        if (!url) {
          setError("No preview is available for this document yet.");
        } else {
          objectUrl = url;
          setPreviewUrl(url);
        }
      } catch (err) {
        if (active) setError(err?.message || "Unable to load this document.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      if (objectUrl && objectUrl.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [doc]);

  const kind = useMemo(() => {
    if (isImageUrl(previewUrl, doc?.fileName)) return "image";
    if (isPdfUrl(previewUrl, doc?.fileName)) return "pdf";
    return "other";
  }, [previewUrl, doc]);

  const statusLower = String(doc?.status || "PENDING").toLowerCase();

  const handleVerify = async () => {
    setBusy(true);
    try {
      await verifyCandidateDocument(candidate.id, doc);
      onChanged?.();
      onClose();
    } catch (err) {
      alert(err?.message || "Unable to verify this document.");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!reasonOpen) {
      setReasonOpen(true);
      return;
    }
    if (!reason.trim()) {
      alert("Please add a short rejection reason.");
      return;
    }
    setBusy(true);
    try {
      await rejectCandidateDocument(candidate.id, doc, reason.trim());
      onChanged?.();
      onClose();
    } catch (err) {
      alert(err?.message || "Unable to reject this document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vxm-backdrop" onClick={onClose}>
      <div className="vxm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="vxm-header">
          <div className="vxm-header-text">
            <span className="vxm-eyebrow">Document Preview</span>
            <h3>{doc?.name || doc?.documentType || "Document"}</h3>
            <p className="vxm-sub">
              {candidate?.fullName || "Candidate"}
              {doc?.fileName ? ` · ${doc.fileName}` : ""}
            </p>
          </div>
          <div className="vxm-header-actions">
            <span className={`doc-status-pill ${statusLower}`}>{doc?.status || "Pending Review"}</span>
            <button type="button" className="vxm-close" onClick={onClose} aria-label="Close preview">
              ×
            </button>
          </div>
        </div>

        <div className="vxm-body">
          {loading && <div className="vxm-state">Loading document…</div>}

          {!loading && error && <div className="vxm-state vxm-state-error">{error}</div>}

          {!loading && !error && kind === "image" && (
            <img src={previewUrl} alt={doc?.name || "Document preview"} className="vxm-image" />
          )}

          {!loading && !error && kind === "pdf" && (
            <iframe title={doc?.name || "Document preview"} src={previewUrl} className="vxm-iframe" />
          )}

          {!loading && !error && kind === "other" && (
            <div className="vxm-state">
              <p>A preview isn't available for this file type.</p>
              <a className="btn small primary" href={previewUrl} target="_blank" rel="noopener noreferrer">
                Open in a new tab
              </a>
            </div>
          )}
        </div>

        {reasonOpen && (
          <div className="vxm-reason">
            <label htmlFor="vxm-reason-input">Rejection reason</label>
            <textarea
              id="vxm-reason-input"
              rows={2}
              placeholder="e.g. Document is blurred, please re-upload a clearer copy."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <div className="vxm-footer">
          <div className="vxm-footer-left">
            {previewUrl && !error && (
              <a className="btn small" href={previewUrl} target="_blank" rel="noopener noreferrer">
                Open in new tab
              </a>
            )}
          </div>
          <div className="vxm-footer-right">
            <button type="button" className="btn small" onClick={onClose} disabled={busy}>
              Close
            </button>
            <button type="button" className="btn small danger" onClick={handleReject} disabled={busy}>
              {reasonOpen ? "Confirm reject" : "Reject"}
            </button>
            <button type="button" className="btn small success" onClick={handleVerify} disabled={busy}>
              {busy ? "Working…" : "Verify"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

