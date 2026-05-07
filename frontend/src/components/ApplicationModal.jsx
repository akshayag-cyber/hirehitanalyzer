import { useState } from 'react';
import { updateApplicationStatus } from '../services/api';

function ScoreRing({ score }) {
  if (score === null || score === undefined) return null;
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Average' : 'Low';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score} 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-xs font-medium mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

export default function ApplicationModal({ application, onClose, onUpdated }) {
  const [status, setStatus] = useState(application.status);
  const [feedback, setFeedback] = useState(application.hr_feedback || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');

  const ai = application.ai_analysis;

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaveMsg('');
    try {
      await updateApplicationStatus(application.id, status, feedback);
      setSaveMsg(`✓ Status updated to "${status}"${status !== 'pending' ? ' — automated email sent.' : '.'}`);
      setTimeout(() => onUpdated(), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-10">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl p-6 text-white">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-start justify-between pr-10">
            <div>
              <h2 className="text-2xl font-bold">{application.full_name}</h2>
              <p className="text-indigo-200 text-sm mt-1">{application.email}</p>
              {application.phone && <p className="text-indigo-200 text-sm">{application.phone}</p>}
            </div>
            <ScoreRing score={application.ai_score} />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">{application.preferred_domain}</span>
            {application.salary_expectation && (
              <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">{application.salary_expectation}</span>
            )}
            {application.ai_shortlisted ? (
              <span className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-full font-medium">🤖 AI Shortlisted</span>
            ) : null}
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Education */}
          {application.education && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Education</h3>
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl text-sm">
                {application.education.degree && (
                  <div><span className="text-gray-400">Degree</span><p className="font-medium text-gray-800">{application.education.degree}</p></div>
                )}
                {application.education.field_of_study && (
                  <div><span className="text-gray-400">Field</span><p className="font-medium text-gray-800">{application.education.field_of_study}</p></div>
                )}
                {application.education.institution && (
                  <div><span className="text-gray-400">Institution</span><p className="font-medium text-gray-800">{application.education.institution}</p></div>
                )}
                {application.education.graduation_year && (
                  <div><span className="text-gray-400">Year</span><p className="font-medium text-gray-800">{application.education.graduation_year}</p></div>
                )}
              </div>
            </section>
          )}

          {/* Cover Letter */}
          {application.cover_letter && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Cover Letter</h3>
              <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {application.cover_letter}
              </div>
            </section>
          )}

          {/* CV */}
          {application.cv_path && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">CV / Resume</h3>
              <a href={application.cv_path} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {application.cv_filename || 'View CV'}
              </a>
            </section>
          )}

          {/* AI Analysis */}
          {ai && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>🤖</span> AI Analysis
              </h3>
              <div className="space-y-4">
                {ai.summary && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <p className="text-sm text-purple-800 leading-relaxed">{ai.summary}</p>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  {ai.strengths?.length > 0 && (
                    <div className="p-4 bg-emerald-50 rounded-xl">
                      <p className="text-xs font-semibold text-emerald-700 uppercase mb-2">Strengths</p>
                      <ul className="space-y-1">
                        {ai.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-emerald-800 flex items-start gap-1.5">
                            <span className="text-emerald-500 mt-0.5">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ai.areas_for_improvement?.length > 0 && (
                    <div className="p-4 bg-amber-50 rounded-xl">
                      <p className="text-xs font-semibold text-amber-700 uppercase mb-2">Areas to Improve</p>
                      <ul className="space-y-1">
                        {ai.areas_for_improvement.map((s, i) => (
                          <li key={i} className="text-sm text-amber-800 flex items-start gap-1.5">
                            <span className="text-amber-500 mt-0.5">△</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {ai.recommendation && (
                  <p className="text-sm text-gray-600 italic border-l-4 border-indigo-300 pl-4">
                    {ai.recommendation}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* HR Decision */}
          <section className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">HR Decision</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Update Status</label>
                <div className="flex gap-3">
                  {['pending', 'approved', 'rejected'].map((s) => (
                    <button key={s} type="button" onClick={() => setStatus(s)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize border-2 transition-all ${
                        status === s
                          ? s === 'approved' ? 'bg-emerald-600 border-emerald-600 text-white'
                          : s === 'rejected' ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {s === 'approved' ? '✓ Approve' : s === 'rejected' ? '✗ Reject' : '⏸ Pending'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Feedback / Notes
                  {status === 'rejected' && <span className="text-red-500 ml-1 font-normal">(included in rejection email)</span>}
                </label>
                <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                  rows={3} className="input resize-none"
                  placeholder="Add feedback or notes for this candidate..." />
              </div>

              {saveMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">{saveMsg}</div>
              )}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠ {error}</div>
              )}

              <button onClick={handleSave} disabled={saving}
                className="btn-primary w-full justify-center py-3">
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : 'Save Decision'}
              </button>
            </div>
          </section>

          <p className="text-xs text-gray-400 text-center">
            Applied: {new Date(application.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
