import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInterviewerApplication, submitInterviewFeedback, summarizeInterviewerApplication, getInterviewerProfile } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function InterviewerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [app, setApp]                     = useState(null);
  const [loading, setLoading]             = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [message, setMessage]             = useState(null);

  const [scores, setScores]       = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(`interviewer_feedback_${id}`));
      return s?.scores || { attitude_score: 3, confidence_score: 3, knowledge_score: 3, cultural_fit_score: 3 };
    } catch { return { attitude_score: 3, confidence_score: 3, knowledge_score: 3, cultural_fit_score: 3 }; }
  });
  const [notes, setNotes]         = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(`interviewer_feedback_${id}`));
      return s?.notes ?? '';
    } catch { return ''; }
  });
  const [decision, setDecision]   = useState('');
  const [pendingDecision, setPendingDecision] = useState(null);
  const [round, setRound]         = useState(1);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [profileOpen, setProfileOpen]     = useState(false);
  const [profileData, setProfileData]     = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  async function openProfile() {
    setProfileOpen(true);
    if (profileData) return;
    setProfileLoading(true);
    try { const data = await getInterviewerProfile(); setProfileData(data); }
    catch (_) {} finally { setProfileLoading(false); }
  }

  useEffect(() => { loadApp(); }, [id]);

  useEffect(() => {
    localStorage.setItem(`interviewer_feedback_${id}`, JSON.stringify({ scores, notes }));
  }, [id, scores, notes]);

  async function loadApp(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await getInterviewerApplication(id);
      setApp(data);
      setRound((data.interview_feedback?.length || 0) + 1);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/hiring'); }
      else if (err.response?.status === 404) navigate('/interviewer/applications');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function handleDecisionClick(d) {
    setDecision(d);
    setPendingDecision(d);
    setMessage(null);
    setSubmitLoading(true);
    try {
      await submitInterviewFeedback(id, {
        attitude_score: scores.attitude_score, confidence_score: scores.confidence_score,
        knowledge_score: scores.knowledge_score, cultural_fit_score: scores.cultural_fit_score,
        feedback_notes: notes, decision: d, round,
      });
      localStorage.removeItem(`interviewer_feedback_${id}`);
      setScores({ attitude_score: 3, confidence_score: 3, knowledge_score: 3, cultural_fit_score: 3 });
      setNotes(''); setDecision('');
      await loadApp(true); // wait for updated status before clearing badge
      setPendingDecision(null);
      setMessage({ type: 'success', text: 'Evaluation saved successfully.' });
    } catch (err) {
      setPendingDecision(null);
      setDecision('');
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save evaluation.' });
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleSummary() {
    setSummaryLoading(true);
    setMessage(null);
    try {
      await summarizeInterviewerApplication(id);
      loadApp();
    } catch (err) {
      setMessage({ type: 'error', text: 'AI summary failed: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSummaryLoading(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (!app)    return null;

  const domains   = safeParseJSON(app.preferred_domains) || [];
  const analysis  = safeParseJSON(app.ai_analysis);
  // detect both summary formats (HR generates key_points format; interviewer generates summary/strengths format)
  const hasAnalysis = analysis && (
    analysis.summary || analysis.recommendation ||
    (analysis.strengths?.length > 0) || (analysis.areas_for_improvement?.length > 0) ||
    analysis.overview || (analysis.key_points?.length > 0)
  );
  const latestDecision = app.interview_feedback?.[0]?.decision;
  const isRejected = latestDecision === 'reject';
  const canEvaluate = ['shortlisted', 'another_round'].includes(app.status) && !isRejected;
  const overall = ((scores.attitude_score + scores.confidence_score + scores.knowledge_score + scores.cultural_fit_score) / 4).toFixed(1);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>

      {/* Header */}
      <header className="sticky top-0 z-40"
              style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src="/synersys-logo.png" alt="Synersys" style={{ height: '32px', width: 'auto' }} />
            <nav className="hidden sm:flex items-center gap-1">
              <button onClick={() => navigate('/interviewer/applications')} className="btn-ghost text-sm px-3 py-1.5">
                Applications
              </button>
              <span className="text-sm px-3 py-1.5 rounded-lg font-medium truncate max-w-[220px]"
                    style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                {app.full_name}
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={app.status} />
              {app.action_by && (
                <span className="text-xs hidden sm:block" style={{ color: 'var(--color-text-subtle)' }}>
                  by {app.action_by}
                </span>
              )}
            </div>
            <ThemeToggle />
            <button onClick={() => navigate('/interviewer/applications')} className="btn-ghost gap-1.5 text-sm sm:hidden">
              ← Back
            </button>
          </div>
        </div>
      </header>

      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ── */}
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
                  <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--color-text-muted)' }}>Preferred Domains</p>
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

            {/* Documents */}
            {(app.cv_path || app.cover_letter_path) && (
              <div className="card p-6">
                <SectionTitle>Documents</SectionTitle>
                <div className="flex flex-col gap-3 mt-4">
                  {app.cv_path && (
                    <a href={app.cv_path} target="_blank" rel="noreferrer" className="btn-secondary inline-flex gap-2 text-sm w-fit">
                      📄 View CV / Resume
                    </a>
                  )}
                  {app.cover_letter_path && (
                    <a href={app.cover_letter_path} target="_blank" rel="noreferrer" className="btn-secondary inline-flex gap-2 text-sm w-fit">
                      📄 View Cover Letter
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* AI Summary */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>AI Summary</SectionTitle>
              </div>

              {summaryLoading ? (
                <div className="flex items-center justify-center gap-2 py-12">
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                       style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Generating AI summary...</span>
                </div>
              ) : hasAnalysis ? (
                <div className="space-y-4">
                  {app.ai_score != null && (() => {
                    const cat = getMatchCategory(app.ai_score);
                    return (
                      <div className="flex items-center gap-4 p-4 rounded-lg" style={{ background: 'var(--color-bg-elevated)' }}>
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-border)" strokeWidth="6"/>
                            <circle cx="32" cy="32" r="26" fill="none" stroke={cat.color} strokeWidth="6"
                                    strokeDasharray={`${(app.ai_score / 100) * 163.4} 163.4`} strokeLinecap="round"/>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold" style={{ color: cat.color }}>{app.ai_score}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold mb-1">HireFit Score</div>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.color}` }}>
                            {cat.label}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* key_points format (from HR summarize) */}
                  {analysis.overview && (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{analysis.overview}</p>
                  )}
                  {analysis.key_points?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-primary)' }}>Key Points</p>
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
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-success)' }}>Skills Highlighted</p>
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
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-warning)' }}>Concerns</p>
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

                  {/* summary/strengths format (from interviewer or analyze endpoint) */}
                  {analysis.summary && (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{analysis.summary}</p>
                  )}
                  {analysis.recommendation && (
                    <p className="text-sm leading-relaxed font-medium">{analysis.recommendation}</p>
                  )}
                  {(analysis.strengths?.length > 0 || analysis.areas_for_improvement?.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {analysis.strengths?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-success)' }}>Strengths</p>
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
                          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-warning)' }}>Areas for Improvement</p>
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
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                    No AI summary yet. Generate insights about this candidate.
                  </p>
                  <button onClick={handleSummary} disabled={summaryLoading} className="btn-primary gap-2">
                    {summaryLoading ? <><Spinner />Generating...</> : '✦ Generate AI Summary'}
                  </button>
                </div>
              )}
            </div>


          </div>

          {/* ── Right column — evaluation form ── */}
          <div className="space-y-5">

            {message && (
              <div className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
                {message.text}
              </div>
            )}

            {app.hr_notes_for_interviewer && (
              <div className="card p-5">
                <SectionTitle>Note from HR</SectionTitle>
                <div className="mt-2 p-3 rounded-lg text-sm leading-relaxed"
                     style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}>
                  {app.hr_notes_for_interviewer}
                </div>
              </div>
            )}

            {/* Evaluation Form */}
            {isRejected ? (
              <div className="card p-5">
                <SectionTitle>Evaluation Feedback</SectionTitle>
                <div className="mt-4 text-center p-4 rounded-lg"
                     style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>✕ Candidate Rejected</span>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-danger)' }}>
                    No further evaluation can be submitted.
                  </p>
                </div>
                {app.interview_feedback?.length > 0 && (
                  <button onClick={() => setShowEvalModal(true)}
                          className="btn-secondary text-xs mt-4 w-full py-1.5">
                    View Evaluation
                  </button>
                )}
              </div>
            ) : canEvaluate ? (
              <div className="card p-5">
                <SectionTitle>Evaluation Feedback</SectionTitle>
                <div className="space-y-5 mt-4">
                  <ScoreSelector label="Attitude"                     value={scores.attitude_score}     onChange={(v) => setScores((s) => ({ ...s, attitude_score: v }))} />
                  <ScoreSelector label="Confidence & Presence"        value={scores.confidence_score}   onChange={(v) => setScores((s) => ({ ...s, confidence_score: v }))} />
                  <ScoreSelector label="Domain Knowledge & Skills"    value={scores.knowledge_score}    onChange={(v) => setScores((s) => ({ ...s, knowledge_score: v }))} />
                  <ScoreSelector label="Cultural Fit & Communication" value={scores.cultural_fit_score} onChange={(v) => setScores((s) => ({ ...s, cultural_fit_score: v }))} />
                </div>

                <div className="mt-4 p-3 rounded-lg text-center" style={{ background: 'var(--color-bg-elevated)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Overall Score</span>
                  <div className="text-2xl font-bold mt-0.5"
                       style={{ color: parseFloat(overall) >= 3.5 ? 'var(--color-success)' : parseFloat(overall) >= 2.5 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                    {overall}<span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>/5</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="label text-xs">Interview Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                            rows={4} className="input resize-none text-sm"
                            placeholder="Key observations, highlights, specific feedback..." />
                </div>

                <div className="mt-4">
                  <label className="label text-xs">Decision <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  {pendingDecision ? (
                    <div className="flex items-center justify-between p-3 rounded-lg mt-2"
                         style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                      {submitLoading
                        ? <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}><Spinner /> Saving...</span>
                        : <DecisionBadge decision={pendingDecision} />}
                      {!submitLoading && (
                        <button onClick={() => { setPendingDecision(null); setDecision(''); }}
                                className="btn-ghost text-xs px-3 py-1">
                          Edit
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <DecisionButton active={decision === 'proceed'}       onClick={() => handleDecisionClick('proceed')}       color="var(--color-success)" label="✓ Hire" />
                      <DecisionButton active={decision === 'another_round'} onClick={() => handleDecisionClick('another_round')} color="var(--color-primary)" label="↻ Another Round" />
                      <DecisionButton active={decision === 'reject'}        onClick={() => handleDecisionClick('reject')}        color="var(--color-danger)"  label="✕ Do Not Proceed" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card p-5 text-center">
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Evaluation complete</p>
                <StatusBadge status={app.status} />
                <p className="text-xs mt-3" style={{ color: 'var(--color-text-subtle)' }}>This candidate has already been processed.</p>
                {app.interview_feedback?.length > 0 && (
                  <button onClick={() => setShowEvalModal(true)}
                          className="btn-secondary text-xs mt-4 px-4 py-1.5">
                    View Evaluation
                  </button>
                )}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Evaluation Modal */}
      {showEvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.6)' }}
             onClick={() => setShowEvalModal(false)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden"
               style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', maxHeight: '80vh', overflowY: 'auto' }}
               onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4"
                 style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h3 className="font-semibold text-base">Evaluation Details</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{app.full_name}</p>
              </div>
              <button onClick={() => setShowEvalModal(false)}
                      className="btn-ghost text-lg leading-none px-2 py-0.5">✕</button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5">
              {app.interview_feedback.map((fb, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--color-bg-elevated)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <DecisionBadge decision={fb.decision} />
                    <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                      Overall: <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{Number(fb.overall_score).toFixed(1)}/5</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-sm mb-4">
                    <ScoreItem label="Attitude"     score={fb.attitude_score} />
                    <ScoreItem label="Confidence"   score={fb.confidence_score} />
                    <ScoreItem label="Knowledge"    score={fb.knowledge_score} />
                    <ScoreItem label="Cultural Fit" score={fb.cultural_fit_score ?? '—'} />
                  </div>
                  {fb.feedback_notes && (
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                      {fb.feedback_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {profileOpen && (
        <ProfilePanel onClose={() => setProfileOpen(false)} loading={profileLoading} data={profileData} />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreSelector({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm font-bold" style={{
          color: value >= 4 ? 'var(--color-success)' : value >= 3 ? 'var(--color-warning)' : 'var(--color-danger)'
        }}>{value}/5</span>
      </div>
      <div className="flex gap-1.5">
        {[1,2,3,4,5].map((n) => (
          <button key={n} onClick={() => onChange(n)} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: value === n ? (n >= 4 ? 'var(--color-success)' : n >= 3 ? 'var(--color-warning)' : 'var(--color-danger)') : 'var(--color-bg-elevated)',
              color: value === n ? '#fff' : 'var(--color-text-muted)',
              border: `1px solid ${value === n ? (n >= 4 ? 'var(--color-success)' : n >= 3 ? 'var(--color-warning)' : 'var(--color-danger)') : 'var(--color-border)'}`,
            }}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
        <span>Poor</span><span>Good</span><span>Excellent</span>
      </div>
    </div>
  );
}

function DecisionButton({ active, onClick, color, label }) {
  return (
    <button onClick={onClick} className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all text-left"
      style={{ background: active ? color : 'var(--color-bg-elevated)', color: active ? '#fff' : 'var(--color-text-muted)', border: `1px solid ${active ? color : 'var(--color-border)'}` }}>
      {label}
    </button>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{children}</h3>;
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

function StatusBadge({ status }) {
  const map = { shortlisted: 'badge-shortlisted', rejected: 'badge-rejected', final_selected: 'badge-final_selected', another_round: 'badge-another_round' };
  const labels = { shortlisted: 'Shortlisted', rejected: 'Rejected', final_selected: 'Selected', another_round: 'Another Round' };
  return <span className={map[status] || 'badge'}>{labels[status] || status}</span>;
}

function DecisionBadge({ decision }) {
  const styles = {
    proceed:       { cls: 'badge-final_selected', label: 'Hire' },
    reject:        { cls: 'badge-rejected',        label: 'Rejected' },
    another_round: { cls: 'badge-another_round',   label: 'Another Round' },
  };
  const s = styles[decision] || { cls: 'badge', label: decision };
  return <span className={s.cls}>{s.label}</span>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-page)' }}>
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

function getMatchCategory(score) {
  if (score >= 70) return { label: 'Strong',  color: 'var(--color-success)', bg: 'rgba(34,197,94,0.12)' };
  if (score >= 45) return { label: 'Average', color: 'var(--color-warning)', bg: 'rgba(234,179,8,0.12)' };
  return { label: 'Weak', color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.12)' };
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

function ProfilePanel({ onClose, loading, data }) {
  const user = data?.user;
  const apps = data?.assignedApps || [];
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

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
                    {user?.role || 'interviewer'}
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
