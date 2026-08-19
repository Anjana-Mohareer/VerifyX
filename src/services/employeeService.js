import { api } from './apiService';
import { getLocalCandidates, removeLocalCandidate, fileToDataUrl, saveLocalCandidate } from './storage';
import {
  getSubmittedApplications,
  getApplication,
  updateSubmittedApplication,
  removeSubmittedApplication,
} from './candidateApplicationService';


const SKILL_TO_ENUM = {
  'C++': 'CPP',
  'C#': 'CSHARP',
  '.NET': 'DOT_NET',
  'ASP.NET MVC': 'ASP_NET_MVC',
  'Spring Boot': 'SPRING_BOOT',
  'React.js': 'REACT_JS',
  'Node.js': 'NODE_JS',
  'JavaScript': 'JAVASCRIPT',
  'TypeScript': 'TYPESCRIPT',
  'MySQL': 'MYSQL',
  'SQL Server': 'SQL_SERVER',
  'MongoDB': 'MONGODB',
  'GitHub': 'GITHUB',
  'Manual Testing': 'MANUAL_TESTING',
  'Power BI': 'POWER_BI',
};

const ENUM_TO_SKILL = Object.fromEntries(
  Object.entries(SKILL_TO_ENUM).map(([label, value]) => [value, label])
);

const normalizeSkills = (candidate = {}) => {
  const source = candidate.skills ?? candidate.technicalSkills ?? candidate.profile?.technicalSkills ?? [];
  const values = Array.isArray(source)
    ? source
    : typeof source === 'string'
      ? source.split(',')
      : [];

  return values
    .map((skill) => {
      if (typeof skill === 'string') {
        const value = skill.trim();
        return ENUM_TO_SKILL[value] || value;
      }
      const value = skill?.name ?? skill?.value ?? skill?.skill ?? '';
      return ENUM_TO_SKILL[value] || value;
    })
    .filter(Boolean);
};

const toTechnicalSkillEnums = (skills = []) =>
  (Array.isArray(skills) ? skills : [])
    .map((skill) => SKILL_TO_ENUM[skill] || String(skill).trim().toUpperCase().replaceAll('.', '').replaceAll(' ', '_'))
    .filter(Boolean);

export const DOC_STATUS = { PENDING: 'PENDING', VERIFIED: 'VERIFIED', REJECTED: 'REJECTED' };

export function isSubmittedCandidate(candidate = {}) {
  const status = String(candidate.status || candidate.verificationStatus || '').toUpperCase();
  const submittedStatus = [
    'SUBMITTED', 'PENDING_VERIFICATION', 'DOCUMENTS_VERIFIED',
    'APPROVED', 'REJECTED', 'RE_UPLOAD_REQUIRED', 'REUPLOAD_REQUIRED',
  ].some((value) => status.includes(value));
  if (!submittedStatus) return false;

  const required = Array.isArray(candidate.requiredDocumentNames) ? candidate.requiredDocumentNames : [];
  const documents = Array.isArray(candidate.documents) ? candidate.documents : [];
  const uploadedNames = new Set(documents.filter((doc) => doc?.fileName || doc?.data || doc?.id).map((doc) => doc.name));
  const documentsComplete = Number(candidate.documentCompletion) >= 100 || Number(candidate.overallCompletion) >= 100 ||
    (required.length > 0 && required.every((name) => uploadedNames.has(name)));

  return documentsComplete || Boolean(candidate.submittedAt) || status.includes('APPROVED') || status.includes('REJECTED') || status.includes('VERIFIED') || status.includes('RE_UPLOAD');
}

/* ------------------------------------------------------------------ */
/* localStorage-backed candidate source (used whenever the backend    */
/* API is unreachable, e.g. no server running).                       */
/* ------------------------------------------------------------------ */

function localDocsFromApplication(app = {}) {
  return Object.entries(app.requiredDocuments || {}).map(([name, info]) => ({
    id: `${app.identity}::${name}`,
    name,
    documentType: name,
    fileName: info?.fileName || '',
    status: info?.hrStatus || (info?.verificationStatus === 'VERIFIED' ? DOC_STATUS.VERIFIED : DOC_STATUS.PENDING),
    rejectionReason: info?.hrRejectionReason || '',
    verifiedAt: info?.hrVerifiedAt || '',
    verifiedBy: info?.hrVerifiedBy || '',
    data: info?.data || '',
    localOnly: true,
  }));
}

