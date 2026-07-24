import { initI18n, setLocale, getLocale, t } from './i18n.js';
import {
  getCpuCores,
  normalizeProcessCpu,
  formatSystemCpuPercent,
  formatSystemCpuSubtitle,
  formatProcessCpuCell,
  shortProcessName
} from './metrics-cpu.js';
import {
  enrichNetworkInterfaces,
  formatBitrate,
  rateBarWidth
} from './network-metrics.js';
import {
  renderServicesInto,
  renderServiceDetailRows,
  renderServiceDetailPreviewRows,
  renderServiceDetailFull,
  serviceDetailPageUrl,
  captureExpandedServicePaths,
  attachServiceTreeToggle,
  populateServiceSortSelect,
  escapeHtml as serviceEscapeHtml
} from './service-ui.js';
import { createMetricsStream, loadJsonSet } from './metrics-stream.js';

let refreshInterval = 5000;
let metricsStream = null;
let isLive = false;
let serviceViewMode = localStorage.getItem('serviceViewMode') || 'tree';
let serviceSortMode = localStorage.getItem('serviceSortMode') || 'status-active';
const expandedServicePaths = loadJsonSet('serviceTreeExpanded');

async function bootstrap() {
  let config;
  try {
    const res = await fetch('/api/metrics/config');
    if (!res.ok) {
      throw new Error('config ' + res.status);
    }
    config = await res.json();
  } catch (err) {
    console.error('Dashboard config failed', err);
    showBootstrapError();
    return;
  }
  refreshInterval = config.refreshInterval || 5000;

  await initI18n(config.defaultLocale || 'en', config.locales || 'en,tr');

  metricsStream = createMetricsStream({
    refreshInterval,
    onSnapshot: (snapshot) => {
      lastSnapshot = snapshot;
      try {
        render(snapshot);
      } catch (err) {
        console.error('Render error', err);
      }
    },
    onLiveChange: setLive
  });
  await metricsStream.start();

  initDashboardUi();
}

function showBootstrapError() {
  const waiting = document.getElementById('waiting');
  if (waiting) {
    waiting.hidden = false;
    waiting.textContent = t?.('app.offline') || 'Offline';
  }
  setLive(false);
}

function initDashboardUi() {
  try {
    const langSelect = document.getElementById('lang-select');
    langSelect.value = getLocale();
    langSelect.addEventListener('change', async () => {
      await setLocale(langSelect.value);
      rerenderLast();
    });

    document.addEventListener('locale-changed', () => {
      setLive(isLive);
      updateServiceSortSelect();
      rerenderLast();
    });

    document.getElementById('service-view-tree').addEventListener('click', () => setServiceViewMode('tree'));
    document.getElementById('service-view-list').addEventListener('click', () => setServiceViewMode('list'));
    updateServiceViewButtons();
    initServiceSortSelect();
    attachServiceTreeToggle(document.getElementById('service-list'), expandedServicePaths, 'serviceTreeExpanded');
    document.getElementById('service-detail-close').addEventListener('click', () => {
      selectedServiceName = null;
      document.getElementById('service-detail').hidden = true;
      rerenderLast();
    });
    document.getElementById('process-load-more').addEventListener('click', () => {
      processDisplayLimit += PROCESS_PAGE_SIZE;
      rerenderLast();
    });
    document.getElementById('container-detail-close').addEventListener('click', () => {
      selectedContainerId = null;
      document.getElementById('container-detail').hidden = true;
      rerenderLast();
    });
  } catch (err) {
    console.error('Dashboard UI init failed', err);
  }
}

let lastSnapshot = null;
let processDisplayLimit = 10;
const PROCESS_PAGE_SIZE = 10;
let lastCpuCores = 1;
let selectedContainerId = null;
let selectedServiceName = null;
let lastServices = [];
let lastContainers = [];

function rerenderLast() {
  if (lastSnapshot) {
    render(lastSnapshot);
  }
}

function setLive(live) {
  isLive = live;
  const dot = document.getElementById('status-dot');
  const label = document.getElementById('status-label');
  dot.classList.toggle('live', live);
  dot.classList.toggle('offline', !live);
  label.textContent = live ? t('app.live') : t('app.offline');
}

