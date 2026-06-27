import { useEffect, useState } from 'react';
import { exchangeCodeForToken, clearOAuthSession } from '../services/oauth';

export default function OAuthCallback() {
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState('');

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      const code = params.get('code');
      const state = params.get('state');
      const storedState = sessionStorage.getItem('deriv_oauth_state');

      if (error) {
        throw new Error(params.get('error_description') || 'Deriv OAuth failed.');
      }

      if (!code) {
        throw new Error('No authorization code returned from Deriv OAuth.');
      }

      if (storedState && state && storedState !== state) {
        throw new Error('OAuth state mismatch. Please try signing in again.');
      }

      const tokenPayload = await exchangeCodeForToken(code);
      const accessToken = tokenPayload.access_token;

      if (!accessToken) {
        throw new Error('No access token returned by Deriv OAuth.');
      }

      if (!tokenPayload.scope?.includes('application_read')) {
        throw new Error('The OAuth response is missing application_read. Please allow the required scope.');
      }

      localStorage.setItem('deriv_oauth_access_token', accessToken);
      localStorage.setItem('deriv_token', accessToken);
      localStorage.setItem('deriv_loginid', 'oauth');
      localStorage.setItem('deriv_oauth_scope', tokenPayload.scope || '');
      clearOAuthSession();

      setStatus('Success!');
      window.location.href = '/';
    } catch (err) {
      clearOAuthSession();
      setError(err.message || 'Failed to complete OAuth login');
      setStatus('Error');
    }
  };

  return (
    <div className="oauth-callback">
      <div className="oauth-callback-card">
        {error ? (
          <>
            <div className="oauth-icon error">❌</div>
            <h2>Authentication Failed</h2>
            <p className="error-message">{error}</p>
            <button 
              className="btn-primary" 
              onClick={() => window.location.href = '/'}
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <div className="oauth-icon">
              <div className="spinner-large"></div>
            </div>
            <h2>{status}</h2>
            <p className="subtitle">Please wait while we set up your account...</p>
          </>
        )}
      </div>
    </div>
  );
}