function mergeLocalCandidate(local = {}, application = {}) {
  const identity = application.identity || local.email;
  const requiredDocumentNames = Array.isArray(application.requiredDocumentNames) && application.requiredDocumentNames.length
    ? application.requiredDocumentNames
    : Object.keys(application.requiredDocuments || {});
  return {
    id: identity,
    identity,
    fullName: application.fullName || local.fullName || '',
    email: application.email || local.email || '',
    phone: local.phone || '',
    photo: application.photo || application.photoUrl || local.photo || local.photoUrl || '',
    appliedRole: application.appliedRole || local.appliedRole || '',
    candidateType: String(application.candidateType || local.candidateType || 'FRESHER').toUpperCase(),
    skills: application.skills || local.skills || [],
    status: application.status || 'DRAFT',
    pan: application.panNumber || '',
    aadhaar: application.aadhaarNumber || '',
    uan: application.uanNumber || '',
    uanVerified: Boolean(application.uanVerified),
    uanVerifiedAt: application.uanVerifiedAt || '',
    uanVerifiedBy: application.uanVerifiedBy || '',
    employmentStatus: application.employmentStatus || '',
    currentlyEmployed: String(application.employmentStatus || '').toUpperCase().includes('CURRENT') ? 'YES' : '',
    submittedAt: application.submittedAt || '',
    updatedAt: application.updatedAt || '',
    createdAt: local.createdAt || application.submittedAt || '',
    tenth: application.tenth,
    twelfth: application.twelfth,
    degree: application.degree,
    master: application.master,
    currentEmployer: application.currentEmployer,
    previousEmployer: application.previousEmployer,
    // Exact list of documents this candidate was actually asked for on the
    // Candidate Portal (varies: 3 for Fresher, 6 for currently-working
    // Experienced, 7 for not-working Experienced). HR screens must use this
    // instead of a hardcoded list so the count always matches what the
    // candidate saw and uploaded.
    requiredDocumentNames,
    documents: localDocsFromApplication(application),
    localOnly: true,
  };
}

export function getLocalCandidateList() {
  const byIdentity = new Map();

  getLocalCandidates().forEach((local) => {
    const key = String(local.email || '').toLowerCase();
    if (key) byIdentity.set(key, { local });
  });

  getSubmittedApplications().forEach((application) => {
    const key = String(application.email || application.identity || '').toLowerCase();
    const existing = byIdentity.get(key) || {};
    byIdentity.set(key, { ...existing, application });
  });

  return Array.from(byIdentity.values()).map(({ local, application }) =>
    mergeLocalCandidate(local || {}, application || {})
  );
}

function findLocalCandidateById(id) {
  return getLocalCandidateList().find((candidate) => String(candidate.id) === String(id)) || null;
}

function setLocalDocumentStatus(identity, docName, patch) {
  const app = getApplication(identity) || getSubmittedApplications().find((item) => item.identity === identity);
  if (!app) throw new Error('This application was not found in local storage.');
  const nextDocs = {
    ...(app.requiredDocuments || {}),
    [docName]: { ...(app.requiredDocuments?.[docName] || {}), ...patch },
  };
  updateSubmittedApplication(identity, { requiredDocuments: nextDocs });
}

const normalizeDocument = (d = {}) => ({
  ...d,
  id: d.id ?? d.documentId,
  name: d.name ?? String(d.documentType || '').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
  documentType: d.documentType,
  fileName: d.fileName || '',
  status: d.status || DOC_STATUS.PENDING,
  data: d.data || (d.id ? `http://localhost:8080/upload/view/${d.id}` : ''),
});

