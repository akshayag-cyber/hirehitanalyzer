import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const ROLES = [
  {
    key: 'hr',
    label: 'HR Manager',
    loginPath: '/hr/login',
    description: 'Review applications, run AI matching, manage candidate pipeline and decisions.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    ),
    accent: 'var(--color-primary)',
    accentBg: 'var(--color-primary-subtle)',
  },
  {
    key: 'admin',
    label: 'Admin',
    loginPath: '/admin/login',
    description: 'Manage users, override AI scores, view audit logs and platform-wide settings.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    accent: '#e05c2e',
    accentBg: 'rgba(224,92,46,0.1)',
  },
  {
    key: 'interviewer',
    label: 'Interviewer',
    loginPath: '/interviewer/login',
    description: 'Access assigned candidates, submit evaluation scores and hiring decisions.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    accent: '#8b5cf6',
    accentBg: 'rgba(139,92,246,0.1)',
  },
];

export default function HiringLanding() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('hr_token');
    const user  = getStoredUser();
    if (token && user) {
      if (user.role === 'admin')        navigate('/admin', { replace: true });
      else if (user.role === 'interviewer') navigate('/interviewer/applications', { replace: true });
      else                              navigate('/hr', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-page)' }}>

      {/* Top bar */}
      <header style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <img src="/synersys-logo.png" alt="Zentiti" style={{ height: '28px', width: 'auto' }} />
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">

        {/* Heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
               style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            Staff Portal
          </div>
          <h1 className="text-3xl font-bold mb-3">Welcome to the Hiring Portal</h1>
          <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>
            Select your role to sign in
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
          {ROLES.map((role) => (
            <button key={role.key}
                    onClick={() => navigate(role.loginPath)}
                    className="card p-6 text-left flex flex-col gap-4 transition-all group"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = role.accent;
                      e.currentTarget.style.boxShadow  = `0 0 0 1px ${role.accent}`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.boxShadow  = '';
                    }}>

              {/* Icon badge */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: role.accentBg, color: role.accent }}>
                {role.icon}
              </div>

              {/* Text */}
              <div className="flex-1">
                <p className="font-bold text-base mb-1">{role.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {role.description}
                </p>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-1 text-sm font-semibold"
                   style={{ color: role.accent }}>
                Sign In
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Back link */}
        <p className="mt-10 text-sm" style={{ color: 'var(--color-text-subtle)' }}>
          Looking to apply?{' '}
          <a href="/" style={{ color: 'var(--color-primary)' }} className="hover:opacity-80 transition-opacity">
            Go to the Job Application Form →
          </a>
        </p>
      </main>
    </div>
  );
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('hr_user') || 'null'); } catch { return null; }
}
