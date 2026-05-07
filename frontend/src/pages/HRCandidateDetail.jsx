import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getHRApplication, updateApplicationStatus, summarizeApplicationAction,
  assignMultipleInterviewers, sendInterviewerNotes, getInterviewers, saveHRNotes,
} from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function HRCandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [app, setApp]                   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [notes, setNotes]               = useState('');
  const [interviewerNotes, setInterviewerNotes] = useState('');
  const [assignedInterviewer, setAssignedInterviewer] = useState('');
  const [notesSaving, setNotesSaving]   = useState(false);
  const [notesSaved, setNotesSaved]     = useState(false);
  const [assignSaved, setAssignSaved]   = useState(false);
  const [notesSent, setNotesSent]       = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [noteSending, setNoteSending]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [message, setMessage]           = useState(null);
  const [interviewerOptions, setInterviewerOptions] = useState([]);

  useEffect(() => { loadApp(); loadInterviewers(); }, [id]);

  async function loadInterviewers() {
    try {
      const data = await getInterviewers();
      setInterviewerOptions((data.interviewers || []).map((u) => ({ value: u.email, label: u.name })));
    } catch (_) {}
  }

  async function loadApp() {
    setLoading(true);
    try {
      const data = await getHRApplication(id);
      setApp(data);
      setNotes(data.hr_notes || '');
      setInterviewerNotes(data.hr_notes_for_interviewer || '');
      const existing = data.assigned_interviewers
        ? safeParseJSON(data.assigned_interviewers)
        : (data.assigned_interviewer ? [data.assigned_interviewer] : []);
      const arr = Array.isArray(existing) ? existing : [];
      const first = arr[0] || '';
      setAssignedInterviewer(first);
      setAssignSaved(!!first);
      if (data.hr_notes_for_interviewer) setNotesSent(true);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/hiring'); }
      else if (err.response?.status === 404) navigate('/hr');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus(status) {
    setActionLoading(true);
    setMessage(null);
    try {
      await updateApplicationStatus(id, status, notes);
      setMessage({ type: 'success', text: `Status updated to "${status}".` });
      loadApp();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update status.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSummary() {
    setSummaryLoading(true);
    setMessage(null);
    try {
      await summarizeApplicationAction(id);
      loadApp();
    } catch (err) {
      setMessage({ type: 'error', text: 'AI summary failed: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleAssign() {
    if (!assignedInterviewer) return;
    setAssignSaving(true);
    try {
      await assignMultipleInterviewers(id, [assignedInterviewer]);
      setAssignSaved(true);
      setMessage({ type: 'success', text: 'Interviewer assigned.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to assign interviewer.' });
    } finally {
      setAssignSaving(false);
    }
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    setNotesSaved(false);
    try {
      await saveHRNotes(id, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save notes.' });
    } finally {
      setNotesSaving(false);
    }
  }

  async function handleSendNote() {
    setNoteSending(true);
    try {
      await sendInterviewerNotes(id, interviewerNotes);
      setNotesSent(true);
      setShowNoteInput(false);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send note.' });
    } finally {
      setNoteSending(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (!app)    return null;

  const analysis = safeParseJSON(app.ai_analysis);
  const domains  = safeParseJSON(app.preferred_domains) || [];

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>

      {/* Header */}
      <header className="sticky top-0 z-40"
              style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/hr')} className="btn-ghost gap-1.5 text-sm">
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{app.full_name}</h1>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
              {app.primary_role} · {app.email}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={app.status} />
            {app.action_by && (
              <span className="text-xs hidden sm:block" style={{ color: 'var(--color-text-subtle)' }}>
                by {app.action_by}
              </span>
            )}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column — profile ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Contact & Background */}
            <div className="card p-6">
              <SectionTitle>Contact & Background</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <InfoRow label="Email"      value={app.email} />
                <InfoRow label="Phone"      value={app.phone || '—'} />
                <InfoRow label="Domain"     value={app.primary_role} />
                <InfoRow label="Experience" value={app.years_of_experience != null ? `${app.years_of_experience} years` : 'Not specified'} />
                <InfoRow label="Education"  value={app.education || 'Not provided'} />
                <InfoRow label="Night Shift" value={
                  app.night_shift_preference
                    ? <NightShiftBadge value={app.night_shift_preference} />
                    : '—'
                } />
                <InfoRow label="Salary"     value={
                  app.salary_flexible
                    ? 'Flexible / Negotiable'
                    : (app.salary_min && app.salary_max)
                      ? `₹${toLPA(app.salary_min)} LPA – ₹${toLPA(app.salary_max)} LPA`
                      : 'Not specified'
                } />
              </div>

              {domains.length > 0 && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--color-text-muted)' }}>
                    Preferred Domains
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {domains.map((d) => (
                      <span key={d} className="badge"
                            style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid rgba(99,102,241,0.25)' }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Documents — file uploads only */}
            {(app.cv_path || app.cover_letter_path) && (
              <div className="card p-6">
                <SectionTitle>Documents</SectionTitle>
                <div className="flex flex-col gap-3 mt-4">
                  {app.cv_path && (
                    <a href={app.cv_path} target="_blank" rel="noreferrer"
                       className="btn-secondary inline-flex gap-2 text-sm w-fit">
                      📄 View CV / Resume
                    </a>
                  )}
                  {app.cover_letter_path && (
                    <a href={app.cover_letter_path} target="_blank" rel="noreferrer"
                       className="btn-secondary inline-flex gap-2 text-sm w-fit">
                      📄 View Cover Letter
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* AI Summary */}
            {analysis ? (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <SectionTitle>AI Summary</SectionTitle>
                  <button onClick={handleSummary} disabled={summaryLoading}
                          className="btn-ghost text-xs gap-1">
                    {summaryLoading ? <><Spinner />Generating...</> : '✦ Generate AI Summary'}
                  </button>
                </div>

                {analysis.key_points ? (
                  <div className="space-y-4">
                    {analysis.overview && (
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                        {analysis.overview}
                      </p>
                    )}
                    {analysis.key_points?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                           style={{ color: 'var(--color-primary)' }}>Key Points</p>
                        <ul className="space-y-1.5">
                          {analysis.key_points.map((pt, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span style={{ color: 'var(--color-primary)' }}>•</span>
                              <span style={{ color: 'var(--color-text-muted)' }}>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.skills_highlighted?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                           style={{ color: 'var(--color-success)' }}>Skills Highlighted</p>
                        <ul className="space-y-1.5">
                          {analysis.skills_highlighted.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span style={{ color: 'var(--color-success)' }}>✓</span>
                              <span style={{ color: 'var(--color-text-muted)' }}>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.concerns?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                           style={{ color: 'var(--color-warning)' }}>Concerns</p>
                        <ul className="space-y-1.5">
                          {analysis.concerns.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span style={{ color: 'var(--color-warning)' }}>△</span>
                              <span style={{ color: 'var(--color-text-muted)' }}>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                      {analysis.summary}
                    </p>
                    {analysis.recommendation && (
                      <p className="text-sm leading-relaxed font-medium">{analysis.recommendation}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {analysis.strengths?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                             style={{ color: 'var(--color-success)' }}>Strengths</p>
                          <ul className="space-y-1.5">
                            {analysis.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span style={{ color: 'var(--color-success)' }}>✓</span>
                                <span style={{ color: 'var(--color-text-muted)' }}>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.areas_for_improvement?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                             style={{ color: 'var(--color-warning)' }}>Areas for Improvement</p>
                          <ul className="space-y-1.5">
                            {analysis.areas_for_improvement.map((a, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span style={{ color: 'var(--color-warning)' }}>△</span>
                                <span style={{ color: 'var(--color-text-muted)' }}>{a}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-6 text-center">
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  No AI summary yet for this application.
                </p>
                <button onClick={handleSummary} disabled={summaryLoading} className="btn-primary gap-2">
                  {summaryLoading ? <><Spinner />Generating...</> : '✦ Generate AI Summary'}
                </button>
              </div>
            )}

            {/* Interview Feedback History */}
            {app.interview_feedback?.length > 0 && (
              <div className="card p-6">
                <SectionTitle>Interview Feedback History</SectionTitle>
                {app.interview_feedback.map((fb, i) => (
                  <div key={i} className="mt-4 p-4 rounded-lg"
                       style={{ background: 'var(--color-bg-elevated)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <DecisionBadge decision={fb.decision} />
                      {fb.submitted_by && (
                        <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                          Evaluated by <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{fb.submitted_by}</span>
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center text-sm">
                      <ScoreItem label="Attitude"   score={fb.attitude_score} />
                      <ScoreItem label="Confidence" score={fb.confidence_score} />
                      <ScoreItem label="Knowledge"  score={fb.knowledge_score} />
                    </div>
                    {fb.feedback_notes && (
                      <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
                        {fb.feedback_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* ── Right column — actions ── */}
          <div className="space-y-5">

            {message && (
              <div className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
                {message.text}
              </div>
            )}

            {/* HR Notes */}
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <SectionTitle>HR Notes</SectionTitle>
                {notesSaving && <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>Saving...</span>}
                {notesSaved && !notesSaving && <span className="text-xs" style={{ color: 'var(--color-success)' }}>✓ Saved</span>}
              </div>
              <textarea value={notes}
                        onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
                        onBlur={handleSaveNotes}
                        rows={7} className="input resize-none mt-3 text-sm"
                        placeholder="Internal notes visible only to HR..." />
            </div>

            {/* Decision */}
            <div className="card p-5">
              <SectionTitle>Decision</SectionTitle>

              {/* Interviewer has already decided — show read-only outcome */}
              {(app.status === 'final_selected' || app.status === 'another_round') ? (
                <div className="mt-3 space-y-3">
                  <div className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-center"
                       style={app.status === 'final_selected'
                         ? { background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }
                         : { background: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}>
                    {app.status === 'final_selected' ? '✓ Hired — Interviewer Decision' : '↺ Another Round — Interviewer Decision'}
                  </div>
                  <p className="text-xs text-center" style={{ color: 'var(--color-text-subtle)' }}>
                    This outcome was set by the interviewer and cannot be changed here.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs mt-2 mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Please review carefully before submitting as decisions cannot be edited later.
                  </p>
                  <div className="space-y-2 mt-2">
                    {app.status === 'shortlisted' ? (
                      <>
                        <div className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-center"
                             style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}>
                          ✓ Shortlisted for Interview
                        </div>
                        <button onClick={() => handleStatus('applied')}
                                disabled={actionLoading}
                                className="w-full flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm transition-all"
                                style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', opacity: actionLoading ? 0.7 : 1 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                          </svg>
                          ↩ Reset to Applied
                        </button>
                      </>
                    ) : app.status === 'rejected' || app.status === 'ai_rejected' ? (
                      <>
                        <div className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-center"
                             style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                          ✕ Application Rejected
                        </div>
                        <button onClick={() => handleStatus('applied')}
                                disabled={actionLoading}
                                className="w-full flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm transition-all"
                                style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', opacity: actionLoading ? 0.7 : 1 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                          </svg>
                          ↩ Reset to Applied
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleStatus('shortlisted')}
                                disabled={actionLoading}
                                className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all"
                                style={{
                                  background: 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)',
                                  color: '#d8f3dc',
                                  border: '1px solid #2d6a4f',
                                  boxShadow: '0 2px 10px rgba(27,67,50,0.25)',
                                  opacity: actionLoading ? 0.7 : 1,
                                }}>
                          <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                                style={{ background: 'rgba(255,255,255,0.10)' }}>
                            {actionLoading ? <Spinner /> : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                              </svg>
                            )}
                          </span>
                          <span className="flex-1 text-left">Shortlist for Interview</span>
                        </button>

                        <button onClick={() => handleStatus('rejected')}
                                disabled={actionLoading}
                                className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all"
                                style={{
                                  background: 'linear-gradient(135deg, #7f1d1d 0%, #5c1a1a 100%)',
                                  color: '#fecaca',
                                  border: '1px solid #7f1d1d',
                                  opacity: actionLoading ? 0.7 : 1,
                                }}>
                          <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                                style={{ background: 'rgba(255,255,255,0.10)' }}>
                            {actionLoading ? <Spinner /> : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                              </svg>
                            )}
                          </span>
                          <span className="flex-1 text-left">Reject Application</span>
                        </button>

                        {app.status !== 'applied' && (
                          <button onClick={() => handleStatus('applied')}
                                  disabled={actionLoading}
                                  className="w-full flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm transition-all"
                                  style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', opacity: actionLoading ? 0.7 : 1 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                            </svg>
                            ↩ Reset to Applied
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Assign Interviewer — only shown once shortlisted */}
            {app.status === 'shortlisted' && (
              <div className="card p-5">
                <SectionTitle>Assign Interviewer</SectionTitle>
                {assignSaved ? (
                  <div className="flex items-center gap-2 mt-3 text-sm" style={{ color: 'var(--color-success)' }}>
                    <span>✓</span>
                    <span>Assigned to {interviewerOptions.find((o) => o.value === assignedInterviewer)?.label || assignedInterviewer}</span>
                    <button onClick={() => setAssignSaved(false)}
                            className="ml-auto text-xs px-2 py-0.5 rounded"
                            style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)' }}>
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <select value={assignedInterviewer}
                            onChange={(e) => setAssignedInterviewer(e.target.value)}
                            className="input select text-sm w-full">
                      <option value="" disabled hidden>Select interviewer...</option>
                      {interviewerOptions.length === 0 ? (
                        <option value="" disabled>No interviewers available</option>
                      ) : (
                        interviewerOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))
                      )}
                    </select>
                    {assignedInterviewer && (
                      <button onClick={handleAssign} disabled={assignSaving}
                              className="w-full py-2 px-4 rounded-lg text-sm font-semibold"
                              style={{ background: 'var(--color-primary)', color: '#fff', opacity: assignSaving ? 0.7 : 1 }}>
                        {assignSaving ? 'Assigning...' : '→ Assign'}
                      </button>
                    )}
                  </div>
                )}

                {/* Note section */}
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                  {notesSent && !showNoteInput ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
                      <span>✓</span>
                      <span>Note sent</span>
                      <button onClick={() => { setShowNoteInput(true); setNotesSent(false); }}
                              className="ml-auto text-xs px-2 py-0.5 rounded"
                              style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)' }}>
                        Edit
                      </button>
                    </div>
                  ) : showNoteInput ? (
                    <div className="space-y-2">
                      <textarea value={interviewerNotes} onChange={(e) => setInterviewerNotes(e.target.value)}
                                rows={3} className="input resize-none text-sm w-full"
                                placeholder="Note for interviewer..." />
                      <button onClick={handleSendNote} disabled={noteSending}
                              className="w-full py-2 px-4 rounded-lg text-sm font-semibold"
                              style={{ background: 'var(--color-primary)', color: '#fff', opacity: noteSending ? 0.7 : 1 }}>
                        {noteSending ? 'Sending...' : 'Send Note'}
                      </button>
                      <button onClick={() => setShowNoteInput(false)} className="w-full text-xs text-center py-1"
                              style={{ color: 'var(--color-text-muted)' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowNoteInput(true)} className="text-xs font-medium"
                            style={{ color: 'var(--color-primary)' }}>
                      + Add Note
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-text-muted)' }}>
      {children}
    </h3>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

function ScoreItem({ label, score }) {
  return (
    <div className="p-2 rounded" style={{ background: 'var(--color-bg-surface)' }}>
      <div className="text-sm font-bold">{score}/5</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{label}</div>
    </div>
  );
}

function NightShiftBadge({ value }) {
  const map = {
    Yes:        { label: '✓ Yes',        color: 'var(--color-success)', bg: 'rgba(34,197,94,0.12)'   },
    No:         { label: '✗ No',         color: 'var(--color-danger)',  bg: 'rgba(239,68,68,0.12)'   },
    Negotiable: { label: '~ Negotiable', color: 'var(--color-warning)', bg: 'rgba(234,179,8,0.12)'   },
  };
  const s = map[value] || { label: value, color: 'var(--color-text-muted)', bg: 'var(--color-bg-elevated)' };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}` }}>
      {s.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    applied:        'badge-applied',
    shortlisted:    'badge-shortlisted',
    rejected:       'badge-rejected',
    final_selected: 'badge-final_selected',
    another_round:  'badge-another_round',
    ai_rejected:    'badge-rejected',
  };
  const labels = {
    applied:        'Pending',
    shortlisted:    'Shortlisted',
    rejected:       'Rejected',
    final_selected: 'Selected',
    another_round:  'Another Round',
    ai_rejected:    'Rejected',
  };
  return <span className={map[status] || 'badge'}>{labels[status] || status}</span>;
}

function DecisionBadge({ decision }) {
  const styles = {
    proceed:       { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: 'Proceed' },
    reject:        { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  label: 'Rejected' },
    another_round: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', label: 'Another Round' },
  };
  const s = styles[decision] || { bg: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', label: decision };
  return (
    <span className="badge text-xs" style={{ background: s.bg, color: s.color }}>{s.label}</span>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'var(--color-bg-page)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
           style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
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

function toLPA(v) {
  const n = Number(v);
  if (n >= 100000) {
    const lpa = n / 100000;
    return lpa % 1 === 0 ? lpa : lpa.toFixed(1);
  }
  return n;
}

function safeParseJSON(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}
