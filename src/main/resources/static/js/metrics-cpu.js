/** CPU helpers — system-wide (0–100%) vs per-core (ps aux) semantics. */

export function getCpuCores(payload) {
  const cores = payload?.availableProcessors;
  return cores && cores > 0 ? cores : 1;
}

/** Share of total machine CPU capacity (0–100+ if oversubscribed). */
export function normalizeProcessCpu(rawCpu, cores) {
  return (rawCpu || 0) / (cores || 1);
}

export function formatSystemCpuPercent(cpuLoad) {
  return Math.min(100, Math.max(0, (cpuLoad || 0) * 100));
}

export function formatActiveCores(cpuLoad, cores) {
  return (cpuLoad || 0) * (cores || 1);
}

export function formatSystemCpuSubtitle(cpuLoad, cores, loadAvg, t) {
  const active = formatActiveCores(cpuLoad, cores);
  let sub = t('cpu.coresActive')
    .replace('{active}', active.toFixed(1))
    .replace('{total}', String(cores));
  if (loadAvg != null && loadAvg >= 0) {
    sub += ' · ' + t('cpu.loadAvg').replace('{value}', loadAvg.toFixed(2));
  }
  return sub;
}

export function formatProcessCpuCell(rawCpu, cores, t) {
  const systemPct = normalizeProcessCpu(rawCpu, cores);
  const perCorePct = rawCpu || 0;
  const label = systemPct.toFixed(1);
  const title = t('cpu.processTooltip')
    .replace('{system}', systemPct.toFixed(1))
    .replace('{core}', perCorePct.toFixed(1));
  return { label, title, systemPct, perCorePct };
}

export function shortProcessName(command) {
  const cmd = (command || '').trim();
  if (!cmd) {
    return '—';
  }
  const first = cmd.split(/\s+/)[0];
  if (!first.includes('/')) {
    return first;
  }
  const base = first.replace(/\/+$/, '').split('/').pop();
  return base || first;
}
