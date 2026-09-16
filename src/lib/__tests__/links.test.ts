import { appRedirectUri, parseAuthRedirect, APP_SCHEME } from '../links';

describe('appRedirectUri', () => {
  it('builds a scheme URI from the app config', () => {
    expect(appRedirectUri('reset-password')).toBe(`${APP_SCHEME}://reset-password`);
  });

  it('tolerates a leading slash', () => {
    expect(appRedirectUri('/reset-password')).toBe(`${APP_SCHEME}://reset-password`);
  });
});

describe('parseAuthRedirect', () => {
  it('reads the recovery session from the URL fragment', () => {
    // This is the shape Supabase actually redirects with.
    const url =
      'hustleon://reset-password#access_token=abc123&expires_in=3600&refresh_token=ref456&token_type=bearer&type=recovery';
    expect(parseAuthRedirect(url)).toEqual({
      accessToken: 'abc123',
      refreshToken: 'ref456',
      type: 'recovery',
      error: undefined,
    });
  });

  it('reads params from the query string too', () => {
    const url = 'hustleon://reset-password?access_token=q1&refresh_token=q2&type=recovery';
    const parsed = parseAuthRedirect(url);
    expect(parsed.accessToken).toBe('q1');
    expect(parsed.refreshToken).toBe('q2');
  });

  it('prefers the fragment when a key appears in both', () => {
    const url = 'hustleon://x?access_token=fromQuery#access_token=fromFragment';
    expect(parseAuthRedirect(url).accessToken).toBe('fromFragment');
  });

  it('surfaces an error redirect', () => {
    const url = 'hustleon://reset-password#error=access_denied&error_description=Link%20expired';
    const parsed = parseAuthRedirect(url);
    expect(parsed.error).toBe('Link expired');
    expect(parsed.accessToken).toBeUndefined();
  });

  it('returns nothing useful for an unrelated deep link', () => {
    const parsed = parseAuthRedirect('hustleon://some/other/route');
    expect(parsed.accessToken).toBeUndefined();
    expect(parsed.refreshToken).toBeUndefined();
    expect(parsed.error).toBeUndefined();
  });
});
