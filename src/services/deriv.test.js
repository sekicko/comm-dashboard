import { getMarkupStatistics, persistPatLogin } from './deriv';

describe('persistPatLogin', () => {
  it('stores a PAT-based login session for the app', () => {
    localStorage.clear();

    persistPatLogin('pat-token-123');

    expect(localStorage.getItem('deriv_pat')).toBe('pat-token-123');
    expect(localStorage.getItem('deriv_login_mode')).toBe('pat');
    expect(localStorage.getItem('deriv_loginid')).toBe('pat');
  });
});

describe('getMarkupStatistics', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('deriv_oauth_access_token', 'test-token');
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns totals and breakdown from the markup statistics endpoint', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          total_app_markup_usd: 123.45,
          total_volume_usd: 1000,
          total_payout_usd: 10.5,
          total_contract_count: 7,
          total_client_count: 3,
          breakdown: [
            { app_id: 1001, app_markup_usd: 50, volume_usd: 400, payout_usd: 5, contract_count: 2, client_count: 1 },
            { app_id: 1002, app_markup_usd: 73.45, volume_usd: 600, payout_usd: 5.5, contract_count: 5, client_count: 2 }
          ]
        }
      })
    });

    const result = await getMarkupStatistics('2024-01-01', '2024-01-31');

    expect(result.data.total_app_markup_usd).toBe(123.45);
    expect(result.data.breakdown).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/applications/v1/markup-statistics?date_from=2024-01-01&date_to=2024-01-31'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer '),
          'Deriv-App-ID': expect.any(String)
        })
      })
    );
  });

  it('throws a clear message for expired or invalid OAuth tokens', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'invalid_token' })
    });

    await expect(getMarkupStatistics('2024-01-01', '2024-01-31')).rejects.toThrow('Your Deriv session expired. Please sign in again.');
  });

  it('throws a clear message for missing scopes', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'insufficient_scope' })
    });

    await expect(getMarkupStatistics('2024-01-01', '2024-01-31')).rejects.toThrow('The requested scope is missing. Please sign in again and allow application_read.');
  });

  it('throws a clear message for invalid ranges', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ message: 'invalid date range' })
    });

    await expect(getMarkupStatistics('2024-01-01', '2024-01-31')).rejects.toThrow('The requested date range is invalid. Please choose a valid range.');
  });

  it('returns zeroed totals when the breakdown is empty', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          total_app_markup_usd: 0,
          total_volume_usd: 0,
          total_payout_usd: 0,
          total_contract_count: 0,
          total_client_count: 0,
          breakdown: []
        }
      })
    });

    const result = await getMarkupStatistics('2024-02-01', '2024-02-15');

    expect(result.data.breakdown).toEqual([]);
    expect(result.data.total_app_markup_usd).toBe(0);
  });
});
