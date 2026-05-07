import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { checkMyApprovalStatus } from '../services/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [screen, setScreen] = useState('loading');
  const [userEmail, setUserEmail] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    const token  = params.get('token');
    const role   = params.get('role');
    const name   = params.get('name');
    const status = params.get('status');
    const email  = params.get('email');

    if (token && role) {
      localStorage.setItem('hr_token', token);
      localStorage.setItem('hr_user', JSON.stringify({
        name: decodeURIComponent(name || ''),
        role,
      }));
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(role === 'interviewer' ? '/interviewer/applications' : '/hr', { replace: true });
      }
      return;
    }

    if (status === 'pending') {
      setScreen('pending');
      if (email) setUserEmail(decodeURIComponent(email));
      return;
    }
    if (status === 'pending_role') { setScreen('pending_role'); return; }
    if (status === 'rejected')     { setScreen('rejected');     return; }
    if (status === 'approved')     { setScreen('approved');     return; }
    if (status === 'wrong_role') {
      const assigned = params.get('assigned');
      setScreen({ type: 'wrong_role', assigned });
      return;
    }

    if (status === 'unauthorized') {
      const reason = params.get('reason');
      if (email) setUserEmail(decodeURIComponent(email));
      if (reason === 'invalid_domain') {
        setScreen('invalid_domain');
        return;
      }
    }

    setScreen('failed');
  }, [navigate, params]);

  // Poll for approval when on pending or pending_role screen
  useEffect(() => {
    if ((screen !== 'pending' && screen !== 'pending_role') || !userEmail) return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await checkMyApprovalStatus(userEmail);
        if (data.approval_status === 'rejected') {
          clearInterval(pollRef.current);
          setScreen('rejected');
        } else if (data.approval_status === 'approved' && data.role) {
          clearInterval(pollRef.current);
          setScreen('approved');
        } else if (data.approval_status === 'approved' && !data.role) {
          setScreen('pending_role');
        }
      } catch (_) {}
    }, 5000);

    return () => clearInterval(pollRef.current);
  }, [screen, userEmail]);

  if (screen === 'loading') {
    return (
      <Screen>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
             style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        <p style={{ color: 'var(--color-text-muted)' }}>Signing you in...</p>
      </Screen>
    );
  }

  if (screen === 'pending') {
    return (
      <Screen>
        <div className="text-4xl mb-4">⏳</div>
        <h2 className="text-lg font-semibold mb-2">Waiting for Approval</h2>
        <p className="text-sm mb-4 max-w-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          Your login request has been submitted. An admin will review and approve your access shortly.
        </p>
        <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--color-text-subtle)' }}>
          <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin"
               style={{ borderColor: 'var(--color-text-subtle)', borderTopColor: 'transparent' }} />
          Checking for updates automatically...
        </div>
        <a href="/hiring" className="btn-secondary text-sm" style={{ textDecoration: 'none' }}>
          ← Back to Login
        </a>
      </Screen>
    );
  }

  if (screen === 'approved') {
    return (
      <Screen>
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-lg font-semibold mb-2">Approval Successful!</h2>
        <p className="text-sm mb-6 max-w-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          Your account has been approved and a role has been assigned. You can now sign in.
        </p>
        <a href="/hiring" className="btn-primary text-sm" style={{ textDecoration: 'none' }}>
          Go to Login
        </a>
      </Screen>
    );
  }

  if (screen === 'pending_role') {
    return (
      <Screen>
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-lg font-semibold mb-2">Account Approved</h2>
        <p className="text-sm mb-4 max-w-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          Your account has been approved. Waiting for an admin to assign your role.
        </p>
        <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--color-text-subtle)' }}>
          <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin"
               style={{ borderColor: 'var(--color-text-subtle)', borderTopColor: 'transparent' }} />
          Checking for updates automatically...
        </div>
        <a href="/hiring" className="btn-secondary text-sm" style={{ textDecoration: 'none' }}>
          ← Back to Login
        </a>
      </Screen>
    );
  }

  if (screen?.type === 'wrong_role') {
    const roleLabels = { hr: 'HR Manager', interviewer: 'Interviewer', admin: 'Admin' };
    const assigned = screen.assigned;
    return (
      <Screen>
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-lg font-semibold mb-2">Wrong Role Selected</h2>
        <p className="text-sm mb-3 max-w-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          Please check your assigned role. You are not authorised to log in under that role.
        </p>
        {assigned && (
          <p className="text-xs mb-6 px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}>
            Your assigned role is <strong>{roleLabels[assigned] || assigned}</strong>. Please select that role and try again.
          </p>
        )}
        <a href="/hiring" className="btn-primary text-sm" style={{ textDecoration: 'none' }}>
          ← Back to Login
        </a>
      </Screen>
    );
  }

  if (screen === 'invalid_domain') {
    return (
      <Screen>
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-lg font-semibold mb-2">Company Email Required</h2>
        <p className="text-sm mb-2 max-w-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          Please sign in with your company email address.
        </p>
        <p className="text-xs mb-6 px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}>
          Allowed domains: <strong>@zentiti.com</strong> or <strong>@synersys.com</strong>
          {userEmail && <div className="mt-2">You tried: <strong>{userEmail}</strong></div>}
        </p>
        <a href="/hiring" className="btn-secondary text-sm" style={{ textDecoration: 'none' }}>
          ← Back to Login
        </a>
      </Screen>
    );
  }

  if (screen === 'rejected') {
    return (
      <Screen>
        <div className="text-4xl mb-4">🚫</div>
        <h2 className="text-lg font-semibold mb-2">Access Rejected</h2>
        <p className="text-sm mb-6 max-w-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          Your login request was not approved. Please contact your administrator if you believe this is a mistake.
        </p>
        <a href="/hiring" className="btn-secondary text-sm" style={{ textDecoration: 'none' }}>
          ← Back to Login
        </a>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-lg font-semibold mb-2">Authentication Failed</h2>
      <p className="text-sm mb-6 max-w-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
        Something went wrong during sign-in. Please try again.
      </p>
      <a href="/hiring" className="btn-secondary text-sm" style={{ textDecoration: 'none' }}>
        ← Back to Login
      </a>
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'var(--color-bg-page)' }}>
      <div className="card p-8 w-full max-w-sm text-center flex flex-col items-center">
        <img src="/synersys-logo.png" alt="Zentiti" className="mb-6" style={{ height: '36px', width: 'auto' }} />
        {children}
      </div>
    </div>
  );
}
