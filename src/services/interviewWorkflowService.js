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
  // Backend returns the logged-in candidate's assigned available + selected slots.
  // A saved selection must remain visible after navigation or a page reload.
  const slots = await api.availableInterviewSlots();
  const assigned = Array.isArray(slots) ? slots : [];
  const selected = assigned.find(s => s.status === 'SELECTED');
  const available = assigned.filter(s => s.status === 'AVAILABLE');
  if (!selected && !available.length) return null;
  return {
    interviewStatus: selected ? 'SLOT_SELECTED' : 'AWAITING_CANDIDATE_SLOT',
    interviewSlots: [...(selected ? [selected] : []), ...available]
      .map(s => ({ id: s.id, dateTime: s.slotDateTime })),
    selectedSlot: selected?.slotDateTime || '',
  };
}
export async function selectHrInterviewSlot(_identity, slot) {
  const slotId = typeof slot === 'object' ? slot.id : slot;
  if (!Number.isSafeInteger(Number(slotId)) || Number(slotId) <= 0) {
    throw new Error('Invalid interview slot. Refresh the page and try again.');
  }
  await api.selectInterviewSlot(slotId);
  // The POST writes to the server; GET must confirm that the persisted selection is visible.
  const workflow = await getCandidateInterviewWorkflow();
  if (!workflow?.selectedSlot) {
    throw new Error('Booking was submitted, but the server did not return the saved slot. Refresh to check the booking before trying again.');
  }
  signal();
  return workflow;
}
export async function confirmHrInterview(candidate) { await api.confirmInterview(candidate.candidateId); signal(); return { ...candidate, interviewStatus: 'INTERVIEW_CONFIRMED', interviewConfirmedAt: new Date().toISOString() }; }
export async function decideHrInterview(candidate, decision, reason = '') { await api.decideInterview(candidate.candidateId, decision, reason); signal(); return { ...candidate, finalDecision: decision, interviewStatus: `INTERVIEW_${decision}` }; }
export function markOfferReleased(candidate) { signal(); return { ...candidate, offerStatus: 'RELEASED' }; }
export function removeInterviewWorkflow() { signal(); return true; }
export function formatInterviewSlot(value) { const slot = typeof value === 'object' ? value.dateTime : value; if (!slot) return 'Not Selected'; const d = new Date(slot); return Number.isNaN(d.getTime()) ? String(slot) : d.toLocaleString([], {dateStyle:'medium', timeStyle:'short'}); }
