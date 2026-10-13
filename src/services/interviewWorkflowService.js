import { api } from './apiService';
const signal = () => window.dispatchEvent(new Event('verifyx-interview-workflow-updated'));
export const normalizeInterview = (row = {}) => ({
  ...row, workflowId: String(row.candidateId), fullName: row.candidateName || row.fullName || 'Candidate',
  selectedSlot: row.selectedInterviewSlot || '', interviewInvitedAt: row.bgvStatus === 'APPROVED' ? 'sent' : '',
  interviewStatus: ({ CONFIRMED: 'INTERVIEW_CONFIRMED', APPROVED: 'INTERVIEW_APPROVED', REJECTED: 'INTERVIEW_REJECTED' })[row.interviewStatus] || row.interviewStatus,
  interviewConfirmedAt: ['CONFIRMED', 'APPROVED', 'REJECTED'].includes(row.interviewStatus) ? row.selectedInterviewSlot : '',
  finalDecision: ['APPROVED', 'REJECTED'].includes(row.interviewStatus) ? row.interviewStatus : '',
  offerStatus: row.offerStatus || 'NOT_RELEASED',
});
export async function getInterviewWorkflows() {
  const rows = await api.hrInterviewCandidates();
  return Promise.all((Array.isArray(rows) ? rows : []).map(async row => {
    const result = normalizeInterview(row);
    if (result.finalDecision === 'APPROVED') {
      const history = await api.hrOfferLetters(row.candidateId).catch(() => []);
      if (Array.isArray(history) && history.length) result.offerStatus = 'RELEASED';
    }
    return result;
  }));
}
export async function getCandidateInterviewWorkflow() {
  const slots = await api.availableInterviewSlots();
  const available = (Array.isArray(slots) ? slots : []).filter(s => s.status === 'AVAILABLE');
  return available.length ? { interviewStatus: 'AWAITING_CANDIDATE_SLOT', interviewSlots: available.map(s => ({ id: s.id, dateTime: s.slotDateTime })), selectedSlot: '' } : null;
}
export async function selectHrInterviewSlot(_identity, slot) {
  const slotId = typeof slot === 'object' ? slot.id : slot;
  await api.selectInterviewSlot(slotId);
  return { selectedSlot: typeof slot === 'object' ? slot.dateTime : String(slot), interviewStatus: 'SLOT_SELECTED', interviewSlots: [] };
}
export async function confirmHrInterview(candidate) { await api.confirmInterview(candidate.candidateId); signal(); return { ...candidate, interviewStatus: 'INTERVIEW_CONFIRMED', interviewConfirmedAt: new Date().toISOString() }; }
export async function decideHrInterview(candidate, decision, reason = '') { await api.decideInterview(candidate.candidateId, decision, reason); signal(); return { ...candidate, finalDecision: decision, interviewStatus: `INTERVIEW_${decision}` }; }
export function markOfferReleased(candidate) { signal(); return { ...candidate, offerStatus: 'RELEASED' }; }
export function removeInterviewWorkflow() { signal(); return true; }
export function formatInterviewSlot(value) { const slot = typeof value === 'object' ? value.dateTime : value; if (!slot) return 'Not Selected'; const d = new Date(slot); return Number.isNaN(d.getTime()) ? String(slot) : d.toLocaleString([], {dateStyle:'medium', timeStyle:'short'}); }
