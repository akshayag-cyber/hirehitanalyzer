import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import Pagination, { PAGE_SIZE } from '../components/Pagination';
import {
  getAdminStats,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  toggleAdminUserActive,
  restoreAdminUser,
  bulkDeleteUsers,
  bulkRestoreUsers,
  bulkPurgeUsers,
  getAdminAllApplications,
  softDeleteApplication,
  restoreApplication,
  overrideAIScore,
  getAuditLogs,
  bulkDeleteApplications,
  bulkRestoreApplications,
  bulkPurgeApplications,
  getLoginRequests,
  approveLoginRequest,
  rejectLoginRequest,
} from '../services/api';

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('hr_user') || 'null'); } catch { return null; }
}

function formatAction(action) {
  if (!action) return '';
  return action.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

function Spinner() {
  return (
    <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mx-auto"
         style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
  );
}

function CandidateDetailModal({ app, onClose }) {
  const STATUS_LABELS = {
    applied: 'Applied', shortlisted: 'Shortlisted', rejected: 'Rejected',
    final_selected: 'Final Selected', another_round: 'Another Round', ai_rejected: 'AI Rejected',
  };
  const DECISION_LABELS = { proceed: 'Proceed to Next', reject: 'Rejected', another_round: 'Another Round' };

  let assignedNames = [];
  try { assignedNames = JSON.parse(app.assigned_interviewers || '[]'); } catch { assignedNames = []; }
  if (!assignedNames.length && app.assigned_interviewer) assignedNames = [app.assigned_interviewer];

  const salaryText = app.salary_min || app.salary_max
    ? `${app.salary_min ? `₹${app.salary_min.toLocaleString()}` : '—'} – ${app.salary_max ? `₹${app.salary_max.toLocaleString()}` : '—'} LPA${app.salary_flexible ? ' (flexible)' : ''}`
    : null;

  function Row({ label, value }) {
    if (!value && value !== 0) return null;
    return (
      <div className="flex gap-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <span className="text-xs font-medium flex-shrink-0 w-36" style={{ color: 'var(--color-text-subtle)' }}>{label}</span>
        <span className="text-xs flex-1" style={{ color: 'var(--color-text-primary)', wordBreak: 'break-word' }}>{value}</span>
      </div>
    );
  }

  function Section({ title, children }) {
    return (
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-subtle)' }}>{title}</p>
        <div className="rounded-xl px-3" style={{ background: 'var(--color-bg-elevated)' }}>{children}</div>
      </div>
    );
  }

  function ScoreChip({ label, value }) {
    if (value == null) return null;
    return (
      <div className="flex flex-col items-center p-2 rounded-lg" style={{ background: 'var(--color-bg-surface)', minWidth: '64px' }}>
        <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{value}</span>
        <span className="text-xs mt-0.5 text-center" style={{ color: 'var(--color-text-muted)', lineHeight: 1.2 }}>{label}</span>
      </div>
    );
  }

  const hasInterviewData = app.overall_score != null || app.attitude_score != null ||
    app.confidence_score != null || app.knowledge_score != null || app.cultural_fit_score != null;

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ pointerEvents: 'none' }}>
        <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
             style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', pointerEvents: 'auto' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
               style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-base font-semibold">{app.full_name}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{app.email}</p>
              </div>
              <StatusBadge status={app.status} />
            </div>
            <button onClick={onClose} className="btn-ghost p-1.5" style={{ lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            <Section title="Candidate Information">
              <Row label="Phone" value={app.phone} />
              <Row label="Role Applied" value={app.primary_role} />
              <Row label="Application Date" value={app.created_at ? new Date(app.created_at).toLocaleString() : null} />
              <Row label="Education" value={app.education} />
              <Row label="Experience" value={app.years_of_experience != null ? `${app.years_of_experience} year${app.years_of_experience !== 1 ? 's' : ''}` : null} />
              <Row label="Preferred Domains" value={app.preferred_domains} />
              <Row label="Salary Expectation" value={salaryText} />
              <Row label="Night Shift" value={app.night_shift_preference} />
            </Section>

            {(app.ai_score != null || app.ai_summary) && (
              <Section title="AI Analysis">
                <Row label="AI Score" value={app.ai_score != null ? `${app.ai_score} / 100` : null} />
                <Row label="AI Summary" value={app.ai_summary} />
              </Section>
            )}

            <Section title="HR Processing">
              <Row label="Current Status" value={STATUS_LABELS[app.status] || app.status} />
              <div className="flex gap-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="text-xs font-medium flex-shrink-0 w-36" style={{ color: 'var(--color-text-subtle)' }}>Processed by</span>
                <span className="text-xs flex-1 font-semibold" style={{ color: (app.hr_action_by || app.action_by) ? 'var(--color-primary)' : 'var(--color-text-subtle)' }}>
                  {app.hr_action_by || app.action_by || '—'}
                </span>
              </div>
              <Row label="HR Notes" value={app.hr_notes} />
              <Row label="Notes for Interviewer" value={app.hr_notes_for_interviewer} />
            </Section>

            <Section title="Interview Details">
              <Row label="Assigned To" value={assignedNames.length ? assignedNames.join(', ') : null} />
              {hasInterviewData ? (
                <>
                  <div className="flex gap-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <span className="text-xs font-medium flex-shrink-0 w-36" style={{ color: 'var(--color-text-subtle)' }}>Evaluated by</span>
                    <span className="text-xs flex-1 font-semibold" style={{ color: app.interviewer_submitted_by ? 'var(--color-primary)' : 'var(--color-text-subtle)' }}>
                      {app.interviewer_submitted_by || '—'}
                    </span>
                  </div>
                  <div className="py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <span className="text-xs font-medium block mb-2" style={{ color: 'var(--color-text-subtle)' }}>Scores</span>
                    <div className="flex flex-wrap gap-2">
                      <ScoreChip label="Overall" value={app.overall_score} />
                      <ScoreChip label="Attitude" value={app.attitude_score} />
                      <ScoreChip label="Confidence" value={app.confidence_score} />
                      <ScoreChip label="Knowledge" value={app.knowledge_score} />
                      <ScoreChip label="Cultural Fit" value={app.cultural_fit_score} />
                    </div>
                  </div>
                  <Row label="Interview Decision" value={DECISION_LABELS[app.interview_decision] || app.interview_decision} />
                  <Row label="Feedback Notes" value={app.feedback_notes} />
                </>
              ) : (
                <div className="py-3 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                  No interview evaluation yet
                </div>
              )}
            </Section>

          </div>
        </div>
      </div>
    </>
  );
}

