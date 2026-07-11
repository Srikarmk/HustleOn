import { captureError, captureMessage } from '../monitoring';

describe('monitoring fallback (no Sentry DSN configured)', () => {
  it('captureError falls back to console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    captureError(new Error('boom'), { scope: 'test' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('captureMessage does not throw', () => {
    expect(() => captureMessage('hello', { a: 1 })).not.toThrow();
  });
});
