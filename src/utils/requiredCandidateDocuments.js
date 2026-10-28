// Keep HR's checklist aligned with the candidate portal and the backend's
// EmploymentStatus / DocumentType enums.
export const FRESHER_REQUIRED_DOCUMENTS = ['Resume', 'Aadhaar Card', 'PAN Card'];
export const WORKING_REQUIRED_DOCUMENTS = [
  'Resume', 'Aadhaar Card', 'PAN Card', 'Latest Salary Slip', 'UAN Proof',
];
export const NOT_WORKING_REQUIRED_DOCUMENTS = [
  'Resume', 'Aadhaar Card', 'PAN Card', 'Experience Letter',
  'Relieving Letter', 'Last Salary Slip', 'UAN Proof',
];

export function canonicalDocumentName(name = '') {
  const value = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (value.includes('salaryslip')) return 'salaryslip';
  if (value.includes('offer') && (value.includes('letter') || value.includes('appointment'))) return 'offerletter';
  if (value.includes('experienceletter')) return 'experienceletter';
  if (value.includes('relievingletter')) return 'relievingletter';
  if (value.includes('aadhaar')) return 'aadhaarcard';
  if (value.includes('pan')) return 'pancard';
  if (value.includes('uan')) return 'uanproof';
  return value;
}

export function isCurrentlyWorking(candidate = {}) {
  const status = String(candidate.employmentStatus || candidate.employment?.employmentStatus || '').toUpperCase();
  // NOT_CURRENTLY_EMPLOYED must never match CURRENTLY_EMPLOYED.
  if (['CURRENTLY_WORKING', 'CURRENTLY_EMPLOYED'].includes(status)) return true;
  if (['NOT_WORKING', 'NOT_CURRENTLY_EMPLOYED'].includes(status)) return false;
  return String(candidate.currentlyEmployed || '').toUpperCase() === 'YES';
}

export function requiredCandidateDocuments(candidate = {}) {
  if (!String(candidate.candidateType || '').toUpperCase().includes('EXPER')) {
    return FRESHER_REQUIRED_DOCUMENTS;
  }
  const status = String(candidate.employmentStatus || candidate.employment?.employmentStatus || '').toUpperCase();
  if (status || candidate.currentlyEmployed) {
    return isCurrentlyWorking(candidate) ? WORKING_REQUIRED_DOCUMENTS : NOT_WORKING_REQUIRED_DOCUMENTS;
  }
  // Some older backend responses omit employment status. Use the candidate's
  // persisted required-document choices in that case, excluding optional uploads.
  const saved = candidate.requiredDocumentNames;
  if (Array.isArray(saved) && saved.length) {
    return [...new Map(saved.filter((name) => canonicalDocumentName(name) !== 'offerletter')
      .map((name) => [canonicalDocumentName(name), name])).values()];
  }
  return NOT_WORKING_REQUIRED_DOCUMENTS;
}

export function findRequiredDocument(documents = [], requiredName = '') {
  const wanted = canonicalDocumentName(requiredName);
  return documents.find((doc) =>
    canonicalDocumentName(doc?.name || doc?.documentType) === wanted &&
    (doc?.id || doc?.fileName || doc?.data || doc?.fileUrl || doc?.url));
}
