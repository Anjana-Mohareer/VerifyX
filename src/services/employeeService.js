import { getCandidates, saveCandidates } from "./storage";

export const DOC_STATUS = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

export const allCandidates = () => getCandidates();

export const findCandidate = (id) =>
  getCandidates().find((c) => c.id === id);

export function addCandidate(candidate) {
  const list = getCandidates();

  const exists = list.some(
    (c) => c.email?.toLowerCase() === candidate.email?.toLowerCase()
  );

  if (exists) {
    throw new Error("Candidate with this email already exists.");
  }

  const newCandidate = {
    ...candidate,
    id: `VX-${Date.now().toString().slice(-6)}-${Math.floor(
      Math.random() * 1000
    )}`,
    documents: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveCandidates([newCandidate, ...list]);
  return newCandidate;
}

export function updateCandidate(id, patch) {
  const list = getCandidates().map((c) =>
    c.id === id
      ? { ...c, ...patch, updatedAt: new Date().toISOString() }
      : c
  );

  saveCandidates(list);
  return list.find((c) => c.id === id);
}

export function deleteCandidate(id) {
  saveCandidates(getCandidates().filter((c) => c.id !== id));
}

function getDocumentCounts(documents = []) {
  const total = documents.length;
  const verified = documents.filter((d) => d.status === DOC_STATUS.VERIFIED).length;
  const rejected = documents.filter((d) => d.status === DOC_STATUS.REJECTED).length;
  const pending = documents.filter(
    (d) => !d.status || d.status === DOC_STATUS.PENDING
  ).length;

  return { total, verified, rejected, pending };
}

function getCandidateStatusFromDocuments(documents = [], fallbackStatus = "Pending Verification") {
  const counts = getDocumentCounts(documents);

  if (counts.rejected > 0) return "Re-upload Required";
  if (counts.total > 0 && counts.verified === counts.total) return "Documents Verified";
  if (counts.pending > 0) return "Pending Verification";

  return fallbackStatus;
}

export function verifyCandidateDocument(candidateId, docName, verifiedBy = "HR") {
  const candidate = findCandidate(candidateId);
  if (!candidate) return null;

  const documents = (candidate.documents || []).map((doc) =>
    doc.name === docName
      ? {
          ...doc,
          status: DOC_STATUS.VERIFIED,
          verified: true,
          verifiedBy,
          verifiedAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
          rejectionReason: "",
        }
      : doc
  );

  return updateCandidate(candidateId, {
    documents,
    status: getCandidateStatusFromDocuments(documents, candidate.status),
  });
}

export function rejectCandidateDocument(
  candidateId,
  docName,
  rejectionReason,
  reviewedBy = "HR"
) {
  const candidate = findCandidate(candidateId);
  if (!candidate) return null;

  const documents = (candidate.documents || []).map((doc) =>
    doc.name === docName
      ? {
          ...doc,
          status: DOC_STATUS.REJECTED,
          verified: false,
          reviewedBy,
          reviewedAt: new Date().toISOString(),
          rejectedAt: new Date().toISOString(),
          rejectionReason:
            rejectionReason || "Document is not correct. Please re-upload.",
        }
      : doc
  );

  return updateCandidate(candidateId, {
    documents,
    status: "Re-upload Required",
  });
}

export function uploadCandidateDocument(candidateId, newDocument) {
  const candidate = findCandidate(candidateId);
  if (!candidate) return null;

  const documents = [
    ...(candidate.documents || []).filter((doc) => doc.name !== newDocument.name),
    {
      ...newDocument,
      status: DOC_STATUS.PENDING,
      verified: false,
      verifiedBy: "",
      verifiedAt: "",
      reviewedBy: "",
      reviewedAt: "",
      rejectedAt: "",
      rejectionReason: "",
      reuploadedAt: new Date().toISOString(),
    },
  ];

  return updateCandidate(candidateId, {
    documents,
    status: "Pending Verification",
  });
}

export function getDocumentReviewSummary(documents = []) {
  const counts = getDocumentCounts(documents);
  return counts;
}

export function verifyCandidateUan(candidateId, verifiedBy = "HR") {
  const candidate = findCandidate(candidateId);
  if (!candidate) return null;

  return updateCandidate(candidateId, {
    uanVerified: true,
    uanVerifiedBy: verifiedBy,
    uanVerifiedAt: new Date().toISOString(),
  });
}
