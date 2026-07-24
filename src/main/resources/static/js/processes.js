import { initI18n, setLocale, getLocale, t } from './i18n.js';
import { getCpuCores, normalizeProcessCpu, formatProcessCpuCell, shortProcessName } from './metrics-cpu.js';
import { attachCommandCopyHandlers, buildCommandCopyButton } from './process-command-ui.js';
import { createMetricsStream } from './metrics-stream.js';

let metricsStream = null;
let isLive = false;
let allProcesses = [];
let lastCpuCores = 1;
let searchQuery = '';
let sortColumn = 'cpu';
let sortDirection = 'desc';

async function bootstrap() {
  const config = await fetch('/api/metrics/config').then(r => r.json());
  await initI18n(config.defaultLocale || 'en', config.locales || 'en,tr');

  metricsStream = createMetricsStream({
    refreshInterval: config.refreshInterval || 5000,
    onSnapshot: applySnapshot,
    onLiveChange: setLive
  });
  await metricsStream.start();

  const langSelect = document.getElementById('lang-select');
  langSelect.value = getLocale();
  langSelect.addEventListener('change', async () => {
    await setLocale(langSelect.value);
    renderTable();
  });

  document.addEventListener('locale-changed', () => {
    setLive(isLive);
    renderTable();
  });

  document.getElementById('process-search').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderTable();
  });

  document.querySelectorAll('#processes-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (sortColumn === col) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = col;
        sortDirection = col === 'name' || col === 'user' ? 'asc' : 'desc';
      }
      renderTable();
    });
  });

  attachCommandCopyHandlers(document.getElementById('processes-body'), t);
}

function applySnapshot(snapshot) {
  allProcesses = snapshot.payload?.processInfos || [];
  lastCpuCores = getCpuCores(snapshot.payload);
  document.getElementById('waiting').hidden = true;
  document.getElementById('processes-dashboard').hidden = false;
  if (snapshot.collectedAt) {
    document.getElementById('last-update').textContent =
      new Date(snapshot.collectedAt).toLocaleString();
  }
  renderTable();
}

function setLive(live) {
  isLive = live;
  const dot = document.getElementById('status-dot');
  const label = document.getElementById('status-label');
  dot.classList.toggle('offline', !live);
  dot.classList.toggle('live', live);
  label.textContent = t(live ? 'app.live' : 'app.offline');
}

function renderTable() {
  const tbody = document.getElementById('processes-body');
  const totalEl = document.getElementById('process-total');
  tbody.innerHTML = '';

  const ranked = [...allProcesses]
    .sort((a, b) => normalizeProcessCpu(b.cpuUsage, lastCpuCores) - normalizeProcessCpu(a.cpuUsage, lastCpuCores))
    .map((proc, index) => ({ ...proc, rank: index + 1 }));

  const filtered = ranked.filter(proc => matchesSearch(proc, searchQuery));
  const sorted = sortProcesses(filtered);

  totalEl.textContent = searchQuery
    ? t('processes.filtered').replace('{count}', String(sorted.length)).replace('{total}', String(ranked.length))
    : t('processes.total').replace('{count}', String(ranked.length));

  updateSortIndicators();

  if (sorted.length === 0) {
    const msg = searchQuery ? t('processes.noMatch') : t('empty.processes');
    tbody.innerHTML = '<tr><td colspan="8" class="empty">' + msg + '</td></tr>';
    return;
  }

  sorted.forEach(proc => {
    const name = shortProcessName(proc.command);
    const cpu = formatProcessCpuCell(proc.cpuUsage, lastCpuCores, t);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-rank">${proc.rank}</td>
      <td class="col-pid">${proc.pid}</td>
      <td class="col-user">${escapeHtml(proc.user || '—')}</td>
      <td class="col-name" title="${escapeHtml(proc.command || '')}">${escapeHtml(name)}</td>
      <td class="col-metric" title="${escapeHtml(cpu.title)}">
        <span class="metric-value">${cpu.label}</span>
        <span class="metric-bar"><span class="metric-bar-fill cpu" style="width:${Math.min(cpu.systemPct, 100)}%"></span></span>
      </td>
      <td class="col-metric">
        <span class="metric-value">${cpu.perCorePct.toFixed(1)}</span>
        <span class="metric-bar"><span class="metric-bar-fill cpu-core" style="width:${Math.min(cpu.perCorePct, 100)}%"></span></span>
      </td>
      <td class="col-metric">
        <span class="metric-value">${(proc.memoryUsage || 0).toFixed(1)}</span>
        <span class="metric-bar"><span class="metric-bar-fill mem" style="width:${Math.min(proc.memoryUsage || 0, 100)}%"></span></span>
      </td>`;
    const cmdCell = document.createElement('td');
    cmdCell.className = 'col-command';
    cmdCell.appendChild(buildCommandCopyButton(proc.command, t));
    tr.appendChild(cmdCell);
    tbody.appendChild(tr);
  });
}

function matchesSearch(proc, query) {
  if (!query) {
    return true;
  }
  const haystack = [
    String(proc.pid),
    proc.user || '',
    proc.command || '',
    shortName(proc.command)
  ].join(' ').toLowerCase();
  return haystack.includes(query);
}

function sortProcesses(list) {
  const dir = sortDirection === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    switch (sortColumn) {
      case 'rank':
        return (a.rank - b.rank) * dir;
      case 'pid':
        return (a.pid - b.pid) * dir;
      case 'user':
        return compareStrings(a.user, b.user) * dir;
      case 'name':
        return compareStrings(shortName(a.command), shortName(b.command)) * dir;
      case 'cpuCore':
        return ((a.cpuUsage || 0) - (b.cpuUsage || 0)) * dir;
      case 'memory':
        return ((a.memoryUsage || 0) - (b.memoryUsage || 0)) * dir;
      case 'cpu':
      default:
        return (normalizeProcessCpu(a.cpuUsage, lastCpuCores) - normalizeProcessCpu(b.cpuUsage, lastCpuCores)) * dir;
    }
  });
}

function compareStrings(a, b) {
  return (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' });
}

function shortName(command) {
  return (command || '').split(/\s+/)[0] || '—';
}

function updateSortIndicators() {
  document.querySelectorAll('#processes-table th.sortable').forEach(th => {
    const col = th.getAttribute('data-sort');
    th.classList.toggle('sort-active', col === sortColumn);
    th.dataset.sortDir = col === sortColumn ? sortDirection : '';
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

bootstrap().catch((err) => console.error('Processes bootstrap failed', err));