function RoleBadge({ role }) {
  const styles = {
    hr: { background: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
    interviewer: { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
    admin: { background: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  };
  const s = styles[role] || { background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' };
  return (
    <span className="badge" style={s}>{role}</span>
  );
}

function StatusBadge({ status }) {
  const map = {
    applied: 'badge-applied',
    shortlisted: 'badge-shortlisted',
    rejected: 'badge-rejected',
    final_selected: 'badge-final_selected',
    another_round: 'badge-another_round',
  };
  const labels = {
    applied: 'Applied', shortlisted: 'Shortlisted', rejected: 'Rejected',
    final_selected: 'Selected', another_round: 'Another Round',
  };
  return <span className={`text-xs ${map[status] || 'badge'}`}>{labels[status] || status}</span>;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);

  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', name: '', role: 'hr' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'hr' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [usersFilter, setUsersFilter] = useState({ deleted: false, role: '' });
  const [usersView, setUsersView] = useState('active'); // 'active' | 'trash' | 'requests'
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [userBulkLoading, setUserBulkLoading] = useState(false);
  const [userBulkConfirm, setUserBulkConfirm] = useState(null);

  const [loginRequests, setLoginRequests] = useState([]);
  const [loginRequestsLoading, setLoginRequestsLoading] = useState(false);
  const [loginRequestAction, setLoginRequestAction] = useState(null);
  const [approveModal, setApproveModal] = useState(null); // { id, name, email, requested_role }
  const [approveForm, setApproveForm] = useState({ name: '', role: '' });
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState('');

  const [applications, setApplications] = useState([]);
  const [appsPage, setAppsPage] = useState(1);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState('');
  const [appsFilters, setAppsFilters] = useState({ search: '', status: '', deleted: false });
  const [overrideApp, setOverrideApp] = useState(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(null);
  const [detailApp, setDetailApp] = useState(null);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({ action: '', search: '' });

  useEffect(() => {
    if (activeTab === 'overview') { loadOverview(); loadLoginRequests(); }
    if (activeTab === 'users') { loadUsers(); loadLoginRequests(); }
    if (activeTab === 'candidates') loadApplications();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    setSelectedUserIds(new Set());
    setUsersPage(1);
  }, [usersFilter]);

  useEffect(() => {
    if (activeTab === 'candidates') loadApplications();
    setSelectedAppIds(new Set());
    setAppsPage(1);
  }, [appsFilters]);

  useEffect(() => {
    if (activeTab === 'audit') loadAuditLogs();
  }, [auditFilters]);

  async function loadOverview() {
    setStatsLoading(true);
    try {
      const [s, logsData] = await Promise.all([getAdminStats(), getAuditLogs({})]);
      setStats(s);
      setRecentLogs((logsData.logs || []).slice(0, 5));
    } catch (err) {
      console.error('Failed to load overview:', err);
      if (err.response?.status === 401) {
        localStorage.clear();
        window.location.href = '/hiring';
      }
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadUsers() {
    setUsersLoading(true);
    setUsersError('');
    try {
      const data = await getAdminUsers(usersFilter);
      setUsers(data.users || []);
    } catch (err) {
      setUsersError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadLoginRequests() {
    setLoginRequestsLoading(true);
    try {
      const data = await getLoginRequests();
      setLoginRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoginRequestsLoading(false);
    }
  }

  function openApproveModal(request) {
    setApproveModal(request);
    setApproveForm({ name: request.name, role: request.requested_role || '' });
    setApproveError('');
  }

  async function handleApproveSubmit(e) {
    e.preventDefault();
    if (!approveForm.role) { setApproveError('Please assign a role before approving.'); return; }
    setApproveLoading(true);
    setApproveError('');
    try {
      await approveLoginRequest(approveModal.id, { role: approveForm.role, name: approveForm.name });
      setApproveModal(null);
      await loadLoginRequests();
      await loadUsers();
    } catch (err) {
      setApproveError(err.response?.data?.error || 'Failed to approve');
    } finally {
      setApproveLoading(false);
    }
  }

  async function handleApproveRequest(id) {
    // Used only for Re-approve from rejected state (no modal needed)
    setLoginRequestAction(id);
    try {
      await approveLoginRequest(id);
      await loadLoginRequests();
      await loadUsers();
    } catch (err) {
      setUsersError(err.response?.data?.error || 'Failed to approve');
    } finally {
      setLoginRequestAction(null);
    }
  }

  async function handleRejectRequest(id) {
    setLoginRequestAction(id);
    try {
      await rejectLoginRequest(id);
      await loadLoginRequests();
    } catch (err) {
      setUsersError(err.response?.data?.error || 'Failed to reject');
    } finally {
      setLoginRequestAction(null);
    }
  }

  async function loadApplications() {
    setAppsLoading(true);
    setAppsError('');
    try {
      const data = await getAdminAllApplications(appsFilters);
      setApplications(data.applications || []);
    } catch (err) {
      setAppsError(err.response?.data?.error || 'Failed to load applications');
    } finally {
      setAppsLoading(false);
    }
  }

  async function loadAuditLogs() {
    setAuditLoading(true);
    try {
      const data = await getAuditLogs(auditFilters);
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await createAdminUser(createForm);
      setShowCreateUser(false);
      setCreateForm({ email: '', name: '', role: 'hr' });
      await loadUsers();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleEditUser(e) {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await updateAdminUser(editUser.id, editForm);
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteUser(id) {
    try {
      await deleteAdminUser(id);
      setDeleteConfirm(null);
      await loadUsers();
    } catch (err) {
      setUsersError(err.response?.data?.error || 'Failed to delete user');
    }
  }

  async function handleToggleActive(id) {
    try {
      await toggleAdminUserActive(id);
      await loadUsers();
    } catch (err) {
      setUsersError(err.response?.data?.error || 'Failed to toggle user status');
    }
  }

  function toggleUserSelected(id) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAllUsers() {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
  }

  async function handleBulkTrashUsers() {
    const ids = Array.from(selectedUserIds);
    if (!ids.length) return;
    setUserBulkLoading(true);
    try {
      await bulkDeleteUsers(ids);
      setSelectedUserIds(new Set());
      await loadUsers();
    } catch (err) {
      setUsersError(err.response?.data?.error || 'Failed to move to trash');
    } finally {
      setUserBulkLoading(false);
      setUserBulkConfirm(null);
    }
  }

  async function handleBulkRestoreUsers() {
    const ids = Array.from(selectedUserIds);
    if (!ids.length) return;
    setUserBulkLoading(true);
    try {
      await bulkRestoreUsers(ids);
      setSelectedUserIds(new Set());
      await loadUsers();
    } catch (err) {
      setUsersError(err.response?.data?.error || 'Failed to restore users');
    } finally {
      setUserBulkLoading(false);
      setUserBulkConfirm(null);
    }
  }

  async function handleBulkPurgeUsers(all = false) {
    const ids = all ? null : Array.from(selectedUserIds);
    if (!all && !ids.length) return;
    setUserBulkLoading(true);
    try {
      await bulkPurgeUsers(ids);
      setSelectedUserIds(new Set());
      await loadUsers();
    } catch (err) {
      setUsersError(err.response?.data?.error || 'Failed to purge users');
    } finally {
      setUserBulkLoading(false);
      setUserBulkConfirm(null);
    }
  }

  async function handleRestoreUser(id) {
    try {
      await restoreAdminUser(id);
      await loadUsers();
    } catch (err) {
      setUsersError(err.response?.data?.error || 'Failed to restore user');
    }
  }

  async function handleSoftDelete(id) {
    try {
      await softDeleteApplication(id);
      await loadApplications();
    } catch (err) {
      setAppsError(err.response?.data?.error || 'Failed to delete application');
    }
  }

  async function handleRestore(id) {
    try {
      await restoreApplication(id);
      await loadApplications();
    } catch (err) {
      setAppsError(err.response?.data?.error || 'Failed to restore application');
    }
  }

  async function handleOverrideScore(appId) {
    const score = parseFloat(overrideScore);
    if (isNaN(score)) return;
    setOverrideLoading(true);
    try {
      await overrideAIScore(appId, score);
      setOverrideApp(null);
      setOverrideScore('');
      await loadApplications();
    } catch (err) {
      setAppsError(err.response?.data?.error || 'Failed to override score');
    } finally {
      setOverrideLoading(false);
    }
  }

  function toggleAppSelected(id) {
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedAppIds.size === applications.length) {
      setSelectedAppIds(new Set());
    } else {
      setSelectedAppIds(new Set(applications.map((a) => a.id)));
    }
  }

  async function handleBulkTrash() {
    const ids = Array.from(selectedAppIds);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      await bulkDeleteApplications(ids);
      setSelectedAppIds(new Set());
      await loadApplications();
    } catch (err) {
      setAppsError(err.response?.data?.error || 'Failed to move to trash');
    } finally {
      setBulkLoading(false);
      setBulkConfirm(null);
    }
  }

  async function handleBulkRestore() {
    const ids = Array.from(selectedAppIds);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      await bulkRestoreApplications(ids);
      setSelectedAppIds(new Set());
      await loadApplications();
    } catch (err) {
      setAppsError(err.response?.data?.error || 'Failed to restore');
    } finally {
      setBulkLoading(false);
      setBulkConfirm(null);
    }
  }

  async function handleBulkPurge(all = false) {
    const ids = all ? null : Array.from(selectedAppIds);
    if (!all && !ids.length) return;
    setBulkLoading(true);
    try {
      await bulkPurgeApplications(ids);
      setSelectedAppIds(new Set());
      await loadApplications();
    } catch (err) {
      setAppsError(err.response?.data?.error || 'Failed to purge');
    } finally {
      setBulkLoading(false);
      setBulkConfirm(null);
    }
  }

  function handleLogout() {
    localStorage.clear();
    navigate('/hiring');
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'User Management' },
    { id: 'candidates', label: 'Candidates' },
    { id: 'audit', label: 'Audit Logs' },
  ];

  const filteredUsers   = usersFilter.role ? users.filter((u) => u.role === usersFilter.role) : users;
  const usersTotalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const pagedUsers      = filteredUsers.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE);
  const appsTotalPages  = Math.ceil(applications.length / PAGE_SIZE);
  const pagedApps       = applications.slice((appsPage - 1) * PAGE_SIZE, appsPage * PAGE_SIZE);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
      <header className="sticky top-0 z-40"
              style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src="/synersys-logo.png" alt="Zentiti" style={{ height: '32px', width: 'auto' }} />
            <nav className="hidden sm:flex items-center gap-1">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id ? 'text-sm px-3 py-1.5 rounded-lg font-medium' : 'btn-ghost text-sm px-3 py-1.5'}
                  style={activeTab === tab.id ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' } : {}}>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
              {user?.name}
            </span>
            <ThemeToggle />
            <button onClick={handleLogout} className="btn-ghost text-sm">Logout</button>
          </div>
        </div>
        <div className="sm:hidden px-4 pb-2 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap' : 'btn-ghost text-xs px-3 py-1.5 whitespace-nowrap'}
              style={activeTab === tab.id ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' } : {}}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {activeTab === 'overview' && (
          <div>
            <h1 className="text-xl font-bold mb-6">Overview</h1>

            {/* Pending login requests notification */}
            {loginRequests.filter(r => r.approval_status === 'pending').length > 0 && (
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl mb-6 cursor-pointer"
                   style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.4)' }}
                   onClick={() => { setActiveTab('users'); setUsersView('requests'); }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔔</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>
                      {loginRequests.filter(r => r.approval_status === 'pending').length} pending login request{loginRequests.filter(r => r.approval_status === 'pending').length > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {loginRequests.filter(r => r.approval_status === 'pending').map(r => r.name).join(', ')} waiting for approval
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-warning)' }}>
                  Review →
                </span>
              </div>
            )}

            {statsLoading ? (
              <div className="py-16 text-center"><Spinner /></div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'Total Candidates', value: stats.total_candidates, color: 'var(--color-primary)', status: '' },
                    { label: 'Shortlisted', value: stats.shortlisted, color: 'var(--color-warning)', status: 'shortlisted' },
                    { label: 'Rejected', value: stats.rejected, color: 'var(--color-danger)', status: 'rejected' },
                    { label: 'Final Selected', value: stats.final_selected, color: 'var(--color-success)', status: 'final_selected' },
                  ].map((card) => (
                    <div key={card.label} className="card p-5 cursor-pointer transition-all hover:shadow-md"
                         onClick={() => { setActiveTab('candidates'); setAppsFilters((f) => ({ ...f, status: card.status, deleted: false })); }}>
                      <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value ?? 0}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{card.label}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Users',   value: stats.total_users,        action: () => { setActiveTab('users');      setUsersView('active'); setUsersFilter({ deleted: false, role: '' });            setUsersPage(1); } },
                    { label: 'HR Users',      value: stats.hr_count,           action: () => { setActiveTab('users');      setUsersView('active'); setUsersFilter({ deleted: false, role: 'hr' });          setUsersPage(1); } },
                    { label: 'Interviewers',  value: stats.interviewer_count,  action: () => { setActiveTab('users');      setUsersView('active'); setUsersFilter({ deleted: false, role: 'interviewer' }); setUsersPage(1); } },
                    { label: 'AI Analyzed',   value: stats.ai_analyzed,        action: () => { setActiveTab('candidates'); setAppsFilters((f) => ({ ...f, status: '', deleted: false })); setAppsPage(1); } },
                  ].map((card) => (
                    <div key={card.label} className="card p-4 cursor-pointer transition-all hover:shadow-md"
                         onClick={card.action}>
                      <div className="text-xl font-bold">{card.value ?? 0}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{card.label}</div>
                    </div>
                  ))}
                </div>

                <div className="card p-5">
                  <h2 className="text-sm font-semibold mb-4">Recent Activity</h2>
                  {recentLogs.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No recent activity</p>
                  ) : (
                    <div className="space-y-3">
                      {recentLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg"
                             style={{ background: 'var(--color-bg-elevated)' }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{formatAction(log.action)}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              by {log.actor_name}
                              {log.target_name ? ` · ${log.target_name}` : ''}
                            </p>
                          </div>
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-subtle)' }}>
                            {formatTime(log.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold">User Management</h1>
              <div className="flex items-center gap-2">
                {usersView === 'active' && (
                  <button className="btn-primary text-sm" onClick={() => { setShowCreateUser(true); setCreateError(''); }}>
                    + Create User
                  </button>
                )}
              </div>
            </div>

            {usersView !== 'requests' && (
              <p className="text-xs mb-4 px-1" style={{ color: 'var(--color-text-subtle)' }}>
                Only users with an assigned role can log in successfully.
              </p>
            )}

            {/* Filter bar */}
            <div className="card p-4 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 p-1 rounded-lg" style={{ background: 'var(--color-bg-elevated)' }}>
                  <button className="text-xs px-3 py-1.5 rounded-md font-medium transition-all"
                          style={usersView === 'active'
                            ? { background: 'var(--color-bg-surface)', color: 'var(--color-primary)' }
                            : { color: 'var(--color-text-muted)' }}
                          onClick={() => { setUsersView('active'); setUsersFilter((f) => ({ ...f, deleted: false })); }}>
                    Active
                  </button>
                  <button className="text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5"
                          style={usersView === 'trash'
                            ? { background: 'var(--color-bg-surface)', color: 'var(--color-danger)' }
                            : { color: 'var(--color-text-muted)' }}
                          onClick={() => { setUsersView('trash'); setUsersFilter({ deleted: true, role: '' }); }}>
                    🗑 Trash Bin
                  </button>
                  <button className="text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5"
                          style={usersView === 'requests'
                            ? { background: 'var(--color-bg-surface)', color: 'var(--color-warning)' }
                            : { color: 'var(--color-text-muted)' }}
                          onClick={() => { setUsersView('requests'); loadLoginRequests(); }}>
                    Login Requests
                    {loginRequests.filter(r => r.approval_status === 'pending').length > 0 && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--color-warning)', color: '#fff', minWidth: '18px', textAlign: 'center' }}>
                        {loginRequests.filter(r => r.approval_status === 'pending').length}
                      </span>
                    )}
                  </button>
                </div>
                {usersView === 'active' && (
                  <select className="input select text-xs w-44"
                          value={usersFilter.role || ''}
                          onChange={(e) => setUsersFilter((f) => ({ ...f, role: e.target.value }))}>
                    <option value="">All Roles</option>
                    <option value="hr">HR Users</option>
                    <option value="interviewer">Interviewers</option>
                    <option value="admin">Admins</option>
                  </select>
                )}
                {usersView === 'active' && usersFilter.role && (
                  <span className="text-xs px-2 py-1 rounded-md flex items-center gap-1.5"
                        style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                    Filtered: {usersFilter.role === 'hr' ? 'HR Users' : usersFilter.role === 'interviewer' ? 'Interviewers' : 'Admins'}
                    <button className="text-xs font-bold leading-none"
                            style={{ color: 'var(--color-primary)' }}
                            onClick={() => setUsersFilter((f) => ({ ...f, role: '' }))}>×</button>
                  </span>
                )}
                {usersView === 'trash' && users.length > 0 && (
                  <button className="btn-secondary text-xs py-2 px-3 ml-auto"
                          style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                          onClick={() => setUserBulkConfirm({ type: 'purgeAll' })}>
                    Purge All
                  </button>
                )}
              </div>

              {usersView === 'trash' && users.length > 0 && (
                <div className="flex items-start gap-2 mt-3 p-3 rounded-lg"
                     style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)' }}>
                  <span className="text-base leading-none" style={{ color: 'var(--color-danger)' }}>⚠</span>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-danger)' }}>
                    <strong>Caution:</strong> Purging will permanently delete all trashed users from the database. This action cannot be undone.
                  </p>
                </div>
              )}

              {selectedUserIds.size > 0 && (
                <div className="flex items-center gap-3 mt-4 pt-4 flex-wrap"
                     style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    {selectedUserIds.size} selected
                  </span>
                  {usersView === 'active' && (
                    <button className="btn-secondary text-xs py-1.5 px-3"
                            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                            disabled={userBulkLoading}
                            onClick={() => setUserBulkConfirm({ type: 'bulkTrash' })}>
                      🗑 Move to Trash
                    </button>
                  )}
                  {usersView === 'trash' && (
                    <>
                      <button className="btn-secondary text-xs py-1.5 px-3"
                              style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                              disabled={userBulkLoading}
                              onClick={handleBulkRestoreUsers}>
                        ↺ Restore
                      </button>
                      <button className="btn-secondary text-xs py-1.5 px-3"
                              style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                              disabled={userBulkLoading}
                              onClick={() => setUserBulkConfirm({ type: 'bulkPurge' })}>
                        Delete Permanently
                      </button>
                    </>
                  )}
                  <button className="btn-ghost text-xs py-1.5 px-3"
                          onClick={() => setSelectedUserIds(new Set())}>
                    Clear
                  </button>
                </div>
              )}
            </div>

            {usersError && <div className="alert-error mb-4">{usersError}</div>}

            {/* Login Requests view */}
            {usersView === 'requests' && (
              loginRequestsLoading ? (
                <div className="py-16 text-center"><Spinner /></div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Requested Role</th>
                          <th>Status</th>
                          <th>Requested At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginRequests.map((r) => (
                          <tr key={r.id}>
                            <td className="text-sm font-medium">{r.name}</td>
                            <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{r.email}</td>
                            <td>
                              {r.requested_role
                                ? <RoleBadge role={r.requested_role} />
                                : <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>—</span>}
                            </td>
                            <td>
                              <span className="badge text-xs"
                                    style={r.approval_status === 'pending'
                                      ? { background: 'rgba(234,179,8,0.15)', color: 'var(--color-warning)' }
                                      : { background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)' }}>
                                {r.approval_status === 'pending' ? 'Pending' : 'Rejected'}
                              </span>
                            </td>
                            <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {formatTime(r.created_at)}
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                {r.approval_status === 'pending' && (
                                  <>
                                    <button
                                      className="btn-ghost text-xs py-1 px-2"
                                      style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                                      onClick={() => openApproveModal(r)}>
                                      Accept
                                    </button>
                                    <button
                                      className="btn-ghost text-xs py-1 px-2"
                                      style={{ color: 'var(--color-danger)' }}
                                      disabled={loginRequestAction === r.id}
                                      onClick={() => handleRejectRequest(r.id)}>
                                      Reject
                                    </button>
                                  </>
                                )}
                                {r.approval_status === 'rejected' && (
                                  <button
                                    className="btn-ghost text-xs py-1 px-2"
                                    style={{ color: 'var(--color-success)' }}
                                    disabled={loginRequestAction === r.id}
                                    onClick={() => handleApproveRequest(r.id)}>
                                    {loginRequestAction === r.id ? '...' : 'Re-approve'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {loginRequests.length === 0 && (
                      <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        No login requests
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {usersView !== 'requests' && usersLoading ? (
              <div className="py-16 text-center"><Spinner /></div>
            ) : usersView !== 'requests' && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUsers.map((u) => (
                        <tr key={u.id} onClick={() => toggleUserSelected(u.id)}
                            style={{ cursor: 'pointer', ...(selectedUserIds.has(u.id) ? { background: 'var(--color-primary-subtle)' } : {}) }}>
                          <td>
                            <input type="checkbox"
                                   checked={selectedUserIds.has(u.id)}
                                   onClick={(e) => e.stopPropagation()}
                                   onChange={() => toggleUserSelected(u.id)} />
                          </td>
                          <td className="text-sm font-medium">{u.name}</td>
                          <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{u.email}</td>
                          <td><RoleBadge role={u.role} /></td>
                          <td>
                            <span className="badge text-xs"
                                  style={u.is_active !== false
                                    ? { background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)' }
                                    : { background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)' }}>
                              {u.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {u.last_login ? formatTime(u.last_login) : 'Never'}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              {usersView === 'active' ? (
                                <>
                                  <button className="btn-ghost text-xs py-1 px-2"
                                          onClick={() => { setEditUser(u); setEditForm({ name: u.name, role: u.role || '' }); setEditError(''); }}>
                                    Edit
                                  </button>
                                  <button className="btn-ghost text-xs py-1 px-2"
                                          onClick={() => handleToggleActive(u.id)}>
                                    {u.is_active !== false ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button className="btn-ghost text-base py-1 px-2"
                                          title="Move to Trash"
                                          style={{ color: 'var(--color-danger)' }}
                                          onClick={() => setDeleteConfirm(u)}>
                                    🗑
                                  </button>
                                </>
                              ) : (
                                <button className="btn-ghost text-xs py-1 px-2"
                                        style={{ color: 'var(--color-success)' }}
                                        onClick={() => handleRestoreUser(u.id)}>
                                  Restore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {usersView === 'trash' ? 'Trash bin is empty' : 'No users found'}
                    </div>
                  )}
                </div>
                {users.length > 0 && (
                  <Pagination page={usersPage} totalPages={usersTotalPages} totalItems={users.length}
                              onPageChange={setUsersPage} itemLabel="users" />
                )}
              </div>
            )}

            {showCreateUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center"
                   style={{ background: 'rgba(0,0,0,0.6)' }}
                   onClick={() => setShowCreateUser(false)}>
                <div className="card p-6 w-full max-w-md mx-4"
                     style={{ background: 'var(--color-bg-surface)' }}
                     onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-base font-semibold mb-5">Create User</h2>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="label text-xs">Name</label>
                      <input className="input text-sm" value={createForm.name}
                             onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                             placeholder="Full name" required />
                    </div>
                    <div>
                      <label className="label text-xs">Email</label>
                      <input className="input text-sm" type="email" value={createForm.email}
                             onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                             placeholder="user@example.com" required />
                    </div>
                    <div>
                      <label className="label text-xs">Role</label>
                      <select className="input select text-sm" value={createForm.role}
                              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}>
                        <option value="hr">HR</option>
                        <option value="interviewer">Interviewer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {createError && <div className="alert-error text-sm">{createError}</div>}
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="btn-primary flex-1" disabled={createLoading}>
                        {createLoading ? 'Creating...' : 'Create User'}
                      </button>
                      <button type="button" className="btn-secondary px-5"
                              onClick={() => setShowCreateUser(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center"
                   style={{ background: 'rgba(0,0,0,0.6)' }}
                   onClick={() => setEditUser(null)}>
                <div className="card p-6 w-full max-w-md mx-4"
                     style={{ background: 'var(--color-bg-surface)' }}
                     onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-base font-semibold mb-5">Edit User</h2>
                  <form onSubmit={handleEditUser} className="space-y-4">
                    <div>
                      <label className="label text-xs">Name</label>
                      <input className="input text-sm" value={editForm.name}
                             onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                             placeholder="Full name" required />
                    </div>
                    <div>
                      <label className="label text-xs">Role</label>
                      {!editUser?.role && (
                        <p className="text-xs mb-1" style={{ color: 'var(--color-warning)' }}>
                          Assign a role so this user can log in.
                        </p>
                      )}
                      <select className="input select text-sm" value={editForm.role}
                              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                        <option value="">— No role assigned —</option>
                        <option value="hr">HR</option>
                        <option value="interviewer">Interviewer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {editError && <div className="alert-error text-sm">{editError}</div>}
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="btn-primary flex-1" disabled={editLoading}>
                        {editLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" className="btn-secondary px-5"
                              onClick={() => setEditUser(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {deleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center"
                   style={{ background: 'rgba(0,0,0,0.6)' }}
                   onClick={() => setDeleteConfirm(null)}>
                <div className="card p-6 w-full max-w-sm mx-4"
                     style={{ background: 'var(--color-bg-surface)' }}
                     onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-base font-semibold mb-2">Move to Trash</h2>
                  <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
                    Move <strong>{deleteConfirm.name}</strong> to the trash bin? They can be restored later.
                  </p>
                  <div className="flex gap-3">
                    <button className="btn-primary flex-1" style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                            onClick={() => handleDeleteUser(deleteConfirm.id)}>
                      Move to Trash
                    </button>
                    <button className="btn-secondary px-5" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {userBulkConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center"
                   style={{ background: 'rgba(0,0,0,0.6)' }}
                   onClick={() => !userBulkLoading && setUserBulkConfirm(null)}>
                <div className="card p-6 w-full max-w-md mx-4"
                     style={{ background: 'var(--color-bg-surface)' }}
                     onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-base font-semibold mb-2">
                    {userBulkConfirm.type === 'bulkTrash' && 'Move to Trash'}
                    {userBulkConfirm.type === 'bulkPurge' && 'Delete Permanently'}
                    {userBulkConfirm.type === 'purgeAll' && 'Purge Entire Trash'}
                  </h2>
                  <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
                    {userBulkConfirm.type === 'bulkTrash' &&
                      `Move ${selectedUserIds.size} user${selectedUserIds.size === 1 ? '' : 's'} to the trash bin? They can be restored later.`}
                    {userBulkConfirm.type === 'bulkPurge' &&
                      `Permanently delete ${selectedUserIds.size} user${selectedUserIds.size === 1 ? '' : 's'} from the database? This cannot be undone.`}
                    {userBulkConfirm.type === 'purgeAll' &&
                      `Permanently delete ALL users currently in the trash bin. This cannot be undone.`}
                  </p>
                  <div className="flex gap-3">
                    <button className="btn-primary flex-1"
                            style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                            disabled={userBulkLoading}
                            onClick={() => {
                              if (userBulkConfirm.type === 'bulkTrash') handleBulkTrashUsers();
                              else if (userBulkConfirm.type === 'bulkPurge') handleBulkPurgeUsers(false);
                              else if (userBulkConfirm.type === 'purgeAll') handleBulkPurgeUsers(true);
                            }}>
                      {userBulkLoading ? 'Processing...' : 'Confirm'}
                    </button>
                    <button className="btn-secondary px-5"
                            disabled={userBulkLoading}
                            onClick={() => setUserBulkConfirm(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Approve & Assign Role modal */}
            {approveModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center"
                   style={{ background: 'rgba(0,0,0,0.6)' }}
                   onClick={() => !approveLoading && setApproveModal(null)}>
                <div className="card p-6 w-full max-w-md mx-4"
                     style={{ background: 'var(--color-bg-surface)' }}
                     onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-base font-semibold mb-1">Approve Login Request</h2>
                  <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
                    Confirm name and assign a role. The user can log in once a role is assigned.
                  </p>
                  <form onSubmit={handleApproveSubmit} className="space-y-4">
                    <div>
                      <label className="label text-xs">Email</label>
                      <input className="input text-sm" value={approveModal.email} disabled style={{ opacity: 0.6 }} />
                    </div>
                    <div>
                      <label className="label text-xs">Name</label>
                      <input className="input text-sm" value={approveForm.name}
                             onChange={(e) => setApproveForm((f) => ({ ...f, name: e.target.value }))}
                             placeholder="Full name" required />
                    </div>
                    <div>
                      <label className="label text-xs">Assign Role <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                      <select className="input select text-sm" value={approveForm.role}
                              onChange={(e) => setApproveForm((f) => ({ ...f, role: e.target.value }))}
                              required>
                        <option value="">— Select a role —</option>
                        <option value="hr">HR Manager</option>
                        <option value="interviewer">Interviewer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {approveError && <div className="alert-error text-sm">{approveError}</div>}
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="btn-primary flex-1"
                              style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                              disabled={approveLoading}>
                        {approveLoading ? 'Approving...' : 'Approve & Assign Role'}
                      </button>
                      <button type="button" className="btn-secondary px-5"
                              disabled={approveLoading}
                              onClick={() => setApproveModal(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'candidates' && (
          <div>
            <h1 className="text-xl font-bold mb-6">Candidates</h1>

            <div className="card p-4 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 p-1 rounded-lg" style={{ background: 'var(--color-bg-elevated)' }}>
                  <button className="text-xs px-3 py-1.5 rounded-md font-medium transition-all"
                          style={!appsFilters.deleted
                            ? { background: 'var(--color-bg-surface)', color: 'var(--color-primary)' }
                            : { color: 'var(--color-text-muted)' }}
                          onClick={() => setAppsFilters((f) => ({ ...f, deleted: false }))}>
                    Active
                  </button>
                  <button className="text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5"
                          style={appsFilters.deleted
                            ? { background: 'var(--color-bg-surface)', color: 'var(--color-danger)' }
                            : { color: 'var(--color-text-muted)' }}
                          onClick={() => setAppsFilters((f) => ({ ...f, deleted: true }))}>
                    🗑 Trash Bin
                  </button>
                </div>
                <div className="w-full sm:flex-1">
                  <input className="input text-sm" placeholder="Search name or email..."
                         value={appsFilters.search}
                         onChange={(e) => setAppsFilters((f) => ({ ...f, search: e.target.value }))} />
                </div>
                <select className="input select text-sm w-full sm:w-40" value={appsFilters.status}
                        onChange={(e) => setAppsFilters((f) => ({ ...f, status: e.target.value }))}>
                  <option value="">All Statuses</option>
                  <option value="applied">Applied</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="rejected">Rejected</option>
                  <option value="final_selected">Selected</option>
                  <option value="another_round">Another Round</option>
                </select>
                <select className="input select text-sm w-full sm:w-44" value={appsFilters.sort || 'latest'}
                        onChange={(e) => setAppsFilters((f) => ({ ...f, sort: e.target.value }))}>
                  <option value="latest">Sort by Latest</option>
                  <option value="oldest">Sort by Oldest</option>
                  <option value="alpha">Sort Alphabetically</option>
                </select>
                {appsFilters.deleted && applications.length > 0 && (
                  <button className="btn-secondary text-xs py-2 px-3"
                          style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                          onClick={() => setBulkConfirm({ type: 'purgeAll' })}>
                    Purge All
                  </button>
                )}
              </div>

              {appsFilters.deleted && applications.length > 0 && (
                <div className="flex items-start gap-2 mt-3 p-3 rounded-lg"
                     style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)' }}>
                  <span className="text-base leading-none" style={{ color: 'var(--color-danger)' }}>⚠</span>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-danger)' }}>
                    <strong>Caution:</strong> Purging will permanently delete all trashed applications and their interview feedback from the database. This action cannot be undone.
                  </p>
                </div>
              )}

              {selectedAppIds.size > 0 && (
                <div className="flex items-center gap-3 mt-4 pt-4 flex-wrap"
                     style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    {selectedAppIds.size} selected
                  </span>
                  {!appsFilters.deleted && (
                    <button className="btn-secondary text-xs py-1.5 px-3"
                            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                            disabled={bulkLoading}
                            onClick={() => setBulkConfirm({ type: 'bulkTrash' })}>
                      🗑 Move to Trash
                    </button>
                  )}
                  {appsFilters.deleted && (
                    <>
                      <button className="btn-secondary text-xs py-1.5 px-3"
                              style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                              disabled={bulkLoading}
                              onClick={handleBulkRestore}>
                        ↺ Restore
                      </button>
                      <button className="btn-secondary text-xs py-1.5 px-3"
                              style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                              disabled={bulkLoading}
                              onClick={() => setBulkConfirm({ type: 'bulkPurge' })}>
                        Delete Permanently
                      </button>
                    </>
                  )}
                  <button className="btn-ghost text-xs py-1.5 px-3"
                          onClick={() => setSelectedAppIds(new Set())}>
                    Clear
                  </button>
                </div>
              )}
            </div>

            {appsError && <div className="alert-error mb-4">{appsError}</div>}

            {appsLoading ? (
              <div className="py-16 text-center"><Spinner /></div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Candidate</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>AI Score</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedApps.map((app) => (
                        <tr key={app.id} onClick={() => toggleAppSelected(app.id)}
                            style={{ cursor: 'pointer', ...(selectedAppIds.has(app.id) ? { background: 'var(--color-primary-subtle)' } : {}) }}>
                          <td>
                            <input type="checkbox"
                                   checked={selectedAppIds.has(app.id)}
                                   onClick={(e) => e.stopPropagation()}
                                   onChange={() => toggleAppSelected(app.id)} />
                          </td>
                          <td>
                            <div className="text-sm font-medium">{app.full_name}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{app.email}</div>
                          </td>
                          <td className="text-sm">{app.primary_role}</td>
                          <td><StatusBadge status={app.status} /></td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {overrideApp === app.id ? (
                              <div className="flex items-center gap-2">
                                <input className="input text-xs py-1 w-20"
                                       value={overrideScore}
                                       onChange={(e) => setOverrideScore(e.target.value)}
                                       placeholder="0–100" type="number" min="0" max="100" />
                                <button className="btn-primary text-xs py-1 px-2"
                                        disabled={overrideLoading}
                                        onClick={() => handleOverrideScore(app.id)}>
                                  {overrideLoading ? '...' : 'Save'}
                                </button>
                                <button className="btn-ghost text-xs py-1 px-2"
                                        onClick={() => { setOverrideApp(null); setOverrideScore(''); }}>
                                  X
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {app.ai_score != null ? app.ai_score : '—'}
                                </span>
                                <button className="btn-ghost text-xs py-0.5 px-2"
                                        style={{ color: 'var(--color-text-muted)' }}
                                        onClick={() => { setOverrideApp(app.id); setOverrideScore(app.ai_score ?? ''); }}>
                                  Edit
                                </button>
                              </div>
                            )}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 flex-wrap">
                              {!appsFilters.deleted && (
                                <button
                                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                                  style={{ background: 'var(--color-primary)', color: '#fff', whiteSpace: 'nowrap', lineHeight: 1 }}
                                  onClick={() => setDetailApp(app)}>
                                  View More
                                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <line x1="3" y1="5" x2="17" y2="5"/><line x1="3" y1="10" x2="13" y2="10"/><line x1="3" y1="15" x2="10" y2="15"/>
                                    <polyline points="14 13 17 16 14 19" strokeWidth="2"/>
                                  </svg>
                                </button>
                              )}
                              {!appsFilters.deleted ? (
                                <button className="btn-ghost text-base py-1 px-2"
                                        title="Move to Trash"
                                        style={{ color: 'var(--color-danger)' }}
                                        onClick={() => handleSoftDelete(app.id)}>
                                  🗑
                                </button>
                              ) : (
                                <button className="btn-ghost text-xs py-1 px-2"
                                        style={{ color: 'var(--color-success)' }}
                                        onClick={() => handleRestore(app.id)}>
                                  Restore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {applications.length === 0 && (
                    <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No applications found</div>
                  )}
                </div>
                {applications.length > 0 && (
                  <Pagination page={appsPage} totalPages={appsTotalPages} totalItems={applications.length}
                              onPageChange={setAppsPage} itemLabel="applications" />
                )}
              </div>
            )}

            {detailApp && <CandidateDetailModal app={detailApp} onClose={() => setDetailApp(null)} />}

            {bulkConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center"
                   style={{ background: 'rgba(0,0,0,0.6)' }}
                   onClick={() => !bulkLoading && setBulkConfirm(null)}>
                <div className="card p-6 w-full max-w-md mx-4"
                     style={{ background: 'var(--color-bg-surface)' }}
                     onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-base font-semibold mb-2">
                    {bulkConfirm.type === 'bulkTrash' && 'Move to Trash'}
                    {bulkConfirm.type === 'bulkPurge' && 'Delete Permanently'}
                    {bulkConfirm.type === 'purgeAll' && 'Purge Entire Trash'}
                  </h2>
                  <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
                    {bulkConfirm.type === 'bulkTrash' &&
                      `Move ${selectedAppIds.size} application${selectedAppIds.size === 1 ? '' : 's'} to the trash bin? They can be restored later.`}
                    {bulkConfirm.type === 'bulkPurge' &&
                      `Permanently delete ${selectedAppIds.size} application${selectedAppIds.size === 1 ? '' : 's'} and all related interview feedback? This cannot be undone.`}
                    {bulkConfirm.type === 'purgeAll' &&
                      `Permanently delete ALL applications currently in the trash bin along with their interview feedback. This cannot be undone.`}
                  </p>
                  <div className="flex gap-3">
                    <button className="btn-primary flex-1"
                            style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                            disabled={bulkLoading}
                            onClick={() => {
                              if (bulkConfirm.type === 'bulkTrash') handleBulkTrash();
                              else if (bulkConfirm.type === 'bulkPurge') handleBulkPurge(false);
                              else if (bulkConfirm.type === 'purgeAll') handleBulkPurge(true);
                            }}>
                      {bulkLoading ? 'Processing...' : 'Confirm'}
                    </button>
                    <button className="btn-secondary px-5"
                            disabled={bulkLoading}
                            onClick={() => setBulkConfirm(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            <h1 className="text-xl font-bold mb-6">Audit Logs</h1>

            <div className="card p-4 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-full sm:flex-1">
                  <input className="input text-sm" placeholder="Search actor or target..."
                         value={auditFilters.search}
                         onChange={(e) => setAuditFilters((f) => ({ ...f, search: e.target.value }))} />
                </div>
                <select className="input select text-sm w-full sm:w-48" value={auditFilters.action}
                        onChange={(e) => setAuditFilters((f) => ({ ...f, action: e.target.value }))}>
                  <option value="">All Actions</option>
                  <option value="user_created">User Created</option>
                  <option value="user_updated">User Updated</option>
                  <option value="user_deleted">User Deleted</option>
                  <option value="user_activated">User Activated</option>
                  <option value="user_deactivated">User Deactivated</option>
                  <option value="application_deleted">Application Deleted</option>
                  <option value="application_restored">Application Restored</option>
                  <option value="bulk_application_deleted">Bulk Deleted</option>
                  <option value="bulk_application_restored">Bulk Restored</option>
                  <option value="trash_purged">Trash Purged</option>
                  <option value="ai_score_overridden">AI Score Overridden</option>
                </select>
              </div>
            </div>

            {auditLoading ? (
              <div className="py-16 text-center"><Spinner /></div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Actor</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                            {formatTime(log.created_at)}
                          </td>
                          <td>
                            <div className="text-sm font-medium">{log.actor_name}</div>
                            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{log.actor_email}</div>
                          </td>
                          <td>
                            <span className="badge text-xs"
                                  style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                              {formatAction(log.action)}
                            </span>
                          </td>
                          <td className="text-sm">
                            {log.target_name || '—'}
                            {log.target_type && (
                              <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>
                                ({log.target_type})
                              </span>
                            )}
                          </td>
                          <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {log.details || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {auditLogs.length === 0 && (
                    <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No audit logs found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