const normalize = (c = {}) => {
  const profile = c.profile || {};
  const employment = c.employment || {};
  const review = c.review || {};
  const documentsSource = Array.isArray(c.documents)
    ? c.documents
    : Array.isArray(review.documents)
      ? review.documents
      : [];

  return {
    ...profile,
    ...employment,
    ...c,
    id: c.id ?? c.candidateId ?? profile.id ?? profile.candidateId,
    fullName: c.fullName ?? c.username ?? c.candidateName ?? review.candidateName ?? profile.username ?? profile.fullName,
    email: c.email ?? review.email ?? profile.email,
    phone: c.phone ?? c.phoneNumber ?? profile.phoneNumber ?? profile.phone,
    photo: c.photo ?? c.photoUrl ?? c.profilePhoto ?? c.profilePhotoUrl ?? profile.photo ?? profile.photoUrl,
    candidateType: String(c.candidateType ?? profile.candidateType ?? 'FRESHER').toUpperCase(),
    appliedRole: c.appliedRole ?? profile.appliedRole,
    skills: normalizeSkills(c),
    status: c.status ?? c.workflowStatus ?? profile.workflowStatus ?? c.applicationStatus ?? review.applicationStatus ?? 'DRAFT',
    profileStep: c.profileStep ?? profile.profileStep ?? 1,
    remarks: c.remarks ?? '',
    pan: c.pan ?? c.panNumber ?? review.panNumber ?? profile.panNumber,
    aadhaar: c.aadhaar ?? c.aadhaarNumber ?? profile.aadhaarNumber,
    uan: c.uan ?? c.uanNumber ?? review.uanNumber ?? employment.uanNumber,
    uanVerified: c.uanVerified ?? review.uanVerified ?? employment.uanVerified ?? false,
    documents: documentsSource.map(normalizeDocument),
    review,
  };
};

export const allCandidates = async () => {
  // Always read whatever has been submitted from the Candidate Portal and
  // saved to this browser's localStorage. This is merged in below no matter
  // what happens with the backend call, so a candidate's data is never
  // missing from the HR portal just because the backend responded (even
  // with an empty/partial list) instead of throwing an error.
  const localList = getLocalCandidateList();

  let backendList = [];
  try {
    const result = await api.candidates();
    const list = Array.isArray(result)
      ? result
      : Array.isArray(result?.content)
        ? result.content
        : Array.isArray(result?.candidates)
          ? result.candidates
          : Array.isArray(result?.items)
            ? result.items
            : [];

    // The HR candidates list endpoint does not embed uploaded documents.
    // Fetch each candidate's document-review record in parallel so that
    // anything a candidate has uploaded shows up immediately on the HR
    // "Uploaded Candidate Documents" screen instead of appearing empty.
    const withDocuments = await Promise.all(
      list.map(async (candidate) => {
        const id = candidate.id ?? candidate.candidateId;
        if (!id) return candidate;
        try {
          const review = await api.reviewDocuments(id);
          return { ...candidate, review, documents: review?.documents || candidate.documents || [] };
        } catch {
          return candidate;
        }
      })
    );

    backendList = withDocuments.map(normalize);
  } catch {
    backendList = [];
  }

  if (!backendList.length) return localList;

  // Merge: a candidate already returned by the backend wins for its core
  // profile fields (it's the source of truth once a real server is
  // connected). BUT documents that were uploaded through the local
  // fallback (because the upload/document endpoints weren't reachable,
  // even though the candidate list endpoint was) must not be silently
  // dropped just because the candidate also exists on the backend. So we
  // enrich each backend candidate with its matching local record's
  // documents / requiredDocumentNames whenever the backend didn't return
  // any of its own for that candidate.
  const localByEmail = new Map(
    localList.map((c) => [String(c.email || '').toLowerCase(), c])
  );

  const mergedBackend = backendList.map((candidate) => {
    const local = localByEmail.get(String(candidate.email || '').toLowerCase());
    if (!local) return candidate;

    const hasBackendDocs = Array.isArray(candidate.documents) && candidate.documents.length > 0;
    const hasBackendRequiredNames = Array.isArray(candidate.requiredDocumentNames) && candidate.requiredDocumentNames.length > 0;

    return {
      ...candidate,
      documents: hasBackendDocs ? candidate.documents : (local.documents || []),
      requiredDocumentNames: hasBackendRequiredNames ? candidate.requiredDocumentNames : (local.requiredDocumentNames || []),
      // Candidate type / employment status drive which documents are
      // required — prefer whatever the candidate actually selected on the
      // Portal (local) if the backend didn't send it.
      candidateType: candidate.candidateType || local.candidateType,
      employmentStatus: candidate.employmentStatus || local.employmentStatus,
      currentlyEmployed: candidate.currentlyEmployed || local.currentlyEmployed,
    };
  });

  const backendEmails = new Set(
    backendList.map((c) => String(c.email || '').toLowerCase()).filter(Boolean)
  );
  const onlyLocal = localList.filter(
    (c) => !backendEmails.has(String(c.email || '').toLowerCase())
  );

  return [...mergedBackend, ...onlyLocal];
};

