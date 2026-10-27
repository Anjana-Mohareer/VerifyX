import { api } from './apiService';
import { setSession, clearSession, getSession, setToken, setRememberLogin } from './storage';

export async function registerCandidate(data) {
  const payload = {
    username: data.fullName,
    email: data.email,
    phoneNumber: data.phone,
    password: data.password,
    appliedRole: data.appliedRole,
    candidateType: data.candidateType,
  };

  return api.candidateRegister(payload);
}

export async function loginCandidate(email, password, rememberMe = false) {
  const data = await api.candidateLogin({ email: String(email).trim().toLowerCase(), password });
  if (!data?.accessToken) throw new Error('Invalid email address or password. Please try again.');
  setRememberLogin(rememberMe);
  setToken(data.accessToken);
  const session = {
    type: 'CANDIDATE', id: data.userId, name: data.username,
    email: data.email || String(email).trim().toLowerCase(),
    role: data.role, candidateType: data.candidateType,
    phone: data.phoneNumber || data.phone || '',
    appliedRole: data.appliedRole || data.profile?.appliedRole || '',
  };
  // Login responses do not always contain role/contact information. Resolve
  // it from the authenticated profile when available, without blocking login.
  try {
    const profile = await api.candidateProfile();
    if (profile && typeof profile === 'object') {
      session.phone = profile.phoneNumber || profile.phone || session.phone;
      session.appliedRole = profile.appliedRole || session.appliedRole;
      session.candidateType = profile.candidateType || session.candidateType;
    }
  } catch { /* A profile may not exist until onboarding is completed. */ }
  setSession(session);
  return session;
}

export async function loginAdmin(email, password, rememberMe = false) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const data = await api.hrLogin({ email: normalizedEmail, password });
  if (!data?.accessToken) throw new Error('Invalid email address or password. Please try again.');
  setRememberLogin(rememberMe);
  setToken(data.accessToken);
  const session = {
    type: 'HR', name: data.username || data.name || 'HR Admin',
    email: data.email || normalizedEmail, role: data.role || 'HR Admin',
    designation: data.designation || 'HR Professional', company: data.company || '',
    employeeId: data.employeeId || '', department: data.department || 'Human Resources',
    location: data.location || '', joiningDate: data.joiningDate || '',
    status: 'Active', lastLoginAt: new Date().toISOString()
  };
  setSession(session);
  return session;
}

export async function logout() {
  const session = getSession();
  try {
    if (session?.type === 'CANDIDATE') await api.candidateLogout();
    else if (session) await api.hrLogout();
  } finally {
    clearSession();
  }
}

export const verifyCandidateEmail = (email, otp) => api.verifyCandidateEmail({ email, otp });
export const resendCandidateVerification = (email) => api.resendCandidateVerification(email);
export const requestHrPasswordReset = (email) => api.requestHrPasswordReset(email);
export const resetHrPassword = (email, otp, newPassword) => api.resetHrPassword({ email, emailOtp: otp, newPassword });

export const requestCandidatePasswordReset = (identifier) => api.requestCandidatePasswordReset(identifier);
export const resetCandidatePassword = (identifier, otp, newPassword) =>
  api.resetCandidatePassword({ email: identifier, emailOtp: otp, newPassword });

export async function requestHrPasswordResetByIdentifier(identifier, method = 'email') {
  if (method === 'email') return requestHrPasswordReset(identifier);
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const response = await fetch(`${baseUrl}/api/auth/hr/forgot-password-phone?phone=${encodeURIComponent(identifier)}`, { method: 'POST' });
  if (!response.ok) throw new Error('Phone verification needs the HR phone-reset backend endpoint. Please use registered email if it is not configured yet.');
  return response.text();
}

export async function resetHrPasswordByIdentifier(identifier, otp, newPassword, method = 'email') {
  if (method === 'email') return resetHrPassword(identifier, otp, newPassword);
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const response = await fetch(`${baseUrl}/api/auth/hr/reset-password-phone`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: identifier, otp, newPassword }),
  });
  if (!response.ok) throw new Error('Unable to reset HR password using phone verification.');
  return response.text();
}
