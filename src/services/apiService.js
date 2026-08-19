const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const getToken = () => localStorage.getItem('verifyx_token');

async function request(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = payload?.message || payload?.error || (typeof payload === 'string' ? payload : 'API request failed');
    throw new Error(message);
  }
  return payload?.data ?? payload;
}

async function requestBlob(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
  });
  if (!response.ok) {
    const type = response.headers.get('content-type') || '';
    const payload = type.includes('application/json') ? await response.json() : await response.text();
    throw new Error(payload?.message || payload?.error || 'Unable to open document');
  }
  return response.blob();
}

export const api = {
  candidateRegister: (body) => request('/api/auth/candidateRegister', { method: 'POST', body: JSON.stringify(body) }),
  candidateLogin: (body) => request('/api/auth/candidateLogin', { method: 'POST', body: JSON.stringify(body) }),
  verifyCandidateEmail: (body) => request('/api/auth/candidate/verify-email', { method: 'POST', body: JSON.stringify(body) }),
  resendCandidateVerification: (email) => request(`/api/auth/candidate/resend-verification?email=${encodeURIComponent(email)}`, { method: 'POST' }),
  hrLogin: (body) => request('/api/auth/hrLogin', { method: 'POST', body: JSON.stringify(body) }),
  requestHrPasswordReset: (email) => request(`/api/auth/hr/forgot-password?email=${encodeURIComponent(email)}`, { method: 'POST' }),
  resetHrPassword: (body) => request('/api/auth/hr/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  candidateLogout: () => request('/api/auth/candidateLogout', { method: 'POST' }),
  hrLogout: () => request('/api/auth/hrLogout', { method: 'POST' }),
  candidateProfile: () => request('/api/candidate/profile'),
  uploadProfilePhoto: (formData) => request('/api/candidate/profile/photo', { method: 'PUT', body: formData }),
  profilePhotoBlob: () => requestBlob('/api/candidate/profile/photo'),
  createCandidateProfile: (body) => request('/api/candidate/profile', { method: 'POST', body: JSON.stringify(body) }),
  updateCandidateProfile: (body) => request('/api/candidate/profile', { method: 'PUT', body: JSON.stringify(body) }),
  candidates: () => request('/api/hr/candidates'),
  candidate: (id) => request(`/api/hr/candidates/${id}`),
  deleteCandidate: (id) => request(`/api/hr/candidates/${id}`, { method: 'DELETE' }),
  updateStatus: (id, body) => request(`/api/hr/candidates/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
  verifyUan: (id, body = { status: 'VERIFIED' }) => request(`/api/hr/candidates/${id}/verify-uan`, { method: 'PUT', body: JSON.stringify(body) }),
  uploadDocuments: (formData) => request('/upload/upload', { method: 'POST', body: formData }),
  updateDocuments: (formData) => request('/upload/re-upload', { method: 'PUT', body: formData }),
  myDocuments: () => request('/upload/my-documents'),
  documentBlob: (id) => requestBlob(`/upload/view/${id}`),
  reviewDocuments: (id) => request(`/api/hr/document-review/${id}`),
  reviewDocumentBlob: (id) => requestBlob(`/api/hr/document-review/document/${id}`),
  verifyDocument: (id) => request(`/api/hr/document-review/verify/${id}`, { method: 'PUT' }),
  rejectDocument: (id, reason) => request(`/api/hr/document-review/reject/${id}?reason=${encodeURIComponent(reason || '')}`, { method: 'PUT' }),
  dashboardReport: () => request('/api/hr/dashboard/report'),
  dashboardCandidates: () => request('/api/hr/dashboard/candidates'),
  reports: () => request('/api/hr/reports'),
};
