export function loadJsonSet(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function createMetricsStream({
  onSnapshot,
  onLiveChange,
  refreshInterval = 5000
}) {
  let eventSource = null;
  let lastMetricsAt = 0;
  let pollTimer = null;

  function applySnapshot(snapshot) {
    lastMetricsAt = Date.now();
    onLiveChange?.(true);
    try {
      onSnapshot?.(snapshot);
    } catch (err) {
      console.error('Snapshot render error', err);
    }
  }

  function markOfflineIfStale() {
    if (!lastMetricsAt || Date.now() - lastMetricsAt > refreshInterval * 3) {
      onLiveChange?.(false);
    }
  }

  async function fetchCurrentSnapshot() {
    try {
      const res = await fetch('/api/metrics/current', { cache: 'no-store' });
      if (res.status === 204 || !res.ok) {
        markOfflineIfStale();
        return false;
      }
      applySnapshot(await res.json());
      return true;
    } catch (err) {
      console.warn('Metrics fetch failed', err);
      markOfflineIfStale();
      return false;
    }
  }

  function connectSse() {
    if (eventSource) {
      eventSource.close();
    }
    eventSource = new EventSource('/api/metrics/stream');
    eventSource.addEventListener('metrics', (e) => {
      try {
        applySnapshot(JSON.parse(e.data));
      } catch (err) {
        console.warn('SSE parse error', err);
      }
    });
    eventSource.onerror = () => {
      fetchCurrentSnapshot();
    };
  }

  function startPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
    }
    pollTimer = setInterval(() => {
      fetchCurrentSnapshot();
    }, refreshInterval);
  }

  async function start() {
    await fetchCurrentSnapshot();
    connectSse();
    startPolling();
  }

  function stop() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  return { start, stop, fetchCurrentSnapshot };
}
