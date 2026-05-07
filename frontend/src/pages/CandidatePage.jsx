import { useState } from 'react';
import { submitApplication } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const DOMAINS = [
  'Software Engineering', 'Data Science', 'Cloud & DevOps',
  'IT', 'Product Management', 'Marketing & Growth', 'Finance',
  'HR', 'Design (UI/UX)', 'Sales',
  'Operations', 'Customer Success',
];

const EDUCATION_LEVELS = [
  'High School',
  'Diploma',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD / Doctorate',
];

export default function CandidatePage() {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    preferred_domain: '', secondary_domain: '',
    education: '', years_of_experience: '',
    night_shift: '',
  });
  const [salary, setSalary]             = useState({ min: 3, max: 15, flexible: false });
  const [cvFile, setCvFile]             = useState(null);
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState('');

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.full_name.trim())        return setError('Full Name is required.');
    if (!form.email.trim())            return setError('Email address is required.');
    if (!form.phone.trim())            return setError('Phone Number is required.');
    if (!form.preferred_domain)        return setError('Preferred Domain is required.');
    if (!form.years_of_experience)     return setError('Years of Experience is required.');
    if (!form.education)               return setError('Highest Level of Education is required.');
    if (!form.night_shift)             return setError('Night Shift Availability is required.');
    if (!cvFile)                       return setError('CV is required.');

    const domains = [form.preferred_domain, form.secondary_domain].filter(Boolean);

    const data = new FormData();
    data.append('full_name',    form.full_name.trim());
    data.append('email',        form.email.trim());
    data.append('phone',        form.phone.trim());
    data.append('primary_role', form.preferred_domain);
    data.append('preferred_domains', JSON.stringify(domains));

    if (form.education)            data.append('education', form.education);
    if (form.years_of_experience)  data.append('years_of_experience', form.years_of_experience);

    if (salary.flexible) {
      data.append('salary_flexible', 'true');
    } else {
      data.append('salary_flexible', 'false');
      data.append('salary_min', salary.min);
      data.append('salary_max', salary.max);
    }

    data.append('night_shift_preference', form.night_shift);

    if (coverLetterFile) data.append('cover_letter_file', coverLetterFile);
    data.append('cv', cvFile);

    setLoading(true);
    try {
      await submitApplication(data);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSuccess(false);
    setForm({ full_name: '', email: '', phone: '', preferred_domain: '', secondary_domain: '', education: '', years_of_experience: '', night_shift: '' });
    setSalary({ min: 3, max: 15, flexible: false });
    setCvFile(null);
    setCoverLetterFile(null);
    setError('');
  }

  // ── Success ─────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
           style={{ background: 'var(--color-bg-page)' }}>
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
               style={{ background: 'var(--color-success-bg)' }}>
            <svg className="w-10 h-10" style={{ color: 'var(--color-success)' }}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3">Application Submitted!</h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Your submission has been successful. Our team will contact you shortly.
          </p>
          <button onClick={resetForm} className="btn-primary w-full">
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 w-full"
              style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/synersys-logo.png" alt="Synersys" style={{ height: '32px', width: 'auto' }} />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight"
              style={{ color: '#1e3a5f', letterSpacing: '-0.02em' }}>
            Application Form
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Fill out the form below — our team will be in touch soon.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* 1 — Personal Information */}
          <Section number={1} title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-sm">Full Name <Req /></label>
                <input name="full_name" value={form.full_name} onChange={handleChange}
                       className="input text-sm" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="label text-sm">Email Address <Req /></label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                       className="input text-sm" placeholder="jane@example.com" />
              </div>
              <div>
                <label className="label text-sm">Phone Number <Req /></label>
                <input name="phone" value={form.phone} onChange={handleChange}
                       className="input text-sm" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="label text-sm">Years of Experience <Req /></label>
                <input name="years_of_experience" type="number" min="0" max="50"
                       value={form.years_of_experience} onChange={handleChange}
                       className="input text-sm" placeholder="e.g. 3" />
              </div>
            </div>
          </Section>

          {/* 2 — Domain Preferences */}
          <Section number={2} title="Domain Preferences">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-sm">Preferred Domain <Req /></label>
                <select name="preferred_domain" value={form.preferred_domain} onChange={handleChange}
                        className="input select text-sm">
                  <option value="" disabled hidden>— Select domain —</option>
                  {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-sm">Secondary Domain</label>
                <select name="secondary_domain" value={form.secondary_domain} onChange={handleChange}
                        className="input select text-sm">
                  <option value="" disabled hidden>— Select domain —</option>
                  {DOMAINS.filter((d) => d !== form.preferred_domain).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          {/* 3 — Education */}
          <Section number={3} title="Education">
            <label className="label text-sm">Highest Level of Education <Req /></label>
            <select name="education" value={form.education} onChange={handleChange}
                    className="input select text-sm">
              <option value="" disabled hidden>— Select education level —</option>
              {EDUCATION_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </Section>

          {/* 4 — Salary */}
          <Section number={4} title="Salary Expectations">
            <div className="flex items-center gap-3 mb-4">
              <button type="button"
                      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none overflow-hidden"
                      style={{ background: salary.flexible ? 'var(--color-primary)' : 'var(--color-border-hover)' }}
                      onClick={() => setSalary((s) => ({ ...s, flexible: !s.flexible }))}>
                <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform"
                      style={{ transform: salary.flexible ? 'translateX(20px)' : 'translateX(0)' }} />
              </button>
              <span className="text-sm font-medium">Flexible / Negotiable</span>
            </div>

            {!salary.flexible && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label text-sm">Minimum (&#8377; LPA CTC)</label>
                    <input type="number" className="input text-sm" step={1} min={1} max={100}
                           value={salary.min}
                           onChange={(e) => setSalary((s) => ({ ...s, min: Math.min(+e.target.value || 1, s.max) }))} />
                  </div>
                  <div>
                    <label className="label text-sm">Maximum (&#8377; LPA CTC)</label>
                    <input type="number" className="input text-sm" step={1} min={1} max={100}
                           value={salary.max}
                           onChange={(e) => setSalary((s) => ({ ...s, max: Math.max(+e.target.value || 1, s.min) }))} />
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Range: <strong>&#8377;{salary.min} LPA</strong> – <strong>&#8377;{salary.max} LPA CTC</strong>
                </p>
              </div>
            )}
          </Section>

          {/* 5 — Night Shift */}
          <Section number={5} title="Night Shift Availability">
            <label className="label text-sm">Are you comfortable working night shifts? <Req /></label>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Synersys operates on US time zones (EST / PST). Night shift is mandatory for all roles.
            </p>
            <div className="flex flex-wrap gap-3">
              {['Yes', 'No', 'Negotiable'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, night_shift: opt }))}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                  style={{
                    borderColor: form.night_shift === opt ? 'var(--color-primary)' : 'var(--color-border)',
                    background:  form.night_shift === opt ? 'var(--color-primary-subtle)' : 'transparent',
                    color:       form.night_shift === opt ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  }}>
                  {opt === 'Yes' ? '✓ Yes' : opt === 'No' ? '✗ No' : '~ Negotiable'}
                </button>
              ))}
            </div>
          </Section>

          {/* 6 — Cover Letter */}
          <Section number={6} title="Cover Letter">
            <label className="label text-sm">Cover Letter File</label>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
              This is your chance to stand out — mention anything that makes you a strong fit for Synersys.
            </p>
            <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all"
                   style={{
                     borderColor: coverLetterFile ? 'var(--color-success)' : 'var(--color-border)',
                     background:  coverLetterFile ? 'var(--color-success-bg)' : 'transparent',
                   }}>
              <input type="file" className="sr-only" accept=".pdf,.doc,.docx"
                     onChange={(e) => setCoverLetterFile(e.target.files[0] || null)} />
              {coverLetterFile ? (
                <div className="text-center pointer-events-none">
                  <div className="text-xl mb-1">📄</div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>{coverLetterFile.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {(coverLetterFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center pointer-events-none">
                  <div className="text-2xl mb-1">☁️</div>
                  <p className="text-sm font-medium">Click to upload Cover Letter</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>PDF, DOC, DOCX</p>
                </div>
              )}
            </label>
            {coverLetterFile && (
              <button type="button" onClick={() => setCoverLetterFile(null)}
                      className="text-xs mt-2 hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--color-danger)' }}>
                × Remove file
              </button>
            )}
          </Section>

          {/* 7 — CV Upload */}
          <Section number={7} title="CV / Resume" subtitle="PDF, DOC, DOCX — max 10 MB">
            <label className="label text-sm">CV <Req /></label>
            <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all"
                   style={{
                     borderColor: cvFile ? 'var(--color-success)' : 'var(--color-border)',
                     background:  cvFile ? 'var(--color-success-bg)' : 'transparent',
                   }}>
              <input type="file" className="sr-only" accept=".pdf,.doc,.docx"
                     onChange={(e) => setCvFile(e.target.files[0] || null)} />
              {cvFile ? (
                <div className="text-center pointer-events-none">
                  <div className="text-xl mb-1">📄</div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>{cvFile.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center pointer-events-none">
                  <div className="text-2xl mb-1">☁️</div>
                  <p className="text-sm font-medium">Click to upload your CV</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>PDF, DOC, DOCX</p>
                </div>
              )}
            </label>
            {cvFile && (
              <button type="button" onClick={() => setCvFile(null)}
                      className="text-xs mt-2 hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--color-danger)' }}>
                × Remove file
              </button>
            )}
          </Section>

          {/* Error */}
          {error && (
            <div className="alert-error mb-4">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm font-semibold">
            {loading ? <><Spinner /> Submitting...</> : 'Submit Application →'}
          </button>

        </form>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ number, title, subtitle, children }) {
  return (
    <div className="card p-6 mb-5">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
              style={{ background: 'var(--color-primary)' }}>
          {number}
        </span>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            {title}
          </h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Req() {
  return <span style={{ color: 'var(--color-danger)' }}> *</span>;
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}