function render(snapshot) {
  document.getElementById('waiting').hidden = true;
  document.getElementById('dashboard').hidden = false;

  const p = snapshot.payload;
  const collectedAt = snapshot.collectedAt;
  lastCpuCores = getCpuCores(p);
  document.getElementById('last-update').textContent = formatTime(collectedAt);

  const cpuPct = formatSystemCpuPercent(p.cpuLoad);
  document.getElementById('cpu-value').textContent = cpuPct.toFixed(1) + '%';
  document.getElementById('cpu-sub').textContent =
    formatSystemCpuSubtitle(p.cpuLoad, lastCpuCores, p.systemLoadAverage, t);
  document.getElementById('cpu-bar').style.width = cpuPct + '%';

  const used = p.usedMemory || 0;
  const total = p.totalMemory || 1;
  const memPct = Math.min(100, (used / total) * 100);
  document.getElementById('mem-value').textContent = memPct.toFixed(1) + '%';
  document.getElementById('mem-sub').textContent = formatBytes(used) + ' / ' + formatBytes(total);
  document.getElementById('mem-bar').style.width = memPct + '%';

  const containers = p.containers || [];
  document.getElementById('container-count').textContent = String(containers.length);
  const healthy = containers.filter(c => (c.health || '').toLowerCase() === 'healthy'
    || (c.status || '').toLowerCase() === 'running').length;
  document.getElementById('container-healthy').textContent =
    healthy + ' ' + t('card.healthy');

  renderProcesses(p.processInfos || []);
  renderServices(p.serviceInfos || []);
  renderContainers(containers);
  renderDiskUsage(p.diskUsage || []);
  renderNetworkUsage(p.networkUsage || [], collectedAt);
}

