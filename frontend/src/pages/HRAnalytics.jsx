import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHRAnalytics } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const STATUS_COLORS = {
  applied:        '#3b82f6',
  shortlisted:    '#f59e0b',
  final_selected: '#10b981',
  rejected:       '#ef4444',
  another_round:  '#6366f1',
};

const STATUS_LABELS = {
  applied:        'Applied',
  shortlisted:    'Shortlisted',
  final_selected: 'Selected',
  rejected:       'Rejected',
  another_round:  'Another Round',
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fillMonthlyData(trend, year) {
  const map = {};
  (trend || []).forEach(d => { map[d.month] = Number(d.count); });
  return Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    const key = `${year}-${m}`;
    return { month: key, count: map[key] || 0 };
  });
}

function getTimeFrame(year) {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth();
  if (year < cy) return `Jan ${year} — Dec ${year}`;
  if (year === cy) return `Jan ${year} — ${MONTH_LABELS[cm]} ${year} · ongoing`;
  return `Full year ${year} · upcoming`;
}

function buildYearOptions() {
  const current = new Date().getFullYear();
  const options = [];
  for (let y = 2025; y <= current + 1; y++) options.push(y);
  return options;
}

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48" style={{ color: 'var(--color-text-muted)' }}>
        No data for this period
      </div>
    );
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const arcs = data.map((d) => {
    const pct = d.count / total;
    const dash = pct * circumference;
    const arc = { key: d.key, dash, offset, color: STATUS_COLORS[d.key] || '#6b7280', pct };
    offset += dash;
    return arc;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
        <g transform="rotate(-90, 80, 80)">
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="24"
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </g>
        <text x="80" y="84" textAnchor="middle" fontSize="20" fontWeight="bold"
              fill="currentColor" className="text-base">
          {total}
        </text>
        <text x="80" y="100" textAnchor="middle" fontSize="10" fill="currentColor"
              style={{ opacity: 0.6 }}>
          Total
        </text>
      </svg>

      <div className="flex flex-col gap-2">
        {arcs.map((arc) => (
          <div key={arc.key} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: arc.color }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              {STATUS_LABELS[arc.key] || arc.key}
            </span>
            <span className="font-semibold ml-auto pl-4">
              {data.find(d => d.key === arc.key)?.count ?? 0}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
              ({(arc.pct * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBarChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No data.</p>;
  }
  const max = Math.max(...data.map(d => d.count), 1);
  const BAR_HEIGHT = 120;

  return (
    <div className="flex items-end justify-around gap-2" style={{ height: `${BAR_HEIGHT + 52}px` }}>
      {data.map((d) => {
        const barH = Math.max(Math.round((d.count / max) * BAR_HEIGHT), d.count > 0 ? 4 : 0);
        const color = STATUS_COLORS[d.key] || '#6b7280';
        return (
          <div key={d.key} className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold" style={{ color }}>{d.count}</span>
            <div className="w-10 rounded-t-md transition-all duration-500"
                 style={{ height: `${barH}px`, background: color }} />
            <span className="text-xs text-center" style={{ color: 'var(--color-text-subtle)', fontSize: '10px', maxWidth: '52px', lineHeight: '1.3' }}>
              {STATUS_LABELS[d.key] || d.key}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyBarChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No trend data available.</p>;
  }
  const max = Math.max(...data.map(d => d.count), 1);
  const BAR_HEIGHT = 140;
  const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#e8521a','#14b8a6','#f43f5e','#a855f7'];

  function formatMonth(m) {
    const [, month] = m.split('-');
    return MONTH_LABELS[parseInt(month, 10) - 1];
  }

  return (
    <div className="flex items-end justify-around gap-1 sm:gap-2" style={{ height: `${BAR_HEIGHT + 52}px` }}>
      {data.map((d, i) => {
        const barH = d.count > 0 ? Math.max(Math.round((d.count / max) * BAR_HEIGHT), 4) : 0;
        const isCurrentMonth = d.month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        return (
          <div key={d.month} className="flex flex-col items-center gap-1 flex-1" style={{ minWidth: '28px', maxWidth: '64px' }}>
            <span className="text-xs font-semibold" style={{ color: d.count > 0 ? 'var(--color-text-secondary)' : 'transparent' }}>
              {d.count}
            </span>
            <div className="w-full rounded-t-md transition-all duration-500"
                 style={{
                   height: `${Math.max(barH, 2)}px`,
                   background: d.count > 0 ? COLORS[i % COLORS.length] : 'var(--color-bg-elevated)',
                   opacity: d.count > 0 ? 0.9 : 0.4,
                 }} />
            <span className="text-xs text-center font-medium"
                  style={{
                    color: isCurrentMonth ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                    fontSize: '10px',
                  }}>
              {formatMonth(d.month)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RoleBars({ roles }) {
  if (!roles || roles.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No role data available.</p>;
  }
  const max = Math.max(...roles.map(r => r.count), 1);
  const colors = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];

  return (
    <div className="space-y-3">
      {roles.map((r, i) => (
        <div key={r.role}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate max-w-[60%]">{r.role}</span>
            <span className="text-sm font-bold" style={{ color: colors[i % colors.length] }}>{r.count}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
            <div className="h-full rounded-full transition-all duration-500"
                 style={{
                   width: `${(r.count / max) * 100}%`,
                   background: colors[i % colors.length],
                 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HRAnalytics() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const currentYear = new Date().getFullYear();
  const yearOptions = buildYearOptions();

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setError('');
    getHRAnalytics({ year: selectedYear })
      .then(setData)
      .catch((err) => {
        if (err.response?.status === 401) { localStorage.clear(); navigate('/hiring'); }
        else setError('Failed to load analytics.');
      })
      .finally(() => setLoading(false));
  }, [navigate, selectedYear]);

  const summary       = data?.summary || {};
  const statusDist    = data?.status_distribution || [];
  const roleDist      = (data?.role_distribution || []).slice(0, 8);
  const recentCount   = data?.recent_7_days ?? 0;
  const rawMonthly    = data?.monthly_trend || [];
  const filledMonthly = fillMonthlyData(rawMonthly, selectedYear);

  const rawDonut = statusDist.filter(s => s.status !== 'ai_rejected').map(s => ({ key: s.status, count: Number(s.count) }));
  const aiRejectedCount = Number(statusDist.find(s => s.status === 'ai_rejected')?.count ?? 0);
  const donutData = rawDonut.map(s => s.key === 'rejected' ? { ...s, count: s.count + aiRejectedCount } : s);

  const timeFrame = getTimeFrame(selectedYear);
  const totalThisYear = Number(summary.total ?? 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>

      <header className="sticky top-0 z-40"
              style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/synersys-logo.png" alt="Zentiti" style={{ height: '32px', width: 'auto' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Dashboard</span>
            <nav className="hidden sm:flex items-center gap-2 ml-6" style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
              <button onClick={() => navigate('/hr')} className="btn-secondary text-sm px-4 py-2">
                Applications
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
            <button onClick={() => { localStorage.clear(); navigate('/hiring'); }}
                    className="btn-ghost text-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="page-container">

        {/* Title + Year Picker */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {timeFrame}
              {!loading && totalThisYear > 0 && (
                <span className="ml-2 font-medium" style={{ color: 'var(--color-primary)' }}>
                  · {totalThisYear} application{totalThisYear !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Year</span>
            <select className="input select text-sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {yearOptions.map(y => (
                <option key={y} value={y}>
                  {y}{y === currentYear ? ' (current)' : y > currentYear ? ' (upcoming)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="p-16 text-center" style={{ color: 'var(--color-text-muted)' }}>
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
                 style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            Loading analytics...
          </div>
        )}

        {error && <div className="alert-error mb-6">{error}</div>}

        {!loading && data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
              <StatCard label="Total"       value={Number(summary.total ?? 0)}          onClick={() => navigate('/hr', { state: { statusFilter: '' } })} />
              <StatCard label="Applied"     value={Number(summary.applied ?? 0)}        color="#3b82f6" onClick={() => navigate('/hr', { state: { statusFilter: 'applied' } })} />
              <StatCard label="Shortlisted" value={Number(summary.shortlisted ?? 0)}    color="#f59e0b" onClick={() => navigate('/hr', { state: { statusFilter: 'shortlisted' } })} />
              <StatCard label="Selected"    value={Number(summary.final_selected ?? 0)} color="#10b981" onClick={() => navigate('/hr', { state: { statusFilter: 'final_selected' } })} />
              <StatCard label="Rejected"    value={Number(summary.rejected ?? 0)}       color="#ef4444" onClick={() => navigate('/hr', { state: { statusFilter: 'rejected' } })} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              <div className="card p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide mb-5"
                    style={{ color: 'var(--color-text-muted)' }}>
                  Status Distribution
                </h2>
                <DonutChart data={donutData} />
              </div>

              <div className="card p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide mb-5"
                    style={{ color: 'var(--color-text-muted)' }}>
                  Status Breakdown
                </h2>
                <StatusBarChart data={donutData} />
              </div>
            </div>

            {/* Monthly trend — shows all 12 months of selected year */}
            <div className="card p-6 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--color-text-muted)' }}>
                    Monthly Applications — {selectedYear}
                  </h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>{timeFrame}</p>
                </div>
                <div className="flex items-center gap-4">
                  {selectedYear === currentYear && (
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                      {recentCount} in last 7 days
                    </span>
                  )}
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    {filledMonthly.reduce((s, d) => s + d.count, 0)} total
                  </span>
                </div>
              </div>
              <MonthlyBarChart data={filledMonthly} />
            </div>

            {/* Role Distribution */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-5"
                  style={{ color: 'var(--color-text-muted)' }}>
                Role Distribution (Top 8) — {selectedYear}
              </h2>
              <RoleBars roles={roleDist} />
            </div>
          </>
        )}

        {!loading && data && Number(summary.total ?? 0) === 0 && (
          <div className="card p-12 text-center mt-6">
            <div className="text-4xl mb-3">📊</div>
            <p className="font-medium text-sm">No applications in {selectedYear}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
              Try selecting a different year
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

function StatCard({ label, value, color, onClick }) {
  return (
    <div className="card p-4 cursor-pointer transition-all select-none hover:opacity-80"
         onClick={onClick}
         title={`View ${label} applications`}>
      <div className="text-2xl font-bold underline-offset-2 hover:underline"
           style={{ color: color || 'inherit' }}>{value ?? 0}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('hr_user') || 'null'); } catch { return null; }
}
