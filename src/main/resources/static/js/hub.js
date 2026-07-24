import { initI18n, setLocale, getLocale, t } from './i18n.js';
import {
  formatSystemCpuPercent,
  formatSystemCpuSubtitle,
  getCpuCores
} from './metrics-cpu.js';

let refreshInterval = 5000;
let selectedAgentId = null;

async function bootstrap() {
  await initI18n('en', 'en,tr');

  try {
    const configRes = await fetch('/api/v1/hub/config');
    if (configRes.status === 404) {
      showHubDisabled();
      return;
    }
    if (!configRes.ok) {
      showHubError();
      return;
    }
    const config = await configRes.json();
    refreshInterval = config.refreshInterval || 5000;
  } catch {
    showHubError();
    return;
  }

  const langSelect = document.getElementById('lang-select');
  langSelect.value = getLocale();
  langSelect.addEventListener('change', async () => {
    await setLocale(langSelect.value);
    pollAgents();
  });

  document.addEventListener('locale-changed', pollAgents);
  setInterval(pollAgents, refreshInterval);
  pollAgents();
}

function showHubDisabled() {
  document.getElementById('waiting').hidden = false;
  document.getElementById('waiting').textContent = t('hub.disabled');
  document.getElementById('hub-dashboard').hidden = true;
}

function showHubError() {
  document.getElementById('waiting').hidden = false;
  document.getElementById('waiting').textContent = t('hub.error');
  document.getElementById('hub-dashboard').hidden = true;
}

async function pollAgents() {
  try {
    const res = await fetch('/api/v1/agents');
    if (res.status === 404) {
      showHubDisabled();
      return;
    }
    if (!res.ok) {
      showHubError();
      return;
    }
    const agents = await res.json();
    renderAgentGrid(agents);
    if (selectedAgentId) {
      await loadAgentDetail(selectedAgentId);
    }
  } catch (err) {
    console.warn('Hub poll failed', err);
    showHubError();
  }
}

function renderAgentGrid(agents) {
  document.getElementById('waiting').hidden = true;
  document.getElementById('hub-dashboard').hidden = false;
  document.getElementById('agent-count').textContent = String(agents.length);

  const grid = document.getElementById('agent-grid');
  grid.innerHTML = '';
  if (!agents.length) {
    grid.innerHTML = '<div class="empty">' + t('hub.noAgents') + '</div>';
    document.getElementById('agent-detail').hidden = true;
    return;
  }

  agents.forEach(agent => {
    const card = document.createElement('div');
    card.className = 'container-card hub-agent-card';
    if (agent.agentId === selectedAgentId) {
      card.classList.add('selected');
    }
    const cpuPct = formatSystemCpuPercent(agent.cpuLoad);
    const memPct = agent.totalMemory > 0
      ? Math.min(100, (agent.usedMemory / agent.totalMemory) * 100)
      : 0;
    card.innerHTML = `
      <h3>${escapeHtml(agent.hostname || agent.agentId)}</h3>
      <div class="container-meta">${escapeHtml(agent.agentId)}</div>
      <div class="container-meta">${t('card.cpu')}: ${cpuPct.toFixed(1)}% · ${t('card.memory')}: ${memPct.toFixed(1)}%</div>
      <div class="container-meta">${t('hub.lastSeen')}: ${formatTime(agent.lastSeen)}</div>
      <div class="container-meta">${t('card.containers')}: ${agent.containerCount ?? 0}</div>`;
    card.addEventListener('click', () => {
      selectedAgentId = agent.agentId;
      loadAgentDetail(agent.agentId);
      renderAgentGrid(agents);
    });
    grid.appendChild(card);
  });
}

async function loadAgentDetail(agentId) {
  const res = await fetch('/api/v1/agents/' + encodeURIComponent(agentId) + '/current');
  if (res.status === 204) {
    document.getElementById('agent-detail').hidden = true;
    return;
  }
  if (!res.ok) return;

  const snapshot = await res.json();
  const p = snapshot.payload;
  document.getElementById('agent-detail').hidden = false;
  document.getElementById('detail-title').textContent = agentId;

  const cores = getCpuCores(p);
  const cpuPct = formatSystemCpuPercent(p.cpuLoad);
  document.getElementById('detail-cpu').textContent = cpuPct.toFixed(1) + '%';
  document.getElementById('detail-cpu-bar').style.width = cpuPct + '%';
  const cpuSub = document.getElementById('detail-cpu-sub');
  if (cpuSub) {
    cpuSub.textContent = formatSystemCpuSubtitle(p.cpuLoad, cores, p.systemLoadAverage, t);
  }

  const used = p.usedMemory || 0;
  const total = p.totalMemory || 1;
  const memPct = Math.min(100, (used / total) * 100);
  document.getElementById('detail-mem').textContent = memPct.toFixed(1) + '%';
  document.getElementById('detail-mem-sub').textContent = formatBytes(used) + ' / ' + formatBytes(total);
  document.getElementById('detail-mem-bar').style.width = memPct + '%';
  document.getElementById('detail-containers').textContent = String((p.containers || []).length);
  document.getElementById('detail-last-seen').textContent =
    t('hub.lastSeen') + ': ' + formatTime(snapshot.collectedAt);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatTime(iso) {
  if (!iso) return '—';
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

bootstrap();
