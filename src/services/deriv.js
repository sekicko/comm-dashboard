const APP_ID = process.env.REACT_APP_DERIV_APP_ID || process.env.DERIV_APP_ID || '105603';
const DERIV_API_BASE_URL = process.env.REACT_APP_DERIV_API_BASE_URL || process.env.DERIV_API_BASE_URL || 'https://api.deriv.com';
const MARKUP_STATISTICS_URL = `${DERIV_API_BASE_URL}/applications/v1/markup-statistics`;
const REGISTERED_APPS_URL = `${DERIV_API_BASE_URL}/accounts/v1/registered-apps`;
const VALIDATE_PAT_URL = `${DERIV_API_BASE_URL}/accounts/v1/validate-pat`;

const getStoredToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('deriv_oauth_access_token') || localStorage.getItem('deriv_token');
};

const getAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Deriv-App-ID': APP_ID,
  'X-Deriv-App-Id': APP_ID,
  Accept: 'application/json'
});

const parseApiError = async (response, fallbackMessage) => {
  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  const message = payload.message || payload.error_description || payload.error || fallbackMessage;

  if (response.status === 401) {
    throw new Error('Your Deriv session expired. Please sign in again.');
  }

  if (response.status === 403) {
    throw new Error('The requested scope is missing. Please sign in again and allow application_read.');
  }

  if (response.status === 422) {
    throw new Error('The requested date range is invalid. Please choose a valid range.');
  }

  throw new Error(message || fallbackMessage);
};

export const connectDeriv = async (token) => {
  localStorage.setItem('deriv_token', token);
  return { authorize: { loginid: 'oauth' } };
};

export const persistPatLogin = (token) => {
  localStorage.setItem('deriv_pat', token);
  localStorage.setItem('deriv_login_mode', 'pat');
  localStorage.setItem('deriv_loginid', 'pat');
  localStorage.setItem('deriv_token', token);
};

export const clearPatLogin = () => {
  localStorage.removeItem('deriv_pat');
  localStorage.removeItem('deriv_login_mode');
};

export const validatePatToken = async (token) => {
  const response = await fetch(VALIDATE_PAT_URL, {
    method: 'GET',
    headers: getAuthHeaders(token)
  });

  if (!response.ok) {
    await parseApiError(response, 'Failed to validate your Deriv PAT.');
  }

  const payload = await response.json();
  return payload;
};

export const getMarkupStatistics = async (date_from, date_to) => {
  const token = getStoredToken();

  if (!token) {
    throw new Error('Please sign in with Deriv OAuth before loading markup statistics.');
  }

  const url = new URL(MARKUP_STATISTICS_URL);
  url.searchParams.set('date_from', date_from);
  url.searchParams.set('date_to', date_to);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(token)
  });

  if (!response.ok) {
    await parseApiError(response, 'Failed to load markup statistics.');
  }

  const payload = await response.json();
  return payload;
};

export const getCommission = async (date_from, date_to) => {
  return getMarkupStatistics(date_from, date_to);
};

export const getRegisteredApps = async () => {
  const loginMode = getLoginMode();
  const token = loginMode === 'pat' ? localStorage.getItem('deriv_pat') || getStoredToken() : getStoredToken();

  if (!token) {
    throw new Error('Please sign in to load your registered Deriv apps.');
  }

  const response = await fetch(REGISTERED_APPS_URL, {
    method: 'GET',
    headers: getAuthHeaders(token)
  });

  if (!response.ok) {
    await parseApiError(response, 'Failed to load registered Deriv apps.');
  }

  return response.json();
};

export const getAppList = async () => {
  const payload = await getRegisteredApps();
  const appList = payload?.data?.apps || payload?.apps || payload?.app_list || [];
  return { app_list: appList, raw: payload };
};

export const getAppDetails = async () => {
  return {};
};

export const disconnectDeriv = () => {
  localStorage.removeItem('deriv_token');
  localStorage.removeItem('deriv_oauth_access_token');
  localStorage.removeItem('deriv_loginid');
  localStorage.removeItem('deriv_pat');
  localStorage.removeItem('deriv_login_mode');
};

export const isConnected = () => {
  return !!getStoredToken();
};

export const getLoginMode = () => {
  return localStorage.getItem('deriv_login_mode') || 'oauth';
};

export const getAuthStatus = () => ({
  isConnected: isConnected(),
  hasWS: false
});

