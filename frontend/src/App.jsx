import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HRLoginPage             from './pages/HRLoginPage';
import AuthCallback            from './pages/AuthCallback';
import HRDashboard             from './pages/HRDashboard';
import HRCandidateDetail       from './pages/HRCandidateDetail';
import HRResumeMatch           from './pages/HRResumeMatch';
import HRAnalytics             from './pages/HRAnalytics';
import InterviewerDashboard    from './pages/InterviewerDashboard';
import InterviewerApplications from './pages/InterviewerApplications';
import InterviewerDetail       from './pages/InterviewerDetail';
import AdminPage               from './pages/AdminPage';

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('hr_user') || 'null'); }
  catch { return null; }
}

function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem('hr_token');
  const user  = getStoredUser();

  if (!token || !user) return <Navigate to="/hiring" replace />;

  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'admin')       return <Navigate to="/admin" replace />;
    if (user.role === 'interviewer') return <Navigate to="/interviewer/applications" replace />;
    return <Navigate to="/hr" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Hiring Portal (staff login + all dashboards) ── */}
        <Route path="/hiring"         element={<HRLoginPage />} />
        <Route path="/auth/callback"  element={<AuthCallback />} />

        {/* HR */}
        <Route path="/hr" element={
          <ProtectedRoute requiredRole="hr"><HRDashboard /></ProtectedRoute>
        } />
        <Route path="/hr/candidate/:id" element={
          <ProtectedRoute requiredRole="hr"><HRCandidateDetail /></ProtectedRoute>
        } />
        <Route path="/hr/match" element={
          <ProtectedRoute requiredRole="hr"><HRResumeMatch /></ProtectedRoute>
        } />
        <Route path="/hr/analytics" element={
          <ProtectedRoute requiredRole="hr"><HRAnalytics /></ProtectedRoute>
        } />

        {/* Interviewer */}
        <Route path="/interviewer" element={<Navigate to="/interviewer/applications" replace />} />
        <Route path="/interviewer/applications" element={
          <ProtectedRoute requiredRole="interviewer"><InterviewerApplications /></ProtectedRoute>
        } />
        <Route path="/interviewer/candidate/:id" element={
          <ProtectedRoute requiredRole="interviewer"><InterviewerDetail /></ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/hiring" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
