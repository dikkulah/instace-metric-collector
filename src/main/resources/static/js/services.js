import { initI18n, setLocale, getLocale, t } from './i18n.js';
import {
  renderServicesInto,
  renderServiceDetailFull,
  captureExpandedServicePaths,
  attachServiceTreeToggle,
  populateServiceSortSelect,
  expandServiceTreePaths
} from './service-ui.js';
import { createMetricsStream, loadJsonSet } from './metrics-stream.js';

let metricsStream = null;
let isLive = false;
let allServices = [];
let selectedService = null;
let searchQuery = '';
let serviceViewMode = localStorage.getItem('serviceViewMode') || 'tree';
let serviceSortMode = localStorage.getItem('serviceSortMode') || 'status-active';
const expandedServicePaths = loadJsonSet('serviceTreeExpanded');
let pendingServiceFromUrl = readServiceFromQuery();

function readServiceFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('service');
  if (!raw) {
    return null;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function trySelectServiceFromUrl() {
  if (!pendingServiceFromUrl || !allServices.length) {
    return;
  }
  const svc = allServices.find(s => s.serviceName === pendingServiceFromUrl);
  if (!svc) {
    return;
  }
  expandServiceTreePaths(svc.serviceName, expandedServicePaths);
  pendingServiceFromUrl = null;
  selectService(svc);
}

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
    updateServiceSortSelect();
    renderServices();
    renderDetail();
  });

  document.addEventListener('locale-changed', () => {
    setLive(isLive);
    updateServiceSortSelect();
    renderServices();
    renderDetail();
  });

  document.getElementById('service-search').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderServices();
  });

  document.getElementById('service-view-tree').addEventListener('click', () => setViewMode('tree'));
  document.getElementById('service-view-list').addEventListener('click', () => setViewMode('list'));

  initServiceSortSelect();

  const listEl = document.getElementById('service-list');
  attachServiceTreeToggle(listEl, expandedServicePaths, 'serviceTreeExpanded');
}

function applySnapshot(snapshot) {
  allServices = snapshot.payload?.serviceInfos || [];
  document.getElementById('waiting').hidden = true;
  document.getElementById('services-dashboard').hidden = false;
  if (snapshot.collectedAt) {
    document.getElementById('last-update').textContent =
      new Date(snapshot.collectedAt).toLocaleString();
  }
  if (selectedService) {
    const updated = allServices.find(s => s.serviceName === selectedService.serviceName);
    selectedService = updated || null;
  }
  renderServices();
  renderDetail();
  trySelectServiceFromUrl();
}

function setViewMode(mode) {
  serviceViewMode = mode;
  localStorage.setItem('serviceViewMode', mode);
  document.getElementById('service-view-tree').classList.toggle('active', mode === 'tree');
  document.getElementById('service-view-list').classList.toggle('active', mode === 'list');
  renderServices();
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
    renderServices();
  });
}

function updateServiceSortSelect() {
  populateServiceSortSelect(document.getElementById('service-sort'), t, serviceSortMode);
}

function setLive(live) {
  isLive = live;
  const dot = document.getElementById('status-dot');
  const label = document.getElementById('status-label');
  dot.classList.toggle('offline', !live);
  dot.classList.toggle('live', live);
  label.textContent = t(live ? 'app.live' : 'app.offline');
}

function selectService(svc) {
  selectedService = svc;
  if (svc?.serviceName) {
    const url = new URL(window.location.href);
    url.searchParams.set('service', svc.serviceName);
    window.history.replaceState({}, '', url);
    expandServiceTreePaths(svc.serviceName, expandedServicePaths);
  }
  renderServices();
  renderDetail();
  requestAnimationFrame(() => {
    const selected = document.querySelector('#service-list .service-selectable.selected');
    selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (window.matchMedia('(max-width: 1024px)').matches) {
      document.getElementById('service-detail-panel')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

function renderServices() {
  const container = document.getElementById('service-list');
  const paths = captureExpandedServicePaths(container);
  paths.forEach(p => expandedServicePaths.add(p));

  const q = searchQuery.toLowerCase();
  const filtered = q
    ? allServices.filter(s => (s.serviceName || '').toLowerCase().includes(q))
    : allServices;

  document.getElementById('service-total').textContent = q
    ? t('services.filtered').replace('{count}', String(filtered.length)).replace('{total}', String(allServices.length))
    : t('services.total').replace('{count}', String(allServices.length));

  renderServicesInto(container, allServices, {
    mode: serviceViewMode,
    t,
    getLocale,
    expandedPaths: expandedServicePaths,
    selectedServiceName: selectedService?.serviceName,
    onSelect: selectService,
    searchQuery,
    sortBy: serviceSortMode
  });
}

function renderDetail() {
  const emptyEl = document.getElementById('service-detail-empty');
  const contentEl = document.getElementById('service-detail-content');
  const fullEl = document.getElementById('service-detail-full');

  if (!selectedService) {
    emptyEl.hidden = false;
    contentEl.hidden = true;
    if (fullEl) {
      fullEl.innerHTML = '';
    }
    return;
  }

  emptyEl.hidden = true;
  contentEl.hidden = false;
  renderServiceDetailFull(fullEl, selectedService, allServices, t, {
    onSelect: selectService,
    onFilterPrefix: (prefix) => {
      searchQuery = prefix;
      const input = document.getElementById('service-search');
      if (input) {
        input.value = prefix;
      }
      renderServices();
    }
  });
}

bootstrap().catch((err) => console.error('Services bootstrap failed', err));
