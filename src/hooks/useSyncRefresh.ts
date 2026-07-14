import { useCallback, useState } from 'react';
import { syncNow } from '../lib/sync';
import { haptics } from '../utils/haptics';

/** Pull-to-refresh handler that runs a manual cloud sync. */
export function useSyncRefresh() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.light();
    try {
      await syncNow();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refreshing, onRefresh };
}
