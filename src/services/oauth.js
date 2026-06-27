const AUTH_URL = 'https://auth.deriv.com/oauth2/auth';
const TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
const CLIENT_ID = process.env.REACT_APP_DERIV_CLIENT_ID || process.env.DERIV_CLIENT_ID || '';
const REDIRECT_URI = process.env.REACT_APP_DERIV_REDIRECT_URI || process.env.DERIV_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin + '/oauth/callback' : '');
const SCOPES = ['application_read'];

const buildCodeChallenge = async (codeVerifier) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const createCodeVerifier = () => {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return Array.from(array, (value) => value.toString(16).padStart(2, '0')).join('').slice(0, 64);
};

export const startOAuthLogin = async () => {
  if (!CLIENT_ID) {
    throw new Error('DERIV_CLIENT_ID is not configured.');
  }

  const codeVerifier = createCodeVerifier();
  const codeChallenge = await buildCodeChallenge(codeVerifier);
  const state = createCodeVerifier().slice(0, 32);

  sessionStorage.setItem('deriv_code_verifier', codeVerifier);
  sessionStorage.setItem('deriv_oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  window.location.href = `${AUTH_URL}?${params.toString()}`;
};

export const exchangeCodeForToken = async (code) => {
  const codeVerifier = sessionStorage.getItem('deriv_code_verifier');
  const state = sessionStorage.getItem('deriv_oauth_state');

  const response = await fetch('/api/deriv/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier || '',
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      state: state || ''
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'OAuth token exchange failed.');
  }

  return payload;
};

export const clearOAuthSession = () => {
  sessionStorage.removeItem('deriv_code_verifier');
  sessionStorage.removeItem('deriv_oauth_state');
};
