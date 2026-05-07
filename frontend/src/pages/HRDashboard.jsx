import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHRApplications, assignMultipleInterviewers, getHRProfile, getUnviewedApplicationsCount } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import UnviewedBanner from '../components/UnviewedBanner';
import Pagination, { PAGE_SIZE } from '../components/Pagination';

const ALL_DOMAINS = [
  'Software Engineering', 'Data Science', 'Cloud & DevOps',
  'IT', 'Product Management', 'Marketing & Growth', 'Finance',
  'HR', 'Design (UI/UX)', 'Sales',
  'Operations', 'Customer Success',
];


export default function HRDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const [applications, setApplications] = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [filters, setFilters]           = useState({
    search: '', status: location.state?.statusFilter ?? 'applied', sort: 'newest',
  });
  const [assigning, setAssigning]       = useState({});
  const [profileOpen, setProfileOpen]   = useState(false);
  const [profileData, setProfileData]   = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [colFilters, setColFilters]     = useState({ domain: '', minExp: '' });
  const [domainOpen, setDomainOpen]     = useState(false);
  const [page, setPage]                 = useState(1);
  const [myAppIds, setMyAppIds]         = useState(null); // null = no filter; Set of app ids = "only apps I handled"
  const [myAppLabel, setMyAppLabel]     = useState('');
  const [unviewedCount, setUnviewedCount] = useState(0);
  const domainRef                       = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHRApplications(filters);
      setApplications(data.applications);
      setStats(data.stats);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/hiring'); }
    } finally {
      setLoading(false);
    }
  }, [filters, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    async function checkUnviewed() {
      try {
        const count = await getUnviewedApplicationsCount();
        setUnviewedCount(count);
      } catch (err) {
        console.error('Error fetching unviewed count:', err);
      }
    }
    checkUnviewed();
  }, []);

  useEffect(() => {
    if (!domainOpen) return;
    function handler(e) {
      if (domainRef.current && !domainRef.current.contains(e.target)) setDomainOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [domainOpen]);

  const displayedApps = applications.filter(app => {
    if (myAppIds && !myAppIds.has(app.id)) return false;
    if (colFilters.domain && app.primary_role !== colFilters.domain) return false;
    if (colFilters.minExp !== '' && (app.years_of_experience ?? 0) < Number(colFilters.minExp)) return false;
    return true;
  });

  useEffect(() => { setPage(1); }, [filters.search, filters.status, filters.sort, colFilters.domain, colFilters.minExp, myAppIds]);

  const totalPages = Math.ceil(displayedApps.length / PAGE_SIZE);
  const pagedApps  = displayedApps.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleAssign(appId, value) {
    setAssigning((a) => ({ ...a, [appId]: true }));
    try {
      const interviewers = value ? [value] : [];
      await assignMultipleInterviewers(appId, interviewers);
      const assignedArr = value ? JSON.stringify([value]) : null;
      setApplications((prev) => prev.map((a) =>
        a.id === appId ? { ...a, assigned_interviewer: value || null, assigned_interviewers: assignedArr } : a
      ));
    } catch (err) {
      console.error('Assign error:', err);
    } finally {
      setAssigning((a) => ({ ...a, [appId]: false }));
    }
  }

  async function openProfile() {
    setProfileOpen(true);
    if (profileData) return;
    setProfileLoading(true);
    try {
      const data = await getHRProfile();
      setProfileData(data);
    } catch (_) {}
    finally { setProfileLoading(false); }
  }

  function drillDown(status) {
    setFilters((f) => ({ ...f, status }));
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>

      {/* Header */}
      <header className="sticky top-0 z-40"
              style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/synersys-logo.png" alt="Synersys" style={{ height: '32px', width: 'auto' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Applications</span>
            <nav className="hidden sm:flex items-center gap-2 ml-6" style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
              <button onClick={() => navigate('/hr/analytics')} className="btn-secondary text-sm px-4 py-2">
                Dashboard
              </button>
              <button onClick={() => navigate('/hr/match')} className="btn-secondary text-sm px-4 py-2">
                HireFit Analyzer
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
              {user?.name}
            </span>
            <ThemeToggle />
            <button onClick={openProfile} className="btn-ghost p-2" title="My Profile">
              <PersonIcon />
            </button>
            <button onClick={() => { localStorage.clear(); navigate('/hiring'); }}
                    className="btn-ghost text-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      <UnviewedBanner count={unviewedCount} />

      <div className="page-container">

        {/* Stats — clickable to drill down */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            <StatCard label="Total"       value={stats.total}                        active={filters.status === ''} onClick={() => drillDown('')} />
            <StatCard label="Applied"     value={stats.applied}     color="var(--color-info)"    active={filters.status === 'applied'}        onClick={() => drillDown('applied')} />
            <StatCard label="Shortlisted" value={stats.shortlisted} color="var(--color-warning)" active={filters.status === 'shortlisted'}    onClick={() => drillDown('shortlisted')} />
            <StatCard label="Rejected"    value={stats.rejected}    color="var(--color-danger)"  active={filters.status === 'rejected'}       onClick={() => drillDown('rejected')} />
            <StatCard label="Selected"    value={stats.final_selected ?? stats.analyzed} color="var(--color-success)" active={filters.status === 'final_selected'} onClick={() => drillDown('final_selected')} />
          </div>
        )}

        {/* My-apps active filter banner */}
        {myAppIds && (
          <div className="flex items-center justify-between mb-4 p-3 rounded-lg"
               style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
              Showing {myAppLabel || 'applications'} you processed ({myAppIds.size})
            </span>
            <button className="text-xs font-semibold px-2 py-1 rounded"
                    style={{ background: 'var(--color-bg-surface)', color: 'var(--color-primary)' }}
                    onClick={() => { setMyAppIds(null); setMyAppLabel(''); }}>
              Clear filter
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="card p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:flex-1">
              <input className="input text-sm" placeholder="Search by name, email or role..."
                     value={filters.search}
                     onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
            </div>
            <select className="input select text-sm w-full sm:w-44"
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="applied">Applied</option>
              <option value="">All Applications</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
              <option value="final_selected">Selected</option>
            </select>
            <select className="input select text-sm w-full sm:w-44"
                    value={filters.sort}
                    onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}>
              <option value="newest">Sort by Latest</option>
              <option value="oldest">Sort by Oldest</option>
              <option value="name_asc">Sort Alphabetically</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-16 text-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
                   style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
              Loading applications...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>Domain</span>
                        <div ref={domainRef} className="relative inline-block">
                          <button
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                            style={{
                              background: colFilters.domain ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)',
                              color: colFilters.domain ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                              border: `1px solid ${colFilters.domain ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            }}
                            onClick={() => setDomainOpen(o => !o)}>
                            <span className="max-w-[80px] truncate">{colFilters.domain || 'All'}</span>
                            <span style={{ fontSize: '8px' }}>▼</span>
                          </button>
                          {domainOpen && (
                            <div className="absolute top-full left-0 z-50 mt-1 rounded-lg shadow-lg overflow-y-auto"
                                 style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', minWidth: '180px', maxHeight: '240px' }}>
                              {['', ...ALL_DOMAINS].map(d => (
                                <button key={d || '__all'} className="w-full text-left text-xs px-3 py-2 transition-colors"
                                        style={{
                                          background: colFilters.domain === d ? 'var(--color-primary-subtle)' : 'transparent',
                                          color: colFilters.domain === d ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                        }}
                                        onMouseEnter={e => { if (colFilters.domain !== d) e.currentTarget.style.background = 'var(--color-bg-elevated)'; }}
                                        onMouseLeave={e => { if (colFilters.domain !== d) e.currentTarget.style.background = 'transparent'; }}
                                        onClick={() => { setColFilters(f => ({ ...f, domain: d })); setDomainOpen(false); }}>
                                  {d || 'All Domains'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                    <th>
                      <div className="flex items-center gap-2">
                        <span>Experience</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>≥</span>
                        <input
                          type="number" min="0" max="50" placeholder="yrs"
                          value={colFilters.minExp}
                          onChange={e => setColFilters(f => ({ ...f, minExp: e.target.value }))}
                          className="text-xs rounded px-1 py-0.5"
                          style={{
                            width: '44px',
                            background: 'var(--color-bg-elevated)',
                            border: `1px solid ${colFilters.minExp ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            color: 'var(--color-text-muted)',
                            outline: 'none',
                          }} />
                        {colFilters.minExp !== '' && (
                          <button className="text-xs font-bold leading-none"
                                  style={{ color: 'var(--color-text-subtle)' }}
                                  onClick={() => setColFilters(f => ({ ...f, minExp: '' }))}>×</button>
                        )}
                      </div>
                    </th>
                    <th>Match</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedApps.map((app) => (
                    <tr key={app.id}
                        onClick={() => navigate(`/hr/candidate/${app.id}`)}
                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td>
                        <div className="text-sm font-medium">{app.full_name}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{app.email}</div>
                      </td>
                      <td className="text-sm">{app.primary_role}</td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {(app.years_of_experience != null && app.years_of_experience !== '') ? `${app.years_of_experience} yrs` : '0 yrs'}
                      </td>
                      <td>
                        {app.ai_score != null ? (() => {
                          const cat = getMatchCategory(app.ai_score);
                          return (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.color}` }}>
                              {cat.label}
                            </span>
                          );
                        })() : (
                          <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>—</span>
                        )}
                      </td>
                      <td><StatusBadge status={app.status} /></td>
                      <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/hr/candidate/${app.id}`)}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                                style={{
                                  background: 'var(--color-primary-subtle)',
                                  color: 'var(--color-primary)',
                                  border: '1px solid var(--color-primary)',
                                }}>
                          View
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {displayedApps.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-16 text-center" style={{ color: 'var(--color-text-muted)' }}>
                        {applications.length === 0 ? (
                          <>
                            <div className="text-4xl mb-3">📭</div>
                            <p className="font-medium text-sm">No applications found</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>Try adjusting your filters</p>
                          </>
                        ) : (
                          <>
                            <div className="text-4xl mb-3">🔍</div>
                            <p className="font-medium text-sm">No applications match this filter</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>Clear the domain or experience filter to see all results</p>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading && displayedApps.length > 0 && (
            <Pagination page={page} totalPages={totalPages} totalItems={displayedApps.length}
                        onPageChange={setPage} itemLabel="applications" />
          )}
        </div>

      </div>

      {/* Profile panel */}
      {profileOpen && (
        <ProfilePanel
          onClose={() => setProfileOpen(false)}
          loading={profileLoading}
          data={profileData}
          role="HR Manager"
          onOpenApp={(id) => { setProfileOpen(false); navigate(`/hr/candidate/${id}`); }}
          onFilterMyApps={(ids, status, label) => {
            setProfileOpen(false);
            setMyAppIds(new Set(ids));
            setMyAppLabel(label || '');
            setFilters((f) => ({ ...f, status: status ?? '' }));
          }} />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, active, onClick }) {
  return (
    <div className="card p-4 cursor-pointer transition-all select-none"
         onClick={onClick}
         style={{
           outline: active ? `2px solid ${color || 'var(--color-primary)'}` : 'none',
           outlineOffset: '-2px',
         }}>
      <div className="text-2xl font-bold" style={{ color: color || 'inherit' }}>{value ?? 0}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    applied:        'badge-applied',
    shortlisted:    'badge-shortlisted',
    rejected:       'badge-rejected',
    final_selected: 'badge-final_selected',
    another_round:  'badge-another_round',
    ai_rejected:    'badge-rejected',
  };
  const labels = {
    applied:        'Applied',
    shortlisted:    'Shortlisted',
    rejected:       'Rejected',
    final_selected: 'Selected',
    another_round:  'Another Round',
    ai_rejected:    'Rejected',
  };
  return <span className={`text-xs ${map[status] || 'badge'}`}>{labels[status] || status}</span>;
}

function getMatchCategory(score) {
  if (score >= 70) return { label: 'Strong',  color: 'var(--color-success)', bg: 'rgba(34,197,94,0.12)' };
  if (score >= 45) return { label: 'Average', color: 'var(--color-warning)', bg: 'rgba(234,179,8,0.12)' };
  return { label: 'Weak', color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.12)' };
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

function ProfilePanel({ onClose, loading, data, role, onOpenApp, onFilterMyApps }) {
  const user = data?.user;
  const apps = data?.processedApps || data?.assignedApps || [];
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  const shortlistedApps = apps.filter((a) => a.status === 'shortlisted');
  const selectedApps    = apps.filter((a) => a.status === 'final_selected');

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col"
           style={{ width: '340px', background: 'var(--color-bg-surface)', borderLeft: '1px solid var(--color-border)', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }}>

        {/* Header */}
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
              {/* Avatar + info */}
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

              {/* Stats — clickable, filter dashboard to this HR's processed apps */}
              <div className="grid grid-cols-3 gap-2">
                <button type="button" className="p-3 rounded-xl text-center transition-all hover:shadow-md"
                        style={{ background: 'var(--color-bg-elevated)', cursor: onFilterMyApps ? 'pointer' : 'default' }}
                        onClick={() => onFilterMyApps && onFilterMyApps(apps.map((a) => a.id), '', 'applications')}>
                  <p className="text-xl font-bold">{apps.length}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Applications Handled</p>
                </button>
                <button type="button" className="p-3 rounded-xl text-center transition-all hover:shadow-md"
                        style={{ background: 'var(--color-bg-elevated)', cursor: onFilterMyApps ? 'pointer' : 'default' }}
                        onClick={() => onFilterMyApps && onFilterMyApps(shortlistedApps.map((a) => a.id), 'shortlisted', 'shortlisted applications')}>
                  <p className="text-xl font-bold" style={{ color: 'var(--color-warning)' }}>{shortlistedApps.length}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Shortlisted</p>
                </button>
                <button type="button" className="p-3 rounded-xl text-center transition-all hover:shadow-md"
                        style={{ background: 'var(--color-bg-elevated)', cursor: onFilterMyApps ? 'pointer' : 'default' }}
                        onClick={() => onFilterMyApps && onFilterMyApps(selectedApps.map((a) => a.id), 'final_selected', 'selected candidates')}>
                  <p className="text-xl font-bold" style={{ color: 'var(--color-success)' }}>{selectedApps.length}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Selected</p>
                </button>
              </div>

              {/* Application list */}
              <div>
                <p className="text-xs font-semibold mb-3 uppercase tracking-wide"
                   style={{ color: 'var(--color-text-subtle)' }}>Recent Activity</p>
                {apps.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No applications yet</p>
                ) : (
                  <div className="space-y-2">
                    {apps.map((a) => (
                      <button key={a.id} type="button"
                              className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg transition-all text-left hover:shadow-md"
                              style={{ background: 'var(--color-bg-elevated)', cursor: onOpenApp ? 'pointer' : 'default' }}
                              onClick={() => onOpenApp && onOpenApp(a.id)}>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--color-primary)' }}>{a.full_name}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{a.primary_role}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: 'var(--color-bg-page)', color: 'var(--color-text-muted)' }}>
                          {STATUS_LABELS[a.status] || a.status}
                        </span>
                      </button>
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
