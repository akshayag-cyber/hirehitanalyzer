import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchJobDescription, updateApplicationStatus, getMatchHistory, saveMatchHistory, clearMatchHistory } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const DOMAINS = [
  'Software Engineering', 'Data Science', 'Cloud & DevOps',
  'IT', 'Product Management', 'Marketing & Growth', 'Finance',
  'HR', 'Design (UI/UX)', 'Sales',
  'Operations', 'Customer Success', 'Business Development',
  'US Staffing', 'Talent Acquisition', 'Technical Support',
];

const STATUS_LABELS = {
  applied:        'Applied',
  shortlisted:    'Shortlisted',
  rejected:       'Rejected',
  final_selected: 'Selected',
  another_round:  'Another Round',
  ai_rejected:    'AI Rejected',
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '—';
}

function getMatchCategory(score) {
  if (score >= 70) return { label: 'Strong Match', color: 'var(--color-success)', bg: 'rgba(34,197,94,0.12)' };
  if (score >= 45) return { label: 'Average Match', color: 'var(--color-warning)', bg: 'rgba(234,179,8,0.12)' };
  return { label: 'Weak Match', color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.12)' };
}

// ── Module-level store — survives component unmount / navigation ──────────────
// When a match is in flight and the user navigates away, the Promise keeps
// running. On return the component subscribes to the same in-flight call
// via _store.onResult and immediately shows the spinner.
const _store = {
  loading:  false,          // is a match call currently in flight?
  onResult: null,           // callback set by the mounted component
};

