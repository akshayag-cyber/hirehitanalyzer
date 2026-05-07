import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInterviewerApplications, getInterviewerProfile } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function InterviewerDashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [applications, setApplications] = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [filters, setFilters]           = useState({ search: '', status: '' });
  const [profileOpen, setProfileOpen]   = useState(false);
  const [profileData, setProfileData]   = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInterviewerApplications({ search: filters.search, status: filters.status });
      setApplications(data.applications);
      setStats(data.stats);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/hiring'); }
    } finally {
      setLoading(false);
    }
  }, [filters, navigate]);

  useEffect(() => { load(); }, [load]);

  async function openProfile() {
    setProfileOpen(true);
    if (profileData) return;
    setProfileLoading(true);
    try { const data = await getInterviewerProfile(); setProfileData(data); }
    catch (_) {} finally { setProfileLoading(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>

      {/* Header */}
      <header className="sticky top-0 z-40"
              style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center">
              <img src="/synersys-logo.png" alt="Zentiti" style={{ height: '32px', width: 'auto' }} />
            </div>
            <nav className="hidden sm:flex items-center gap-1">
              <span className="text-sm px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                Interview Queue
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
              {user?.name}
            </span>
            <ThemeToggle />
            <button onClick={() => { localStorage.clear(); navigate('/hiring'); }}
                    className="btn-ghost text-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="page-container">

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Interview Queue</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Shortlisted candidates awaiting interview evaluation.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            <StatCard label="Total"            value={stats.total} />
            <StatCard label="Shortlisted"      value={stats.shortlisted}      color="var(--color-warning)" />
            <StatCard label="Under Evaluation" value={stats.under_evaluation} color="var(--color-info)" />
            <StatCard label="Rejected"         value={stats.rejected}         color="var(--color-danger)" />
            <StatCard label="Selected"         value={stats.selected}         color="var(--color-success)" />
          </div>
        )}

        {/* Quick Action Card */}
        <div className="card p-6 mt-8">
          <h2 className="text-lg font-semibold mb-4">Next Steps</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Review detailed candidate information and provide interview feedback in the Applications section.
          </p>
          <button onClick={() => navigate('/interviewer/applications')}
                  className="btn-primary">
            View Applications & Evaluate Candidates →
          </button>
        </div>

      </div>

      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} loading={profileLoading} data={profileData} role="Interviewer" />}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold" style={{ color: color || 'inherit' }}>{value ?? 0}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    shortlisted:    'badge-shortlisted',
    rejected:       'badge-rejected',
    final_selected: 'badge-final_selected',
    another_round:  'badge-another_round',
  };
  const labels = {
    shortlisted:    'Shortlisted',
    rejected:       'Rejected',
    final_selected: 'Selected',
    another_round:  'Another Round',
  };
  return <span className={map[status] || 'badge'}>{labels[status] || status}</span>;
}

function DecisionBadge({ decision }) {
  if (!decision) {
    return <span className="badge" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-subtle)' }}>Pending</span>;
  }
  const styles = {
    proceed:       { cls: 'badge-final_selected', label: 'Proceed' },
    reject:        { cls: 'badge-rejected',        label: 'Rejected' },
    another_round: { cls: 'badge-another_round',   label: 'Another Round' },
  };
  const s = styles[decision] || { cls: 'badge', label: decision };
  return <span className={s.cls}>{s.label}</span>;
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('hr_user') || 'null'); } catch { return null; }
}

function PersonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  );
}

const STATUS_LABELS = {
  applied: 'Applied', shortlisted: 'Shortlisted', rejected: 'Rejected',
  final_selected: 'Selected', another_round: 'Another Round', ai_rejected: 'AI Rejected',
};

function ProfilePanel({ onClose, loading, data, role }) {
  const user = data?.user;
  const apps = data?.processedApps || data?.assignedApps || [];
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col"
           style={{ width: '340px', background: 'var(--color-bg-surface)', borderLeft: '1px solid var(--color-border)', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: '1px solid var(--color-border)' }}>
          <span className="text-sm font-semibold">My Profile</span>
          <button onClick={onClose} className="btn-ghost p-1.5" style={{ lineHeight: 1 }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto"
                   style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                     style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{user?.name || '—'}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{user?.email || '—'}</p>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                    {user?.role || role}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl text-center" style={{ background: 'var(--color-bg-elevated)' }}>
                  <p className="text-xl font-bold">{apps.length}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Applications Handled</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: 'var(--color-bg-elevated)' }}>
                  <p className="text-xl font-bold">
                    {apps.filter(a => a.status === 'shortlisted' || a.status === 'final_selected').length}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Shortlisted / Selected</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-3 uppercase tracking-wide"
                   style={{ color: 'var(--color-text-subtle)' }}>Recent Activity</p>
                {apps.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No applications yet</p>
                ) : (
                  <div className="space-y-2">
                    {apps.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg"
                           style={{ background: 'var(--color-bg-elevated)' }}>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{a.full_name}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{a.primary_role}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: 'var(--color-bg-page)', color: 'var(--color-text-muted)' }}>
                          {STATUS_LABELS[a.status] || a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
