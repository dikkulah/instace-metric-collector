const ifaceState = new Map();

export function enrichNetworkInterfaces(interfaces, collectedAt) {
  const ts = collectedAt ? Date.parse(collectedAt) : Date.now();
  if (Number.isNaN(ts)) {
    return interfaces.map(iface => zeroRates(iface));
  }

  return interfaces.map(iface => {
    const name = iface.name || '';
    const rx = iface.bytesReceived || 0;
    const tx = iface.bytesSent || 0;
    let state = ifaceState.get(name);

    if (!state) {
      state = { firstTs: ts, firstRx: rx, firstTx: tx, prevTs: ts, prevRx: rx, prevTx: tx };
      ifaceState.set(name, state);
      return zeroRates(iface);
    }

    if (rx < state.prevRx || tx < state.prevTx) {
      state = { firstTs: ts, firstRx: rx, firstTx: tx, prevTs: ts, prevRx: rx, prevTx: tx };
      ifaceState.set(name, state);
      return zeroRates(iface);
    }

    const dt = Math.max((ts - state.prevTs) / 1000, 0.001);
    const totalDt = Math.max((ts - state.firstTs) / 1000, 0.001);
    const instantRx = Math.max(0, (rx - state.prevRx) / dt);
    const instantTx = Math.max(0, (tx - state.prevTx) / dt);
    const avgRx = Math.max(0, (rx - state.firstRx) / totalDt);
    const avgTx = Math.max(0, (tx - state.firstTx) / totalDt);

    state.prevTs = ts;
    state.prevRx = rx;
    state.prevTx = tx;
    ifaceState.set(name, state);

    return { ...iface, instantRx, instantTx, avgRx, avgTx };
  });
}

function zeroRates(iface) {
  return {
    ...iface,
    instantRx: 0,
    instantTx: 0,
    avgRx: 0,
    avgTx: 0
  };
}

export function formatBitrate(bytesPerSecond) {
  const bps = Number(bytesPerSecond);
  if (!Number.isFinite(bps) || bps <= 0) {
    return '0 B/s';
  }
  if (bps < 1024) {
    return bps.toFixed(0) + ' B/s';
  }
  if (bps < 1024 * 1024) {
    return (bps / 1024).toFixed(1) + ' KB/s';
  }
  if (bps < 1024 * 1024 * 1024) {
    return (bps / (1024 * 1024)).toFixed(1) + ' MB/s';
  }
  return (bps / (1024 * 1024 * 1024)).toFixed(2) + ' GB/s';
}

export function rateBarWidth(value, max) {
  const safeMax = Math.max(max, 1);
  return Math.min(100, ((value || 0) / safeMax) * 100);
}