function renderProcesses(processes) {
  const tbody = document.getElementById('process-body');
  const footer = document.getElementById('process-footer');
  const showingEl = document.getElementById('process-showing');
  const loadMoreBtn = document.getElementById('process-load-more');
  tbody.innerHTML = '';

  const sorted = [...processes]
    .sort((a, b) => normalizeProcessCpu(b.cpuUsage, lastCpuCores) - normalizeProcessCpu(a.cpuUsage, lastCpuCores));
  const visible = sorted.slice(0, processDisplayLimit);

  if (visible.length === 0) {
    footer.hidden = true;
    tbody.innerHTML = '<tr><td colspan="4" class="empty">' + t('empty.processes') + '</td></tr>';
    return;
  }

  visible.forEach(proc => {
    const tr = document.createElement('tr');
    const name = shortProcessName(proc.command);
    const cpu = formatProcessCpuCell(proc.cpuUsage, lastCpuCores, t);
    tr.innerHTML = `
      <td class="col-pid num">${proc.pid}</td>
      <td class="col-name" title="${escapeHtml(proc.command || '')}">${escapeHtml(name)}</td>
      <td class="col-cpu" title="${escapeHtml(cpu.title)}">
        <div class="cpu-dual">
          <div class="cpu-dual-row">
            <span class="cpu-dual-label">${escapeHtml(t('cpu.colSystem'))}</span>
            <span class="cpu-dual-value num">${cpu.label}%</span>
            <span class="cpu-dual-bar"><span class="cpu-dual-fill sys" style="width:${Math.min(cpu.systemPct, 100)}%"></span></span>
          </div>
          <div class="cpu-dual-row">
            <span class="cpu-dual-label">${escapeHtml(t('cpu.colCore'))}</span>
            <span class="cpu-dual-value num">${cpu.perCorePct.toFixed(1)}%</span>
            <span class="cpu-dual-bar"><span class="cpu-dual-fill core" style="width:${Math.min(cpu.perCorePct, 100)}%"></span></span>
          </div>
        </div>
      </td>
      <td class="col-mem num">${(proc.memoryUsage || 0).toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });

  const total = sorted.length;
  const shown = visible.length;
  footer.hidden = false;
  showingEl.textContent = t('processes.showing')
    .replace('{shown}', String(shown))
    .replace('{total}', String(total));
  loadMoreBtn.hidden = shown >= total;
}

function setServiceViewMode(mode) {
  serviceViewMode = mode;
  localStorage.setItem('serviceViewMode', mode);
  updateServiceViewButtons();
  rerenderLast();
}

function updateServiceViewButtons() {
  document.getElementById('service-view-tree').classList.toggle('active', serviceViewMode === 'tree');
  document.getElementById('service-view-list').classList.toggle('active', serviceViewMode === 'list');
}

function initServiceSortSelect() {
  const select = document.getElementById('service-sort');
  if (!select) {
    return;
  }
  updateServiceSortSelect();
  select.addEventListener('change', () => {
    serviceSortMode = select.value;
    localStorage.setItem('serviceSortMode', serviceSortMode);
    rerenderLast();
  });
}

function updateServiceSortSelect() {
  populateServiceSortSelect(document.getElementById('service-sort'), t, serviceSortMode);
}

function renderServices(services) {
  lastServices = services;
  const el = document.getElementById('service-list');
  const paths = captureExpandedServicePaths(el);
  paths.forEach(p => expandedServicePaths.add(p));

  renderServicesInto(el, services, {
    mode: serviceViewMode,
    t,
    getLocale,
    expandedPaths: expandedServicePaths,
    selectedServiceName,
    onSelect: selectService,
    sortBy: serviceSortMode
  });

  if (selectedServiceName) {
    const selected = services.find(s => s.serviceName === selectedServiceName);
    if (selected) {
      renderServiceDetailPanel(selected);
    } else {
      selectedServiceName = null;
      document.getElementById('service-detail').hidden = true;
    }
  }
}

function selectService(svc) {
  selectedServiceName = svc.serviceName;
  renderServiceDetailPanel(svc);
  rerenderLast();
  requestAnimationFrame(() => {
    const detail = document.getElementById('service-detail');
    detail?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    document.querySelector('#service-list .service-selectable.selected')
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function renderServiceDetailPanel(service) {
  const panel = document.getElementById('service-detail');
  panel.hidden = false;
  document.getElementById('service-detail-title').textContent = service.serviceName || '—';
  const openLink = document.getElementById('service-detail-open');
  if (openLink) {
    openLink.href = serviceDetailPageUrl(service.serviceName);
  }
  document.getElementById('service-detail-body').innerHTML =
    renderServiceDetailPreviewRows(service, t)
      .map(([label, value]) => `<dt>${serviceEscapeHtml(label)}</dt><dd>${value}</dd>`)
      .join('');
}

function renderDiskUsage(mounts) {
  const el = document.getElementById('disk-list');
  el.innerHTML = '';
  if (!mounts.length) {
    el.innerHTML = '<div class="empty">' + t('empty.disk') + '</div>';
    return;
  }
  const sorted = [...mounts].sort((a, b) => (b.usePercent || 0) - (a.usePercent || 0)).slice(0, 6);
  sorted.forEach(disk => {
    const row = document.createElement('div');
    row.className = 'usage-row';
    const pct = Math.min(100, Math.max(0, disk.usePercent || 0));
    row.innerHTML = `
      <div class="usage-label" title="${escapeHtml(disk.filesystem || '')}">${escapeHtml(disk.mount || '—')}</div>
      <div>
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="usage-meta">${formatBytes(disk.usedBytes || 0)} / ${formatBytes(disk.totalBytes || 0)}</div>
      </div>
      <div class="usage-meta">${pct.toFixed(1)}%</div>`;
    el.appendChild(row);
  });
}

function renderNetworkUsage(interfaces, collectedAt) {
  const el = document.getElementById('network-list');
  el.innerHTML = '';
  if (!interfaces.length) {
    el.innerHTML = '<div class="empty">' + t('empty.network') + '</div>';
    return;
  }

  const enriched = enrichNetworkInterfaces(interfaces, collectedAt);
  const byTraffic = [...enriched]
    .map(iface => ({
      ...iface,
      total: (iface.bytesReceived || 0) + (iface.bytesSent || 0)
    }))
    .sort((a, b) => b.total - a.total);

  const active = byTraffic.filter(iface => iface.total > 0);
  const visible = (active.length ? active : byTraffic).slice(0, 6);

  const maxInstantRx = Math.max(...visible.map(i => i.instantRx || 0), 1);
  const maxInstantTx = Math.max(...visible.map(i => i.instantTx || 0), 1);

  visible.forEach(iface => {
    const row = document.createElement('div');
    row.className = 'network-row';
    const rxPct = rateBarWidth(iface.instantRx, maxInstantRx);
    const txPct = rateBarWidth(iface.instantTx, maxInstantTx);
    row.innerHTML = `
      <div class="network-label" title="${escapeHtml(iface.name || '')}">${escapeHtml(iface.name || '—')}</div>
      <div class="network-body">
        <div class="network-bar-line">
          <span class="network-dir" aria-hidden="true">↓</span>
          <div class="usage-bar"><div class="bar-fill network-rx" style="width:${rxPct}%"></div></div>
          <span class="network-rate" title="${t('network.instant')}">${formatBitrate(iface.instantRx)}</span>
        </div>
        <div class="network-bar-line">
          <span class="network-dir" aria-hidden="true">↑</span>
          <div class="usage-bar"><div class="bar-fill network-tx" style="width:${txPct}%"></div></div>
          <span class="network-rate" title="${t('network.instant')}">${formatBitrate(iface.instantTx)}</span>
        </div>
        <div class="network-footer">
          <span>${t('table.rx')}: ${formatBytes(iface.bytesReceived || 0)} · ${t('network.avg')}: ${formatBitrate(iface.avgRx)}</span>
          <span>${t('table.tx')}: ${formatBytes(iface.bytesSent || 0)} · ${t('network.avg')}: ${formatBitrate(iface.avgTx)}</span>
        </div>
      </div>`;
    el.appendChild(row);
  });
}

function renderContainers(containers) {
  lastContainers = containers;
  const grid = document.getElementById('container-grid');
  grid.innerHTML = '';
  if (!containers.length) {
    grid.innerHTML = '<div class="empty">' + t('empty.containers') + '</div>';
    document.getElementById('container-detail').hidden = true;
    selectedContainerId = null;
    return;
  }

  containers.forEach(c => {
    const card = document.createElement('div');
    card.className = 'container-card container-card-clickable';
    if (c.id === selectedContainerId) {
      card.classList.add('selected');
    }
    const status = (c.status || '').toLowerCase();
    const health = (c.health || '').toLowerCase();
    let tagClass = 'running';
    let tagText = t('status.running');
    if (status.includes('exit')) {
      tagClass = 'exited';
      tagText = t('status.exited');
    } else if (health === 'unhealthy') {
      tagClass = 'unhealthy';
      tagText = t('status.unhealthy');
    } else if (health === 'healthy') {
      tagText = t('status.healthy');
    }
    const ports = (c.ports || []).join(', ') || '—';
    card.innerHTML = `
      <h3>${escapeHtml(c.name || c.id || '—')}</h3>
      <div class="container-meta">${escapeHtml(c.image || '')}</div>
      <div class="container-meta">${t('table.restarts')}: ${c.restartCount ?? 0}</div>
      <div class="container-meta">${t('table.ports')}: ${escapeHtml(ports)}</div>
      <span class="status-tag ${tagClass}">${tagText}</span>`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', t('container.openDetail').replace('{name}', c.name || c.id || ''));
    card.addEventListener('click', () => selectContainer(c.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectContainer(c.id);
      }
    });
    grid.appendChild(card);
  });

  if (selectedContainerId) {
    const selected = containers.find(c => c.id === selectedContainerId);
    if (selected) {
      renderContainerDetail(selected);
    } else {
      selectedContainerId = null;
      document.getElementById('container-detail').hidden = true;
    }
  }
}

function selectContainer(containerId) {
  selectedContainerId = containerId;
  const container = lastContainers.find(c => c.id === containerId);
  if (container) {
    renderContainerDetail(container);
  }
  rerenderLast();
}

function renderContainerDetail(container) {
  const panel = document.getElementById('container-detail');
  const title = document.getElementById('container-detail-title');
  const body = document.getElementById('container-detail-body');
  panel.hidden = false;
  title.textContent = container.name || container.id || '—';

  const health = (container.health || 'none').toLowerCase();
  const healthLabel = health === 'none' ? t('container.health.none') : health;
  const ports = (container.ports || []).length
    ? (container.ports || []).map(p => `<li>${escapeHtml(p)}</li>`).join('')
    : `<li>—</li>`;

  const rows = [
    [t('container.id'), `<code class="detail-mono">${escapeHtml(container.id || '—')}</code>`],
    [t('table.name'), escapeHtml(container.name || '—')],
    [t('container.image'), escapeHtml(container.image || '—')],
    [t('table.status'), formatContainerStatus(container)],
    [t('container.health'), escapeHtml(healthLabel)],
    [t('table.restarts'), String(container.restartCount ?? 0)],
    [t('container.composeProject'), escapeHtml(container.composeProject || '—')],
    [t('container.composeService'), escapeHtml(container.composeService || '—')],
    [t('table.ports'), `<ul class="detail-port-list">${ports}</ul>`]
  ];

  body.innerHTML = rows.map(([label, value]) => `
    <dt>${escapeHtml(label)}</dt>
    <dd>${value}</dd>`).join('');
}

function formatContainerStatus(container) {
  const status = (container.status || 'unknown').toLowerCase();
  const health = (container.health || '').toLowerCase();
  let tagClass = 'running';
  let tagText = t('status.running');
  if (status.includes('exit')) {
    tagClass = 'exited';
    tagText = t('status.exited');
  } else if (health === 'unhealthy') {
    tagClass = 'unhealthy';
    tagText = t('status.unhealthy');
  } else if (health === 'healthy') {
    tagText = t('status.healthy');
  }
  return `<span class="status-tag ${tagClass}">${tagText}</span>`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatTime(iso) {
  try {
    return new Intl.DateTimeFormat(getLocale(), {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

bootstrap().catch((err) => {
  console.error('Dashboard bootstrap failed', err);
  showBootstrapError();
});
