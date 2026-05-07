import axios from 'axios';

const BASE = '/api';

function authHeaders() {
  const token = localStorage.getItem('hr_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Candidate ────────────────────────────────────────────────────────────────

export async function submitApplication(formData) {
  const res = await axios.post(`${BASE}/applications`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// ── HR — Applications ────────────────────────────────────────────────────────

export async function getHRApplications(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search)       params.append('search',       filters.search);
  if (filters.status)       params.append('status',       filters.status);
  if (filters.primary_role) params.append('primary_role', filters.primary_role);
  if (filters.sort)         params.append('sort',         filters.sort);
  const res = await axios.get(`${BASE}/hr/applications?${params}`, { headers: authHeaders() });
  return res.data;
}

export async function getUnviewedApplicationsCount() {
  const res = await axios.get(`${BASE}/hr/applications?status=applied`, { headers: authHeaders() });
  return res.data.applications?.length || 0;
}

export async function getHRApplication(id) {
  const res = await axios.get(`${BASE}/hr/applications/${id}`, { headers: authHeaders() });
  return res.data;
}

export async function updateApplicationStatus(id, status, hr_notes) {
  const res = await axios.put(
    `${BASE}/hr/applications/${id}/status`,
    { status, hr_notes },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function saveHRNotes(id, hr_notes) {
  const res = await axios.put(
    `${BASE}/hr/applications/${id}/notes`,
    { hr_notes },
    { headers: authHeaders() }
  );
  return res.data;
}

// ── HR — AI ──────────────────────────────────────────────────────────────────

export async function analyzeApplication(id) {
  const res = await axios.post(
    `${BASE}/hr/applications/${id}/analyze`,
    {},
    { headers: authHeaders() }
  );
  return res.data;
}

export async function runAIAnalyzeAll(force = false) {
  const res = await axios.post(
    `${BASE}/hr/analyze-all`,
    { force },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function matchJobDescription(jobDescription, role = '') {
  const res = await axios.post(`${BASE}/hr/match`,
    { job_description: jobDescription, role_filter: role },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function summarizeApplicationAction(id) {
  const res = await axios.post(`${BASE}/hr/applications/${id}/summary`, {}, { headers: authHeaders() });
  return res.data;
}

export async function getHRAnalytics(params = {}) {
  const query = new URLSearchParams();
  if (params.year) query.append('year', params.year);
  const res = await axios.get(`${BASE}/hr/analytics?${query}`, { headers: authHeaders() });
  return res.data;
}

export async function getHRRoles() {
  // get distinct roles from applications list
  const res = await axios.get(`${BASE}/hr/applications`, { headers: authHeaders() });
  const roles = [...new Set((res.data.applications || []).map(a => a.primary_role).filter(Boolean))].sort();
  return roles;
}

// ── HR — Assignment & Interviewer Notes ──────────────────────────────────────

export async function assignMultipleInterviewers(id, interviewers) {
  const res = await axios.put(
    `${BASE}/hr/applications/${id}/assign-multi`,
    { interviewers },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function getInterviewers() {
  const res = await axios.get(`${BASE}/hr/interviewers`, { headers: authHeaders() });
  return res.data;
}

export async function assignInterviewer(id, assigned_interviewer) {
  const res = await axios.put(
    `${BASE}/hr/applications/${id}/assign`,
    { assigned_interviewer },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function sendInterviewerNotes(id, hr_notes_for_interviewer) {
  const res = await axios.put(
    `${BASE}/hr/applications/${id}/interviewer-notes`,
    { hr_notes_for_interviewer },
    { headers: authHeaders() }
  );
  return res.data;
}

// ── Interviewer ──────────────────────────────────────────────────────────────

export async function getInterviewerApplications(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.sort) params.append('sort', filters.sort);
  const res = await axios.get(`${BASE}/interviewer/applications?${params}`, { headers: authHeaders() });
  return res.data;
}

export async function getInterviewerApplication(id) {
  const res = await axios.get(`${BASE}/interviewer/applications/${id}`, { headers: authHeaders() });
  return res.data;
}

export async function summarizeInterviewerApplication(id) {
  const res = await axios.post(`${BASE}/interviewer/applications/${id}/summary`, {}, { headers: authHeaders() });
  return res.data;
}

export async function submitInterviewFeedback(id, feedback) {
  const res = await axios.post(
    `${BASE}/interviewer/applications/${id}/feedback`,
    feedback,
    { headers: authHeaders() }
  );
  return res.data;
}

// ── Match History ────────────────────────────────────────────────────────────

export async function getMatchHistory() {
  const res = await axios.get(`${BASE}/hr/match-history`, { headers: authHeaders() });
  return res.data;
}

export async function saveMatchHistory(role, jobDescription, results) {
  const res = await axios.post(
    `${BASE}/hr/match-history`,
    { role, jobDescription, results },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function clearMatchHistory() {
  const res = await axios.delete(`${BASE}/hr/match-history`, { headers: authHeaders() });
  return res.data;
}

export async function getAdminStats() {
  const res = await axios.get(`${BASE}/admin/stats`, { headers: authHeaders() });
  return res.data;
}
export async function getAdminUsers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.deleted) params.append('deleted', 'true');
  const res = await axios.get(`${BASE}/admin/users?${params}`, { headers: authHeaders() });
  return res.data;
}
export async function restoreAdminUser(id) {
  const res = await axios.post(`${BASE}/admin/users/${id}/restore`, {}, { headers: authHeaders() });
  return res.data;
}
export async function bulkDeleteUsers(ids) {
  const res = await axios.post(`${BASE}/admin/users/bulk-delete`, { ids }, { headers: authHeaders() });
  return res.data;
}
export async function bulkRestoreUsers(ids) {
  const res = await axios.post(`${BASE}/admin/users/bulk-restore`, { ids }, { headers: authHeaders() });
  return res.data;
}
export async function bulkPurgeUsers(ids) {
  const res = await axios.post(`${BASE}/admin/users/bulk-purge`, { ids: ids || [] }, { headers: authHeaders() });
  return res.data;
}
export async function createAdminUser(data) {
  const res = await axios.post(`${BASE}/admin/users`, data, { headers: authHeaders() });
  return res.data;
}
export async function updateAdminUser(id, data) {
  const res = await axios.put(`${BASE}/admin/users/${id}`, data, { headers: authHeaders() });
  return res.data;
}
export async function deleteAdminUser(id) {
  const res = await axios.delete(`${BASE}/admin/users/${id}`, { headers: authHeaders() });
  return res.data;
}
export async function toggleAdminUserActive(id) {
  const res = await axios.post(`${BASE}/admin/users/${id}/toggle-active`, {}, { headers: authHeaders() });
  return res.data;
}
export async function getAdminAllApplications(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.deleted) params.append('deleted', 'true');
  if (filters.sort) params.append('sort', filters.sort);
  const res = await axios.get(`${BASE}/admin/applications?${params}`, { headers: authHeaders() });
  return res.data;
}
export async function softDeleteApplication(id) {
  const res = await axios.delete(`${BASE}/admin/applications/${id}`, { headers: authHeaders() });
  return res.data;
}
export async function restoreApplication(id) {
  const res = await axios.post(`${BASE}/admin/applications/${id}/restore`, {}, { headers: authHeaders() });
  return res.data;
}
export async function overrideAIScore(id, ai_score) {
  const res = await axios.put(`${BASE}/admin/applications/${id}/override-score`, { ai_score }, { headers: authHeaders() });
  return res.data;
}
export async function getAuditLogs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.action) params.append('action', filters.action);
  if (filters.search) params.append('search', filters.search);
  const res = await axios.get(`${BASE}/admin/audit-logs?${params}`, { headers: authHeaders() });
  return res.data;
}
export async function bulkDeleteApplications(ids) {
  const res = await axios.post(`${BASE}/admin/applications/bulk-delete`, { ids }, { headers: authHeaders() });
  return res.data;
}
export async function bulkRestoreApplications(ids) {
  const res = await axios.post(`${BASE}/admin/applications/bulk-restore`, { ids }, { headers: authHeaders() });
  return res.data;
}
export async function bulkPurgeApplications(ids) {
  const res = await axios.post(`${BASE}/admin/applications/bulk-purge`, { ids: ids || [] }, { headers: authHeaders() });
  return res.data;
}

// ── Profile panels ────────────────────────────────────────────────────────────

export async function getHRProfile() {
  const res = await axios.get(`${BASE}/hr/my-profile`, { headers: authHeaders() });
  return res.data;
}

export async function getInterviewerProfile() {
  const res = await axios.get(`${BASE}/interviewer/my-profile`, { headers: authHeaders() });
  return res.data;
}

// ── Login Requests ────────────────────────────────────────────────────────────

export async function getLoginRequests() {
  const res = await axios.get(`${BASE}/admin/login-requests`, { headers: authHeaders() });
  return res.data;
}
export async function approveLoginRequest(id, { role, name } = {}) {
  const res = await axios.post(`${BASE}/admin/login-requests/${id}/approve`, { role, name }, { headers: authHeaders() });
  return res.data;
}

export async function checkMyApprovalStatus(email) {
  const res = await axios.get(`${BASE}/auth/my-status?email=${encodeURIComponent(email)}`);
  return res.data;
}
export async function rejectLoginRequest(id) {
  const res = await axios.post(`${BASE}/admin/login-requests/${id}/reject`, {}, { headers: authHeaders() });
  return res.data;
}