export default function HRResumeMatch() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const mountedRef = useRef(false);

  // ── State (initialise from localStorage so results survive navigation) ──
  const [jd, setJd]             = useState(() => localStorage.getItem('hirefit_jd') || '');
  const [selectedRole, setSelectedRole] = useState(() => localStorage.getItem('hirefit_role') || '');
  const [loading, setLoading]   = useState(_store.loading); // sync with in-flight state
  const [results, setResults]   = useState(() => { try { return JSON.parse(localStorage.getItem('hirefit_results') || 'null'); } catch { return null; } });
  const [error, setError]       = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [shortlisting, setShortlisting] = useState({});
  const [shortlisted, setShortlisted]   = useState(() => { try { return JSON.parse(localStorage.getItem('hirefit_shortlisted') || '{}'); } catch { return {}; } });
  const [aiPanel, setAiPanel]           = useState(false);
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [matchHistory, setMatchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [saveInProgress, setSaveInProgress] = useState(false);

  // ── Subscribe to in-flight match on mount ────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (_store.loading) {
      // A match was already running when user navigated away — subscribe so
      // when it finishes the component updates correctly.
      _store.onResult = (matched, err) => {
        if (!mountedRef.current) return;
        if (err) {
          setError(err);
          setLoading(false);
        } else {
          setResults(matched);
          setLoading(false);
        }
        _store.loading  = false;
        _store.onResult = null;
      };
    }
    return () => {
      mountedRef.current = false;
      // Don't clear onResult here — let the in-flight call fire it
      // (mountedRef check inside the callback keeps it safe).
    };
  }, []);

  // ── Persist search state across navigation ───────────────────────────────
  useEffect(() => {
    if (results !== null) {
      localStorage.setItem('hirefit_results',    JSON.stringify(results));
      localStorage.setItem('hirefit_shortlisted', JSON.stringify(shortlisted));
    }
    localStorage.setItem('hirefit_jd',   jd);
    localStorage.setItem('hirefit_role', selectedRole);
  }, [results, jd, selectedRole, shortlisted]);

  // ── Load match history ───────────────────────────────────────────────────
  useEffect(() => { loadMatchHistory(); }, []);

  async function loadMatchHistory() {
    try {
      setHistoryLoading(true);
      const data = await getMatchHistory();
      setMatchHistory(data.history || []);
    } catch (err) {
      console.error('Failed to load match history:', err);
      setMatchHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function saveToHistory(role, matchResults, jobDescription) {
    if (!role || !jobDescription || !matchResults.length) return;
    setSaveInProgress(true);
    setError('');
    setSuccessMessage('');
    try {
      await saveMatchHistory(role, jobDescription, matchResults);
      setSuccessMessage(`✓ Saved "${role}" match history with ${matchResults.length} candidate(s)`);
      await loadMatchHistory();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to save match history: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaveInProgress(false);
    }
  }

  // ── Duplicate detection ──────────────────────────────────────────────────
  function findDuplicate(role, jdText) {
    const normalised = jdText.trim();
    return matchHistory.find(
      (entry) => entry.role === role && entry.jdFull?.trim() === normalised
    ) || null;
  }

  async function handleMatch() {
    if (!selectedRole)          { setError('Please select a domain.'); return; }
    if (!jd.trim())             { setError('Please enter a job description.'); return; }
    if (jd.trim().length < 50)  { setError('Job description must be at least 50 characters.'); return; }
    if (jd.trim().length > 1000){ setError('Job description must not exceed 1000 characters.'); return; }

    // ── Duplicate check ──────────────────────────────────────────────────
    const dup = findDuplicate(selectedRole, jd);
    if (dup) {
      setDuplicateWarning(
        `AI match already available for "${selectedRole}" with this exact job description (run on ${dup.date} ${dup.time}). Please refer to AI History.`
      );
      setError('');
      return;
    }
    setDuplicateWarning('');
    setError('');
    setSuccessMessage('');
    setResults(null);
    setShortlisted({});

    // ── Mark in-flight globally ──────────────────────────────────────────
    _store.loading = true;
    setLoading(true);

    // Capture values at call-time so they're available even if component unmounts
    const capturedJd   = jd;
    const capturedRole = selectedRole;

    const runMatch = async () => {
      try {
        const data    = await matchJobDescription(capturedJd, capturedRole);
        const matched = (data.results || []).filter(r => r.match_score > 0);

        // Persist results so they're available on remount
        localStorage.setItem('hirefit_results', JSON.stringify(matched));
        localStorage.setItem('hirefit_jd',      capturedJd);
        localStorage.setItem('hirefit_role',    capturedRole);

        // Notify mounted component (if any)
        if (_store.onResult) {
          _store.onResult(matched, null);
        } else {
          // Component is not currently mounted — results are in localStorage;
          // they'll be picked up on next mount.
          _store.loading = false;
        }

        // Save to DB (fire and forget — component may or may not be mounted)
        try {
          await saveMatchHistory(capturedRole, capturedJd, matched);
          await loadMatchHistory();
        } catch {}

      } catch (err) {
        const msg = err.response?.data?.error || 'Matching failed. Please try again.';
        localStorage.removeItem('hirefit_results');
        if (_store.onResult) {
          _store.onResult(null, msg);
        } else {
          _store.loading = false;
        }
      }
    };

    // Set onResult for the currently mounted component
    _store.onResult = (matched, err) => {
      if (!mountedRef.current) return;
      if (err) {
        setError(err);
      } else {
        setResults(matched);
        saveToHistory(capturedRole, matched, capturedJd);
      }
      setLoading(false);
      _store.loading  = false;
      _store.onResult = null;
    };

    runMatch();
  }

  async function handleShortlist(appId) {
    setShortlisting((s) => ({ ...s, [appId]: true }));
    try {
      await updateApplicationStatus(appId, 'shortlisted');
      setShortlisted((s) => ({ ...s, [appId]: true }));
      setResults((prev) => prev.map((r) =>
        r.application_id === appId ? { ...r, status: 'shortlisted' } : r
      ));
    } catch (err) {
      console.error('Shortlist error:', err);
    } finally {
      setShortlisting((s) => ({ ...s, [appId]: false }));
    }
  }

  function handleNewSearch() {
    setResults(null);
    setJd('');
    setSelectedRole('');
    setShortlisted({});
    setDuplicateWarning('');
    setError('');
    localStorage.removeItem('hirefit_results');
    localStorage.removeItem('hirefit_jd');
    localStorage.removeItem('hirefit_role');
    localStorage.removeItem('hirefit_shortlisted');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>

      {/* Header */}
      <header className="sticky top-0 z-40"
              style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/synersys-logo.png" alt="Zentiti" style={{ height: '32px', width: 'auto' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>HireFit Analyzer</span>
            <nav className="hidden sm:flex items-center gap-2 ml-6" style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
              <button onClick={() => navigate('/hr/analytics')} className="btn-secondary text-sm px-4 py-2">
                Dashboard
              </button>
              <button onClick={() => navigate('/hr')} className="btn-secondary text-sm px-4 py-2">
                Applications
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

      <div className="page-container max-w-5xl mx-auto">

        {/* Title */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">HireFit Analyzer</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Select a role, paste a job description, and AI will rank all candidates by match score.
            </p>
          </div>
          <button onClick={() => setAiPanel(true)}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-2 flex-shrink-0">
            ✦ AI History
            {matchHistory.length > 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/20">
                {matchHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* JD Input */}
        <div className="card p-6 mb-6">
          <label className="label font-semibold text-base">Domain</label>
          <select value={selectedRole} onChange={(e) => { setSelectedRole(e.target.value); setDuplicateWarning(''); }} className="input select mb-4">
            <option value="" disabled hidden>— Select a domain to match —</option>
            {DOMAINS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <div className="flex items-baseline justify-between">
            <label className="label font-semibold text-base">Job Description</label>
            <span className="text-xs"
                  style={{ color: jd.length > 1000 ? 'var(--color-danger)' : jd.length >= 50 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              {jd.length} / 1000
            </span>
          </div>
          <textarea value={jd}
                    onChange={(e) => { setJd(e.target.value.slice(0, 1000)); setError(''); setDuplicateWarning(''); }}
                    rows={10} className="input resize-none mt-2 text-sm leading-relaxed"
                    placeholder="Paste the full job description here — role overview, responsibilities, technical requirements, preferred qualifications..."
                    maxLength={1000} />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Min 50 · Max 1000 characters</p>

          {error && <div className="alert-error mt-3">{error}</div>}

          {/* Duplicate warning */}
          {duplicateWarning && (
            <div className="mt-3 p-3 rounded-lg flex items-start gap-2"
                 style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.4)' }}>
              <span style={{ color: 'var(--color-warning)', fontSize: '16px', lineHeight: 1.3 }}>⚠</span>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>
                  AI match already available
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {duplicateWarning}
                </p>
                <button className="text-xs font-semibold mt-2 underline"
                        style={{ color: 'var(--color-warning)' }}
                        onClick={() => { setDuplicateWarning(''); setAiPanel(true); }}>
                  View in AI History →
                </button>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="alert-success mt-3"
                 style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--color-success)' }}>
              {successMessage}
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
              {jd.length} characters
            </span>
            <button onClick={handleMatch} disabled={loading || !jd.trim()} className="btn-primary gap-2">
              {loading ? <><Spinner />Matching candidates...</> : '✦ Find Best Matches'}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                 style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            <p className="font-medium">AI is ranking candidates...</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>
              This continues in the background — feel free to navigate and come back
            </p>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">
                Ranked Candidates
                <span className="ml-2 text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>
                  ({results.length} matched)
                </span>
              </h2>
              <button onClick={handleNewSearch} className="btn-ghost text-sm">
                ↩ New Search
              </button>
            </div>

            {results.length === 0 ? (
              <div className="card p-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
                No candidates found to match against.
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((r, i) => (
                  <div key={r.application_id} className="card p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                           style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}>
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                          <div>
                            <div className="font-semibold text-base">{r.full_name}</div>
                            <div className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              {r.primary_role}
                              {r.years_of_experience != null && ` · ${r.years_of_experience} yrs exp`}
                            </div>
                            {r.status && (
                              <div className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
                                Status: {statusLabel(r.status)}
                              </div>
                            )}
                          </div>
                          <div className="text-center flex-shrink-0">
                            {(() => {
                              const cat = getMatchCategory(r.match_score);
                              return (
                                <>
                                  <div className="text-3xl font-bold leading-none" style={{ color: cat.color }}>
                                    {r.match_score}%
                                  </div>
                                  <span className="text-xs mt-1 px-2 py-0.5 rounded-full font-semibold inline-block"
                                        style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.color}` }}>
                                    {cat.label}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden mb-3"
                             style={{ background: 'var(--color-bg-elevated)' }}>
                          <div className="h-full rounded-full"
                               style={{ width: `${r.match_score}%`, background: getMatchCategory(r.match_score).color, transition: 'width 0.5s ease' }} />
                        </div>
                        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-text-muted)' }}>
                          {r.explanation}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {r.key_matches?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-success)' }}>Key Matches</p>
                              <ul className="space-y-1">
                                {r.key_matches.map((m, j) => (
                                  <li key={j} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                    <span style={{ color: 'var(--color-success)' }}>✓</span> {m}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {r.gaps?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-warning)' }}>Gaps</p>
                              <ul className="space-y-1">
                                {r.gaps.map((g, j) => (
                                  <li key={j} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                    <span style={{ color: 'var(--color-warning)' }}>△</span> {g}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4 pt-4"
                         style={{ borderTop: '1px solid var(--color-border)' }}>
                      <button onClick={() => navigate(`/hr/candidate/${r.application_id}`)} className="btn-secondary text-sm">
                        View Profile
                      </button>
                      {shortlisted[r.application_id] ? (
                        <span className="badge-shortlisted px-4 py-2">✓ Shortlisted</span>
                      ) : (
                        <button onClick={() => handleShortlist(r.application_id)}
                                disabled={shortlisting[r.application_id]}
                                className="btn-success text-sm gap-2">
                          {shortlisting[r.application_id] ? <Spinner /> : '→'}
                          Shortlist
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Match History — full-page modal */}
      {aiPanel && (
        <div className="fixed inset-0 z-40" style={{ background: 'var(--color-bg-page)' }}>
          <div className="sticky top-0 z-10"
               style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}>
            <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => { setAiPanel(false); setSelectedIds(new Set()); }}
                        className="btn-ghost flex items-center gap-1.5 text-sm">
                  ← Back
                </button>
                <div style={{ width: '1px', height: '20px', background: 'var(--color-border)' }} />
                <div>
                  <h1 className="font-bold text-base">AI Match History</h1>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {matchHistory.length} saved {matchHistory.length === 1 ? 'search' : 'searches'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedIds.size > 0 && (
                  <button onClick={() => { setMatchHistory(h => h.filter(e => !selectedIds.has(e.id))); setSelectedIds(new Set()); }}
                          className="btn-secondary text-sm flex items-center gap-1.5"
                          style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                    🗑 Delete selected ({selectedIds.size})
                  </button>
                )}
                {matchHistory.length > 0 && selectedIds.size === 0 && (
                  <button onClick={async () => { try { await clearMatchHistory(); setMatchHistory([]); } catch {} }}
                          className="btn-ghost text-sm" style={{ color: 'var(--color-danger)' }}>
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 py-8 overflow-y-auto" style={{ height: 'calc(100vh - 64px)' }}>
            {matchHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h2 className="text-lg font-semibold mb-2">No match history yet</h2>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Run a match from the HireFit Analyzer page and results will be saved here permanently.
                </p>
                <button onClick={() => { setAiPanel(false); setSelectedIds(new Set()); }} className="btn-primary mt-6">
                  ← Go to HireFit Analyzer
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {matchHistory.map((entry) => {
                  const isSelected = selectedIds.has(entry.id);
                  return (
                    <div key={entry.id}
                         className="rounded-xl overflow-hidden transition-all cursor-pointer"
                         style={{
                           border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                           background: 'var(--color-bg-surface)',
                           boxShadow: isSelected ? '0 0 0 3px var(--color-primary-subtle)' : 'none',
                         }}
                         onClick={() => setSelectedIds(prev => { const n = new Set(prev); n.has(entry.id) ? n.delete(entry.id) : n.add(entry.id); return n; })}>
                      <div className="px-5 py-4 flex items-center justify-between"
                           style={{ background: isSelected ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all"
                               style={{ background: isSelected ? 'var(--color-primary)' : 'transparent', borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border-hover)' }}>
                            {isSelected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12"><path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z"/></svg>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-base">{entry.role}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{entry.date} · {entry.time}</p>
                            {entry.jdSnippet && (
                              <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-subtle)' }}>
                                {entry.jdSnippet}{entry.jdSnippet.length >= 220 ? '…' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-full font-semibold"
                              style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                          {entry.results.length} candidate{entry.results.length !== 1 ? 's' : ''} matched
                        </span>
                      </div>
                      {entry.results.length === 0 ? (
                        <div className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>No candidates matched for this search.</div>
                      ) : (
                        <div onClick={e => e.stopPropagation()}>
                          {entry.results.map((r, i) => {
                            const sc = r.match_score;
                            const cat = sc >= 70 ? { label: 'Strong Match', color: 'var(--color-success)', bg: 'rgba(34,197,94,0.12)' }
                                       : sc >= 45 ? { label: 'Average Match', color: 'var(--color-warning)', bg: 'rgba(234,179,8,0.12)' }
                                       : { label: 'Weak Match', color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.12)' };
                            return (
                              <div key={r.application_id} className="px-5 py-3 flex items-center gap-4"
                                   style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                                <span className="text-xs font-bold w-6 flex-shrink-0" style={{ color: 'var(--color-text-subtle)' }}>#{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm">{r.full_name}</p>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{r.primary_role}</p>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                                      style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.color}` }}>
                                  {cat.label}
                                </span>
                                <button onClick={() => { setAiPanel(false); setSelectedIds(new Set()); navigate(`/hr/candidate/${r.application_id}`); }}
                                        className="text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0 transition-opacity hover:opacity-80"
                                        style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                                  View →
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('hr_user') || 'null'); } catch { return null; }
}
