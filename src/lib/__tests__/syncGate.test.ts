// The Cloud Sync privacy toggle must actually stop sync. It was rendered in the
// UI for a while without `sync.ts` ever reading it, so everything uploaded
// regardless of its position.
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn(),
}));

const mockGetSession = jest.fn();
const mockFrom = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { syncNow } from '../sync';
import { useStore } from '../../store';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
  useStore.setState({ syncStatus: 'idle' });
});

describe('syncNow honours the Cloud Sync toggle', () => {
  it('does not touch the network when cloudSync is off', async () => {
    useStore.setState({
      privacySettings: { cloudSync: false, analytics: true, shareDataWithAI: true },
    });

    await syncNow();

    expect(mockFrom).not.toHaveBeenCalled();
    expect(useStore.getState().syncStatus).toBe('disabled');
  });

  it('proceeds past the gate when cloudSync is on', async () => {
    useStore.setState({
      privacySettings: { cloudSync: true, analytics: true, shareDataWithAI: true },
    });
    // Fail the first query so the pass stops early, but we still prove we got
    // past the gate and started talking to Supabase.
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: new Error('stop') }) }),
      }),
    });

    await syncNow();

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(useStore.getState().syncStatus).not.toBe('disabled');
  });

  it('does nothing at all when signed out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await syncNow();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
