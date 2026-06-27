import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { disconnectDeriv } from './services/deriv';
import { clearOAuthSession } from './services/oauth';
import LoginModal from './components/LoginModal';
import Dashboard from './pages/Dashboard';
import OAuthCallback from './pages/OAuthCallback';
import AdminDashboard from './pages/AdminDashboard';

// Check for OAuth callback and redirect if needed
function OAuthRedirectHandler() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  
  // Check if this is an OAuth callback (has acct1 parameter)
  if (params.has('acct1') || params.has('token1')) {
    // Preserve the query string when redirecting
    const callbackUrl = `/oauth/callback?${params.toString()}`;
    return <Navigate to={callbackUrl} replace />;
  }
  
  return null;
}

// Check for token in localStorage on initial load
const getInitialState = () => {
  const token = localStorage.getItem('deriv_oauth_access_token') || localStorage.getItem('deriv_token');
  const loginId = localStorage.getItem('deriv_loginid');
  return {
    hasToken: !!(token && loginId),
    loading: false
  };
};

const initialState = getInitialState();

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(initialState.loading);
  const [hasToken, setHasToken] = useState(initialState.hasToken);

  useEffect(() => {
    const token = localStorage.getItem('deriv_oauth_access_token') || localStorage.getItem('deriv_token');
    const loginId = localStorage.getItem('deriv_loginid');

    if (token && loginId) {
      setHasToken(true);
      setLoggedIn(true);
      setLoading(false);
    } else {
      setLoading(false);
      setHasToken(false);
    }
  }, []);

  const logout = () => {
    disconnectDeriv();
    clearOAuthSession();
    localStorage.removeItem('deriv_loginid');
    localStorage.removeItem('deriv_oauth_access_token');
    localStorage.removeItem('deriv_oauth_scope');
    setLoggedIn(false);
    setHasToken(false);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <div>
          {hasToken ? (
            <>Connecting to Deriv API...</>
          ) : (
            <>Loading your dashboard...</>
          )}
        </div>
      </div>
    );
  }

  return (
    <Router>
      <OAuthRedirectHandler />
      <Routes>
        <Route 
          path="/oauth/callback" 
          element={<OAuthCallback />} 
        />
        <Route 
          path="/admindashboard" 
          element={<AdminDashboard />} 
        />
        <Route 
          path="/" 
          element={
            loggedIn ? (
              <Dashboard onLogout={logout} />
            ) : (
              <LoginModal onSuccess={() => setLoggedIn(true)} />
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
