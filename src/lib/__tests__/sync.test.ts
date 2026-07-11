// Keep importing sync.ts side-effect-free in the test env.
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));
jest.mock('../supabase', () => ({ supabase: {} }));

import { decideSyncDirection } from '../sync';

describe('decideSyncDirection (last-write-wins)', () => {
  const older = '2026-01-01T00:00:00.000Z';
  const newer = '2026-06-01T00:00:00.000Z';

  it('pulls when remote is newer', () => {
    expect(decideSyncDirection(older, newer)).toBe('pull');
  });

  it('pushes when local is newer', () => {
    expect(decideSyncDirection(newer, older)).toBe('push');
  });

  it('pushes when there is no remote row yet', () => {
    expect(decideSyncDirection(newer, null)).toBe('push');
  });

  it('is a no-op when timestamps are the same instant across formats (Z vs +00:00)', () => {
    expect(decideSyncDirection('2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00+00:00')).toBe('noop');
  });
});