export const findCandidate = async (id) => {
  if (!id) throw new Error('Candidate ID is missing.');
  const local = findLocalCandidateById(id);
  try {
    const [details, review] = await Promise.all([
      api.candidate(id),
      api.reviewDocuments(id).catch(() => null),
    ]);
    if (!details) throw new Error('Candidate not found on backend.');
    return normalize({ ...details, candidateId: Number(id), review, documents: review?.documents || details?.documents || [] });
  } catch {
    if (!local) throw new Error('Candidate not found.');
    return local;
  }
};

const makeLocalId = () =>
  `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function addCandidate(candidate) {
  const normalized = {
    ...candidate,
    fullName: candidate.fullName || candidate.name,
    appliedRole: candidate.appliedRole || candidate.role || 'Candidate',
    candidateType: String(candidate.candidateType || candidate.experience || 'FRESHER').toUpperCase().includes('EXPER') ? 'EXPERIENCED' : 'FRESHER',
  };

  try {
    await api.candidateRegister({
      username: normalized.fullName,
      email: normalized.email,
      phoneNumber: normalized.phone,
      password: candidate.password || 'Verify@123',
      appliedRole: normalized.appliedRole,
      candidateType: normalized.candidateType,
    });
    // Backend accepted it, but the HR "candidates" list only reflects the
    // backend after a real page reload/fetch. Also mirror it into
    // localStorage right away so it shows up immediately and repeated adds
    // never silently disappear if the backend list endpoint lags behind.
    try {
      await saveLocalCandidate({ ...normalized, id: normalized.id || makeLocalId(), emailVerified: true }, candidate.password || 'Verify@123');
    } catch {
      // Non-fatal: backend save already succeeded.
    }
    return normalized;
  } catch {
    // No backend reachable (or it rejected the request) — always fall back
    // to localStorage so the candidate is still saved and visible, and so
    // this works the same way every time, no matter how many candidates
    // are added.
    return saveLocalCandidate({ ...normalized, id: makeLocalId(), emailVerified: true }, candidate.password || 'Verify@123');
  }
}

export const deleteCandidate = async (id) => {
  try {
    return await api.deleteCandidate(id);
  } catch {
    const local = findLocalCandidateById(id);
    if (local?.email) removeLocalCandidate(local.email);
    removeSubmittedApplication(id);
    return true;
  }
};

export async function updateCandidate(id, patch) {
  const body = {
    username: patch.fullName || patch.username || '',
    email: patch.email || '',
    phoneNumber: patch.phone || patch.phoneNumber || '',
    address: patch.address || '',
    panNumber: String(patch.pan || patch.panNumber || '').toUpperCase(),
    aadhaarNumber: patch.aadhaar || patch.aadhaarNumber || '',
    appliedRole: patch.appliedRole || '',
    candidateType: String(patch.candidateType || 'FRESHER').toUpperCase().includes('EXPER') ? 'EXPERIENCED' : 'FRESHER',
    technicalSkills: toTechnicalSkillEnums(patch.skills),
    profileStep: patch.profileStep || 1,
    workflowStatus: patch.status || patch.workflowStatus || 'Draft',
  };
  try {
    const saved = await api.updateCandidateProfile(body);
    return normalize({ ...patch, ...saved, id });
  } catch {
    const saved = updateSubmittedApplication(id, {
      ...patch,
      fullName: patch.fullName || patch.username || '',
      phone: patch.phone || patch.phoneNumber || '',
      panNumber: String(patch.pan || patch.panNumber || '').toUpperCase(),
      aadhaarNumber: patch.aadhaar || patch.aadhaarNumber || '',
      skills: Array.isArray(patch.skills) ? patch.skills : [],
    });
    if (!saved) throw new Error('Candidate could not be updated.');
    return normalize({ ...saved, id });
  }
}

export const verifyCandidateUan = async (id) => {
  try {
    return await api.verifyUan(id);
  } catch {
    updateSubmittedApplication(id, {
      uanVerified: true,
      uanVerifiedBy: 'HR',
      uanVerifiedAt: new Date().toISOString(),
    });
    return true;
  }
};

export const verifyCandidateDocument = async (candidateId, doc) => {
  try {
    return await api.verifyDocument(doc.id || doc.documentId);
  } catch {
    setLocalDocumentStatus(candidateId, doc.name, {
      hrStatus: DOC_STATUS.VERIFIED,
      hrVerifiedBy: 'HR',
      hrVerifiedAt: new Date().toISOString(),
      hrRejectionReason: '',
    });
    return true;
  }
};

export const rejectCandidateDocument = async (candidateId, doc, reason) => {
  try {
    return await api.rejectDocument(doc.id || doc.documentId, reason);
  } catch {
    setLocalDocumentStatus(candidateId, doc.name, {
      hrStatus: DOC_STATUS.REJECTED,
      hrRejectionReason: reason,
      hrVerifiedBy: '',
      hrVerifiedAt: '',
    });
    return true;
  }
};

const FIELD_NAMES = {
  'Resume': 'resume',
  'Offer Letter': 'offerLetter',
  'Last Month Salary Slip': 'salarySlip',
  'Relieving Letter': 'relievingLetter',
  'Experience Letter': 'experienceLetter',
  'PAN Card': 'panCard',
  'Aadhaar Card': 'aadhaarCard',
  'UAN Proof': 'uanProof',
};

export async function uploadCandidateDocument(candidateId, document) {
  const fieldName = document.fieldName || FIELD_NAMES[document.name];
  if (!fieldName) throw new Error(`${document.name} upload is not supported by the backend yet.`);

  try {
    const form = new FormData();
    form.append(fieldName, document.file);
    if (document.reUpload) await api.updateDocuments(form);
    else await api.uploadDocuments(form);
    const documents = await api.myDocuments();
    return (Array.isArray(documents) ? documents : []).map(normalizeDocument);
  } catch (err) {
    // No backend reachable — fall back to local storage so the upload is
    // still saved and immediately visible on the HR document review screen
    // (same browser/session), instead of silently failing.
    const app = getApplication(candidateId) || getSubmittedApplications().find((item) => item.identity === candidateId);
    if (!app) throw err;

    const dataUrl = await fileToDataUrl(document.file);
    const nextDocs = {
      ...(app.requiredDocuments || {}),
      [document.name]: {
        fileName: document.file.name,
        data: dataUrl,
        hrStatus: DOC_STATUS.PENDING,
        hrRejectionReason: '',
        hrVerifiedAt: '',
        hrVerifiedBy: '',
        uploadedAt: new Date().toISOString(),
      },
    };
    updateSubmittedApplication(candidateId, { requiredDocuments: nextDocs });
    return localDocsFromApplication({ ...app, requiredDocuments: nextDocs, identity: candidateId });
  }
}

export const getDocumentReviewSummary = (documents = []) => ({
  total: documents.length,
  verified: documents.filter((d) => d.status === 'VERIFIED').length,
  rejected: documents.filter((d) => d.status === 'REJECTED').length,
  pending: documents.filter((d) => !d.status || d.status === 'PENDING').length,
});

export async function openCandidateDocument(doc) {
  if (doc?.localOnly) {
    if (doc.data) {
      window.open(doc.data, "_blank", "noopener,noreferrer");
      return;
    }
    alert(
      `${doc.fileName || doc.name} was uploaded from the Candidate Portal, but no preview is ` +
      `available for it yet (no backend server is running to store the actual file).`
    );
    return;
  }
  if (!doc?.id) throw new Error("Document ID is missing.");
  const blob = await api.documentBlob(doc.id);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Resolves an in-browser previewable URL (blob: or data:) for a document,
// without opening a new tab, so it can be embedded in an on-page viewer.
export async function getHrDocumentPreviewUrl(doc) {
  if (doc?.localOnly) return doc.data || '';
  const id = doc?.id || doc?.documentId;
  if (!id) return '';
  const blob = await api.reviewDocumentBlob(id);
  return URL.createObjectURL(blob);
}

export async function openHrCandidateDocument(doc) {
  if (doc?.localOnly) {
    return openCandidateDocument(doc);
  }
  const id = doc?.id || doc?.documentId;
  if (!id) throw new Error('Document ID is missing.');
  const blob = await api.reviewDocumentBlob(id);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
