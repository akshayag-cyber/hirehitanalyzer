import { useState } from 'react';
import { submitInterviewFeedback } from '../services/api';

function ScoreSlider({ label, name, value, onChange, icon }) {
  const color = value >= 8 ? 'text-emerald-600' : value >= 6 ? 'text-amber-500' : 'text-red-500';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <span>{icon}</span>{label}
        </label>
        <span className={`text-2xl font-bold ${color}`}>{value}<span className="text-sm text-gray-400">/10</span></span>
      </div>
      <input type="range" name={name} min="1" max="10" value={value}
        onChange={(e) => onChange(name, parseInt(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
      <div className="flex justify-between text-xs text-gray-400">
        <span>Poor</span><span>Average</span><span>Excellent</span>
      </div>
    </div>
  );
}

export default function InterviewFeedbackModal({ application, onClose, onSaved }) {
  const existing = {
    attitude_score: application.attitude_score ?? 5,
    confidence_score: application.confidence_score ?? 5,
    knowledge_score: application.knowledge_score ?? 5,
    feedback_notes: application.feedback_notes || '',
    final_decision: application.final_decision || '',
  };

  const [scores, setScores] = useState({
    attitude_score: existing.attitude_score,
    confidence_score: existing.confidence_score,
    knowledge_score: existing.knowledge_score,
  });
  const [notes, setNotes] = useState(existing.feedback_notes);
  const [decision, setDecision] = useState(existing.final_decision);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const overall = ((scores.attitude_score + scores.confidence_score + scores.knowledge_score) / 3).toFixed(1);
  const overallColor = parseFloat(overall) >= 7 ? 'text-emerald-600' : parseFloat(overall) >= 5 ? 'text-amber-500' : 'text-red-500';

  function handleScoreChange(name, val) {
    setScores({ ...scores, [name]: val });
  }

  async function handleSubmit() {
    if (!decision) return setError('Please select a final decision.');
    setSaving(true);
    setError('');
    try {
      await submitInterviewFeedback(application.id, {
        attitude_score: scores.attitude_score,
        confidence_score: scores.confidence_score,
        knowledge_score: scores.knowledge_score,
        feedback_notes: notes,
        final_decision: decision,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save feedback');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-10">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl p-6 text-white">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-xl font-bold">Interview Evaluation</h2>
          <p className="text-emerald-100 text-sm mt-1">{application.full_name} · {application.preferred_domain}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold">{overall}</p>
              <p className="text-xs text-emerald-100">Overall</p>
            </div>
            <p className="text-emerald-100 text-sm">
              Based on Attitude, Confidence & Knowledge scores
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Score Sliders */}
          <div className="space-y-6">
            <ScoreSlider label="Attitude & Communication" name="attitude_score"
              value={scores.attitude_score} onChange={handleScoreChange} icon="😊" />
            <ScoreSlider label="Confidence & Presence" name="confidence_score"
              value={scores.confidence_score} onChange={handleScoreChange} icon="💪" />
            <ScoreSlider label="Domain Knowledge & Skills" name="knowledge_score"
              value={scores.knowledge_score} onChange={handleScoreChange} icon="🧠" />
          </div>

          {/* Overall indicator */}
          <div className={`p-3 rounded-xl bg-gray-50 text-center border`}>
            <span className="text-sm text-gray-500">Overall Interview Score: </span>
            <span className={`text-xl font-bold ${overallColor}`}>{overall}/10</span>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Interview Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={4} className="input resize-none"
              placeholder="Summarize key observations, highlights, and specific feedback from the interview..." />
          </div>

          {/* Final Decision */}
          <div>
            <label className="label">Final Decision <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setDecision('proceed'); setError(''); }}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  decision === 'proceed'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                }`}>
                ✓ Proceed to Hire
              </button>
              <button type="button" onClick={() => { setDecision('reject'); setError(''); }}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  decision === 'reject'
                    ? 'bg-red-600 border-red-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-700'
                }`}>
                ✗ Do Not Proceed
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠ {error}</div>
          )}

          <button onClick={handleSubmit} disabled={saving}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
              decision === 'proceed' ? 'bg-emerald-600 hover:bg-emerald-700'
              : decision === 'reject' ? 'bg-red-600 hover:bg-red-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}>
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : 'Save Evaluation'}
          </button>
        </div>
      </div>
    </div>
  );
}
