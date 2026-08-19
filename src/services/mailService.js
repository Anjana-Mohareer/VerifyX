import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_thf7j6o";
const TEMPLATE_ID = "template_fe9hgqe";
const PUBLIC_KEY = "yOUYYD57OvpnpV5H6";

const send = (params) => emailjs.send(SERVICE_ID, TEMPLATE_ID, { company_name: 'Verify-X', ...params }, PUBLIC_KEY);

const getHrNotificationEmail = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('verifyx_hr_profile') || 'null');
    if (saved?.email) return saved.email;
  } catch { /* use configured fallback */ }
  return import.meta.env.VITE_HR_NOTIFICATION_EMAIL || 'hr@verifyx.com';
};

export async function sendStatusMail(candidate, status, remarks = "") {
  if (!candidate?.email) throw new Error("Candidate email not found");
  return send({
    to_name: candidate.fullName || candidate.name || "Candidate",
    to_email: candidate.email,
    application_status: status,
    remarks: remarks || "No remarks added.",
  });
}

export async function sendWelcomeMail(candidate) {
  if (!candidate?.email) return false;
  return send({
    to_name: candidate.fullName || 'Candidate',
    to_email: candidate.email,
    application_status: 'WELCOME',
    remarks: `Welcome to Verify-X. Your candidate account is registered. Please login and complete your education, employment and required-document profile for ${candidate.appliedRole || 'your applied role'}.`,
  });
}

export async function sendHrCandidateRegisteredMail(candidate) {
  return send({
    to_name: 'HR Team',
    to_email: getHrNotificationEmail(),
    application_status: 'NEW CANDIDATE REGISTERED',
    remarks: `${candidate.fullName || candidate.name || 'A candidate'} (${candidate.email || 'email unavailable'}) registered for ${candidate.appliedRole || 'a role'}. The candidate will appear in the HR dashboard only after completing and submitting the required profile and documents.`,
  });
}

export async function sendProfileCompletionReminder(candidate, force = false) {
  if (!candidate?.email) return false;
  const reminderKey = `verifyx_profile_reminder_mail_${String(candidate.email).trim().toLowerCase()}`;
  const lastSent = Number(localStorage.getItem(reminderKey) || 0);
  if (!force && Date.now() - lastSent < 24 * 60 * 60 * 1000) return false;
  const result = await send({
    to_name: candidate.fullName || candidate.name || 'Candidate',
    to_email: candidate.email,
    application_status: 'PROFILE INCOMPLETE',
    remarks: 'Your Verify-X profile is not complete yet. Please login and complete your education, employment details and all required document uploads, then submit the application for HR review.',
  });
  localStorage.setItem(reminderKey, String(Date.now()));
  return result;
}

export async function sendApplicationSubmittedMail(candidate, application) {
  if (!candidate?.email) return false;
  return send({
    to_name: candidate.fullName || candidate.name || 'Candidate',
    to_email: candidate.email,
    application_status: 'APPLICATION SUBMITTED',
    remarks: `Your Verify-X application ${application?.applicationId || ''} has been submitted successfully and is ready for HR review. You can login anytime to view your application and verification status.`,
  });
}
