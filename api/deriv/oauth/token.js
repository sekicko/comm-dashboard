export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, code_verifier, redirect_uri, client_id, state } = req.body || {};

  if (!code || !code_verifier || !redirect_uri || !client_id) {
    return res.status(400).json({ error: 'Missing required OAuth parameters.' });
  }

  const response = await fetch('https://auth.deriv.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id,
      redirect_uri,
      code,
      code_verifier,
      state: state || ''
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return res.status(response.status).json(payload);
  }

  return res.status(200).json(payload);
}
