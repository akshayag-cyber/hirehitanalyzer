import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInterviewerApplications } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import Pagination, { PAGE_SIZE } from '../components/Pagination';

const ALL_DOMAINS = [
  'Software Engineering', 'Data Science', 'Cloud & DevOps',
  'IT', 'Product Management', 'Marketing & Growth', 'Finance',
  'HR', 'Design (UI/UX)', 'Sales',
  'Operations', 'Customer Success',
];

export default function InterviewerApplications() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [applications, setApplications] = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [filters, setFilters]           = useState({ search: '', status: 'shortlisted', sort: 'latest' });
  const [colFilters, setColFilters]     = useState({ domain: '', minExp: '' });
  const [domainOpen, setDomainOpen]     = useState(false);
  const [page, setPage]                 = useState(1);
  const domainRef                       = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInterviewerApplications({ search: filters.search, status: filters.status, sort: filters.sort });
      setApplications(data.applications);
      setStats(data.stats);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/hiring'); }
    } finally {
      setLoading(false);
    }
  }, [filters, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filters.search, filters.status, filters.sort, colFilters.domain, colFilters.minExp]);

  useEffect(() => {
    if (!domainOpen) return;
    function handler(e) {
      if (domainRef.current && !domainRef.current.contains(e.target)) setDomainOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [domainOpen]);

  const filteredApps = applications.filter(app => {
    if (colFilters.domain) {
      const primary = app.primary_role?.trim() ?? '';
      let allDomains = [primary];
      try { allDomains = allDomains.concat(JSON.parse(app.preferred_domains || '[]')); } catch {}
      if (!allDomains.some(d => d.trim() === colFilters.domain)) return false;
    }
    if (colFilters.minExp !== '' && (app.years_of_experience ?? 0) < Number(colFilters.minExp)) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredApps.length / PAGE_SIZE);
  const pagedApps  = filteredApps.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
                Applications
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

        {/* Stats — clickable to filter */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            <StatCard label="Total"            value={stats.total}            active={filters.status === ''}             onClick={() => setFilters(f => ({ ...f, status: '' }))} />
            <StatCard label="Shortlisted"      value={stats.shortlisted}      color="var(--color-warning)" active={filters.status === 'shortlisted'}    onClick={() => setFilters(f => ({ ...f, status: 'shortlisted' }))} />
            <StatCard label="Under Evaluation" value={stats.under_evaluation} color="var(--color-info)"    active={filters.status === 'another_round'} onClick={() => setFilters(f => ({ ...f, status: 'another_round' }))} />
            <StatCard label="Rejected"         value={stats.rejected}         color="var(--color-danger)"  active={filters.status === 'rejected'}       onClick={() => setFilters(f => ({ ...f, status: 'rejected' }))} />
            <StatCard label="Selected"         value={stats.selected}         color="var(--color-success)" active={filters.status === 'final_selected'} onClick={() => setFilters(f => ({ ...f, status: 'final_selected' }))} />
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
            <select className="input select text-sm w-full sm:w-48"
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="" disabled hidden>Filter by Status</option>
              <option value="">All Candidates</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="another_round">Under Evaluation</option>
              <option value="rejected">Rejected</option>
              <option value="final_selected">Selected</option>
            </select>
            <select className="input select text-sm w-full sm:w-44"
                    value={filters.sort}
                    onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}>
              <option value="latest">Sort by Latest</option>
              <option value="oldest">Sort by Oldest</option>
              <option value="alpha">Sort Alphabetically</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-16 text-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
                   style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
              Loading candidates...
            </div>
          ) : applications.length === 0 ? (
            <div className="p-16 text-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium">No candidates found</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>
                {filters.search || filters.status ? 'Try adjusting your filters' : 'No candidates available for evaluation'}
              </p>
            </div>
          ) : (
            <>
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
                    <th>Interview Decision</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-16 text-center" style={{ color: 'var(--color-text-muted)' }}>
                        <div className="text-4xl mb-3">🔍</div>
                        <p className="font-medium text-sm">No candidates match this filter</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>Clear the domain or experience filter to see all results</p>
                      </td>
                    </tr>
                  )}
                  {pagedApps.map((app) => (
                    <tr key={app.id}
                        onClick={() => navigate(`/interviewer/candidate/${app.id}`)}
                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td>
                        <div className="font-medium">{app.full_name}</div>
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
                          <span className="text-xs px-2 py-0.5 rounded"
                                style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-subtle)' }}>
                            Not scored
                          </span>
                        )}
                      </td>
                      <td><StatusBadge status={app.status} /></td>
                      <td><DecisionBadge decision={app.feedback_decision} /></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/interviewer/candidate/${app.id}`)}
                                className="btn-secondary text-xs px-3 py-1.5">
                          Evaluate →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredApps.length > 0 && (
              <Pagination page={page} totalPages={totalPages} totalItems={filteredApps.length}
                          onPageChange={setPage} itemLabel="candidates" />
            )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

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

function getMatchCategory(score) {
  if (score >= 70) return { label: 'Strong Match', color: 'var(--color-success)', bg: 'rgba(34,197,94,0.12)' };
  if (score >= 45) return { label: 'Average Match', color: 'var(--color-warning)', bg: 'rgba(234,179,8,0.12)' };
  return { label: 'Weak Match', color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.12)' };
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('hr_user') || 'null'); } catch { return null; }
}
