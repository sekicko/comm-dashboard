import { useState, useEffect } from 'react';
import { createAnonymousSession } from '../services/appwrite';
import { startOAuthLogin } from '../services/oauth';
import { persistPatLogin, validatePatToken } from '../services/deriv';

export default function LoginModal({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patToken, setPatToken] = useState('');

  useEffect(() => {
    // Initialize Appwrite session
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      await createAnonymousSession();
    } catch (error) {
      // Session already exists or error
    }
  };

  const handleOAuthLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await startOAuthLogin();
    } catch (err) {
      setError(err.message || 'Failed to start Deriv OAuth.');
      setLoading(false);
    }
  };

  const handlePatLogin = async (event) => {
    event.preventDefault();

    if (!patToken.trim()) {
      setError('Please enter your Deriv PAT token.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const validation = await validatePatToken(patToken.trim());
      const isValid = validation?.valid || validation?.data?.valid || validation?.authenticated || validation?.data?.authenticated;

      if (!isValid) {
        setError('Your Deriv PAT could not be validated. Please verify the token and try again.');
        return;
      }

      persistPatLogin(patToken.trim());
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to sign in with PAT.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-card">
        <div className="modal-icon">
          ✨
        </div>
        
        <h2>Welcome Back</h2>
        <p className="subtitle">Access your Deriv commission dashboard</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handlePatLogin} style={{ width: '100%', marginBottom: '16px' }}>
          <label htmlFor="pat-token" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            Deriv PAT token
          </label>
          <input
            id="pat-token"
            type="password"
            value={patToken}
            onChange={(event) => setPatToken(event.target.value)}
            placeholder="Enter your Deriv PAT"
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '8px' }}
          />
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Sign in with PAT'}
          </button>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '8px', lineHeight: 1.5 }}>
            This validates your Deriv PAT against the new account API before loading your registered apps.
          </p>
        </form>

        <div className="divider">OR CONTINUE WITH</div>

        <button className="btn-primary" onClick={handleOAuthLogin} disabled={loading}>
          {loading ? (
            <>
              <div className="spinner"></div>
              Redirecting...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Sign In with Deriv OAuth
            </>
          )}
        </button>

        <div className="divider">SECURITY</div>

        <button className="btn-secondary" onClick={handleOAuthLogin} disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Sign In with Deriv OAuth
        </button>

        <div className="modal-footer">
          Developed by <span>TRADERSHUB.SITE</span>
        </div>
      </div>
    </div>
  );
}
