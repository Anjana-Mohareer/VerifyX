// Identity information can be supplied by the HR summary, candidate detail,
// candidate identity, profile, or employment payload, depending on backend version.
const firstFilled = (...values) => values.find((value) => value !== null && value !== undefined && String(value).trim() !== '') ?? '';

export function readCandidateIdentity(record = {}) {
  const identity = record.identityDetails || record.identityInformation || record.candidateIdentity || record.identityNumbers || record.identity || {};
  const profile = record.profile || record.candidateProfile || {};
  const review = record.review || {};
  const employment = record.employment || record.employmentDetails || record.currentEmployment || {};
  return {
    pan: firstFilled(record.pan, record.panNumber, identity.pan, identity.panNumber, profile.pan, profile.panNumber, review.pan, review.panNumber),
    aadhaar: firstFilled(record.aadhaar, record.aadhaarNumber, record.aadharNumber, identity.aadhaar, identity.aadhaarNumber, identity.aadharNumber, profile.aadhaar, profile.aadhaarNumber, profile.aadharNumber, review.aadhaar, review.aadhaarNumber),
    uan: firstFilled(record.uan, record.uanNumber, identity.uan, identity.uanNumber, employment.uan, employment.uanNumber, profile.uan, profile.uanNumber, review.uan, review.uanNumber),
  };
}

export function mergeCandidateIdentity(summary = {}, detail = {}, review = {}) {
  const fromSummary = readCandidateIdentity(summary);
  const fromDetail = readCandidateIdentity(detail);
  const fromReview = readCandidateIdentity({ review });
  return {
    pan: firstFilled(fromSummary.pan, fromDetail.pan, fromReview.pan),
    aadhaar: firstFilled(fromSummary.aadhaar, fromDetail.aadhaar, fromReview.aadhaar),
    uan: firstFilled(fromSummary.uan, fromDetail.uan, fromReview.uan),
  };
}
