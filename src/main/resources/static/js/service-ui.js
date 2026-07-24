export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function serviceStatusKey(svc) {
  const raw = (svc?.status || 'RUNNING').toString().toUpperCase();
  if (raw === 'ERROR' || raw === 'STOPPED') return raw;
  return 'RUNNING';
}

export function serviceStatusLabel(statusKey, t) {
  if (statusKey === 'ERROR') return t('status.error');
  if (statusKey === 'STOPPED') return t('status.stopped');
  return t('status.running');
}

export function statusDotClass(statusKey) {
  if (statusKey === 'ERROR') return 'bad';
  if (statusKey === 'STOPPED') return 'warn';
  return '';
}

export function leafServiceName(fullName) {
  if (!fullName || !fullName.includes('.')) return fullName || '—';
  const parts = fullName.split('.');
  return parts[parts.length - 1];
}

export const SERVICE_SORT_MODES = ['name-asc', 'name-desc', 'status-active', 'status-problem'];

const STATUS_ORDER_ACTIVE = { RUNNING: 0, STOPPED: 1, ERROR: 2 };
const STATUS_ORDER_PROBLEM = { ERROR: 0, STOPPED: 1, RUNNING: 2 };

export function serviceDomainPath(serviceName) {
  if (!serviceName || !serviceName.includes('.')) {
    return serviceName || '—';
  }
  return serviceName.split('.').join(' › ');
}

export function parseServiceName(serviceName) {
  const full = (serviceName || '').trim();
  if (!full) {
    return { full: '', parts: [], leaf: '—', parent: '', root: '', depth: 0 };
  }
  const parts = full.includes('.') ? full.split('.').filter(Boolean) : [full];
  return {
    full,
    parts,
    leaf: parts[parts.length - 1] || '—',
    parent: parts.length > 1 ? parts.slice(0, -1).join('.') : '',
    root: parts[0] || '',
    depth: parts.length
  };
}

export function serviceDetailPageUrl(serviceName) {
  if (!serviceName) {
    return '/services.html';
  }
  return '/services.html?service=' + encodeURIComponent(serviceName);
}

export function expandServiceTreePaths(serviceName, expandedPaths) {
  const { parts } = parseServiceName(serviceName);
  for (let i = 1; i < parts.length; i++) {
    expandedPaths.add(parts.slice(0, i).join('.'));
  }
}

export function serviceSiblings(service, allServices) {
  const parsed = parseServiceName(service?.serviceName);
  return (allServices || []).filter(other => {
    if (!other?.serviceName || other.serviceName === service?.serviceName) {
      return false;
    }
    const otherParsed = parseServiceName(other.serviceName);
    if (!parsed.parent) {
      return otherParsed.depth === 1;
    }
    return otherParsed.parent === parsed.parent;
  });
}

export function servicesInSubtree(service, allServices) {
  const prefix = (service?.serviceName || '').trim();
  if (!prefix) {
    return [];
  }
  const dotPrefix = prefix + '.';
  return (allServices || []).filter(other => {
    const name = other?.serviceName || '';
    return name === prefix || name.startsWith(dotPrefix);
  });
}

async function copyServiceText(text, button, t) {
  const value = text || '';
  if (!value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  if (button) {
    const prev = button.textContent;
    button.textContent = t('services.detail.copied');
    window.setTimeout(() => {
      button.textContent = prev;
    }, 1500);
  }
}

export function renderServiceDetailRows(service, t) {
  const statusKey = serviceStatusKey(service);
  const statusHtml = `<span class="status-tag ${statusKey === 'RUNNING' ? 'running' : statusKey === 'ERROR' ? 'unhealthy' : 'exited'}">${escapeHtml(serviceStatusLabel(statusKey, t))}</span>`;
  const description = (service.description || '').trim();
  return [
    [t('services.detail.name'), `<code class="detail-mono">${escapeHtml(service.serviceName || '—')}</code>`],
    [t('table.status'), statusHtml],
    [t('services.detail.domain'), escapeHtml(serviceDomainPath(service.serviceName))],
    [t('services.detail.shortName'), escapeHtml(leafServiceName(service.serviceName))],
    [t('services.detail.description'), escapeHtml(description || '—')]
  ];
}

export function renderServiceDetailPreviewRows(service, t) {
  const statusKey = serviceStatusKey(service);
  const statusHtml = `<span class="status-tag ${statusKey === 'RUNNING' ? 'running' : statusKey === 'ERROR' ? 'unhealthy' : 'exited'}">${escapeHtml(serviceStatusLabel(statusKey, t))}</span>`;
  return [
    [t('table.status'), statusHtml],
    [t('services.detail.shortName'), escapeHtml(leafServiceName(service.serviceName))],
    [t('services.detail.domain'), escapeHtml(serviceDomainPath(service.serviceName))]
  ];
}

function statusSummaryCounts(services) {
  const counts = { RUNNING: 0, STOPPED: 0, ERROR: 0 };
  for (const svc of services) {
    counts[serviceStatusKey(svc)] = (counts[serviceStatusKey(svc)] || 0) + 1;
  }
  return counts;
}

export function renderServiceDetailFull(container, service, allServices, t, handlers = {}) {
  const parsed = parseServiceName(service.serviceName);
  const statusKey = serviceStatusKey(service);
  const siblings = serviceSiblings(service, allServices)
    .sort((a, b) => (a.serviceName || '').localeCompare(b.serviceName || ''));
  const subtree = servicesInSubtree(service, allServices);
  const subtreeCounts = statusSummaryCounts(subtree);
  const description = (service.description || '').trim();

  const breadcrumb = parsed.parts.map((part, index) => {
    const path = parsed.parts.slice(0, index + 1).join('.');
    return `<button type="button" class="service-crumb" data-filter-prefix="${escapeHtml(path)}">${escapeHtml(part)}</button>`;
  }).join('<span class="service-crumb-sep" aria-hidden="true">›</span>');

  const segmentRows = parsed.parts.map((part, index) => `
    <tr>
      <td class="num">${index + 1}</td>
      <td><code>${escapeHtml(part)}</code></td>
      <td><code class="detail-mono">${escapeHtml(parsed.parts.slice(0, index + 1).join('.'))}</code></td>
    </tr>`).join('');

  const siblingLimit = 40;
  const visibleSiblings = siblings.slice(0, siblingLimit);
  const siblingRows = visibleSiblings.length
    ? visibleSiblings.map(svc => {
      const sk = serviceStatusKey(svc);
      return `<tr class="service-peer-row" data-select-service="${encodeURIComponent(svc.serviceName || '')}">
        <td><span class="badge-dot ${statusDotClass(sk)}"></span> ${escapeHtml(serviceStatusLabel(sk, t))}</td>
        <td><code class="detail-mono">${escapeHtml(svc.serviceName || '—')}</code></td>
      </tr>`;
    }).join('')
    : `<tr><td colspan="2" class="empty">${escapeHtml(t('services.detail.noSiblings'))}</td></tr>`;

  container.innerHTML = `
    <div class="service-detail-hero">
      <div class="service-detail-hero-main">
        <span class="status-tag service-detail-status ${statusKey === 'RUNNING' ? 'running' : statusKey === 'ERROR' ? 'unhealthy' : 'exited'}">${escapeHtml(serviceStatusLabel(statusKey, t))}</span>
        <h3 class="service-detail-name">${escapeHtml(parsed.leaf)}</h3>
        <p class="service-detail-subtitle"><code class="detail-mono">${escapeHtml(service.serviceName || '—')}</code></p>
      </div>
      <button type="button" class="secondary-btn service-copy-btn" data-copy-text="${encodeURIComponent(service.serviceName || '')}">${escapeHtml(t('services.detail.copyId'))}</button>
    </div>

    <nav class="service-breadcrumb" aria-label="${escapeHtml(t('services.detail.breadcrumb'))}">${breadcrumb || escapeHtml(parsed.full)}</nav>

    <section class="service-detail-section">
      <h4 class="service-detail-section-title">${escapeHtml(t('services.detail.overview'))}</h4>
      <dl class="detail-grid service-detail-overview">
        <dt>${escapeHtml(t('services.detail.depth'))}</dt><dd>${parsed.depth}</dd>
        <dt>${escapeHtml(t('services.detail.vendor'))}</dt><dd><code>${escapeHtml(parsed.root || '—')}</code></dd>
        <dt>${escapeHtml(t('services.detail.parent'))}</dt><dd><code class="detail-mono">${escapeHtml(parsed.parent || '—')}</code></dd>
        <dt>${escapeHtml(t('services.detail.siblingCount'))}</dt><dd>${siblings.length}</dd>
        <dt>${escapeHtml(t('services.detail.subtreeCount'))}</dt><dd>${subtree.length}</dd>
        <dt>${escapeHtml(t('services.detail.subtreeRunning'))}</dt><dd>${subtreeCounts.RUNNING || 0}</dd>
        <dt>${escapeHtml(t('services.detail.subtreeStopped'))}</dt><dd>${subtreeCounts.STOPPED || 0}</dd>
        <dt>${escapeHtml(t('services.detail.subtreeError'))}</dt><dd>${subtreeCounts.ERROR || 0}</dd>
      </dl>
    </section>

    <section class="service-detail-section">
      <h4 class="service-detail-section-title">${escapeHtml(t('services.detail.segments'))}</h4>
      <div class="table-wrap service-detail-table-wrap">
        <table class="data-table service-detail-table">
          <thead><tr>
            <th>#</th>
            <th>${escapeHtml(t('services.detail.segment'))}</th>
            <th>${escapeHtml(t('services.detail.prefix'))}</th>
          </tr></thead>
          <tbody>${segmentRows}</tbody>
        </table>
      </div>
    </section>

    <section class="service-detail-section">
      <h4 class="service-detail-section-title">${escapeHtml(t('services.detail.siblings'))}</h4>
      <p class="service-detail-hint">${escapeHtml(t('services.detail.siblingsHint'))}</p>
      <div class="table-wrap service-detail-table-wrap">
        <table class="data-table service-detail-table">
          <thead><tr>
            <th>${escapeHtml(t('table.status'))}</th>
            <th>${escapeHtml(t('services.detail.name'))}</th>
          </tr></thead>
          <tbody>${siblingRows}</tbody>
        </table>
      </div>
      ${siblings.length > siblingLimit ? `<p class="service-detail-hint">${escapeHtml(t('services.detail.siblingsTruncated').replace('{shown}', String(siblingLimit)).replace('{total}', String(siblings.length)))}</p>` : ''}
    </section>

    <section class="service-detail-section">
      <div class="service-detail-section-head">
        <h4 class="service-detail-section-title">${escapeHtml(t('services.detail.description'))}</h4>
        ${description ? `<button type="button" class="secondary-btn service-copy-btn" data-copy-text="${encodeURIComponent(description)}">${escapeHtml(t('services.detail.copyDescription'))}</button>` : ''}
      </div>
      <pre class="service-description-block">${escapeHtml(description || t('services.detail.noDescription'))}</pre>
    </section>`;

  container.querySelectorAll('.service-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      let text = btn.dataset.copyText || '';
      try {
        text = decodeURIComponent(text);
      } catch {
        /* keep raw */
      }
      copyServiceText(text, btn, t);
    });
  });

  container.querySelectorAll('[data-select-service]').forEach(row => {
    row.addEventListener('click', () => {
      let name = row.getAttribute('data-select-service') || '';
      try {
        name = decodeURIComponent(name);
      } catch {
        /* keep raw */
      }
      const svc = allServices.find(s => s.serviceName === name);
      if (svc && handlers.onSelect) {
        handlers.onSelect(svc);
      }
    });
  });

  container.querySelectorAll('.service-crumb').forEach(btn => {
    btn.addEventListener('click', () => {
      if (handlers.onFilterPrefix) {
        handlers.onFilterPrefix(btn.dataset.filterPrefix || '');
      }
    });
  });
}

export function compareServices(a, b, sortBy, getLocale) {
  const locale = getLocale?.() || undefined;
  const nameA = a.serviceName || '';
  const nameB = b.serviceName || '';
  switch (sortBy) {
    case 'name-desc':
      return nameB.localeCompare(nameA, locale);
    case 'status-active': {
      const diff = statusRank(a, STATUS_ORDER_ACTIVE) - statusRank(b, STATUS_ORDER_ACTIVE);
      return diff !== 0 ? diff : nameA.localeCompare(nameB, locale);
    }
    case 'status-problem': {
      const diff = statusRank(a, STATUS_ORDER_PROBLEM) - statusRank(b, STATUS_ORDER_PROBLEM);
      return diff !== 0 ? diff : nameA.localeCompare(nameB, locale);
    }
    case 'name-asc':
    default:
      return nameA.localeCompare(nameB, locale);
  }
}

function statusRank(svc, order) {
  return order[serviceStatusKey(svc)] ?? 9;
}

function subtreeStatusRank(node, order) {
  let best = 9;
  const walk = (n) => {
    if (n.service) {
      best = Math.min(best, statusRank(n.service, order));
    }
    for (const child of n.children.values()) {
      walk(child);
    }
  };
  walk(node);
  return best;
}

function compareTreeNodes(keyA, nodeA, keyB, nodeB, sortBy, getLocale) {
  const locale = getLocale?.() || undefined;
  if (sortBy === 'name-desc') {
    return keyB.localeCompare(keyA, locale);
  }
  if (sortBy === 'status-active' || sortBy === 'status-problem') {
    const order = sortBy === 'status-active' ? STATUS_ORDER_ACTIVE : STATUS_ORDER_PROBLEM;
    const rankA = subtreeStatusRank(nodeA, order);
    const rankB = subtreeStatusRank(nodeB, order);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return keyA.localeCompare(keyB, locale);
  }
  return keyA.localeCompare(keyB, locale);
}

export function renderServicesInto(container, services, options) {
  const {
    mode,
    t,
    getLocale,
    expandedPaths,
    selectedServiceName,
    onSelect,
    searchQuery = '',
    sortBy = 'name-asc'
  } = options;

  container.innerHTML = '';
  container.classList.toggle('service-tree-root', mode === 'tree');
  container.classList.toggle('service-list-flat', mode === 'list');

  const filtered = filterServices(services, searchQuery);
  if (!filtered.length) {
    container.innerHTML = '<div class="empty">' + (searchQuery ? t('services.noMatch') : t('empty.services')) + '</div>';
    return;
  }

  if (mode === 'tree') {
    const tree = buildServiceTree(filtered);
    const frag = document.createDocumentFragment();
    renderServiceTreeNode(tree, '', frag, 0, {
      t, getLocale, expandedPaths, selectedServiceName, onSelect, sortBy
    });
    container.appendChild(frag);
    return;
  }

  const sorted = [...filtered].sort((a, b) => compareServices(a, b, sortBy, getLocale));
  sorted.forEach(svc => container.appendChild(createServiceBadge(svc, {
    t, selectedServiceName, onSelect
  })));
}

export function attachServiceTreeToggle(container, expandedPaths, storageKey) {
  container.addEventListener('toggle', (event) => {
    const details = event.target;
    if (!details.matches?.('details.service-tree-branch[data-path]')) {
      return;
    }
    if (details.open) {
      expandedPaths.add(details.dataset.path);
    } else {
      expandedPaths.delete(details.dataset.path);
    }
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify([...expandedPaths]));
    }
  }, true);
}

export function captureExpandedServicePaths(container) {
  if (!container) {
    return [];
  }
  return [...container.querySelectorAll('details.service-tree-branch[data-path][open]')]
    .map(el => el.dataset.path)
    .filter(Boolean);
}

const SORT_OPTION_KEYS = {
  'name-asc': 'services.sort.nameAsc',
  'name-desc': 'services.sort.nameDesc',
  'status-active': 'services.sort.statusActive',
  'status-problem': 'services.sort.statusProblem'
};

export function populateServiceSortSelect(selectEl, t, selected) {
  if (!selectEl) {
    return;
  }
  selectEl.innerHTML = SERVICE_SORT_MODES.map(mode => {
    const label = escapeHtml(t(SORT_OPTION_KEYS[mode] || mode));
    const sel = mode === selected ? ' selected' : '';
    return `<option value="${mode}"${sel}>${label}</option>`;
  }).join('');
  selectEl.value = selected;
}

function filterServices(services, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    return services;
  }
  return services.filter(svc => (svc.serviceName || '').toLowerCase().includes(q));
}

function buildServiceTree(services) {
  const root = { label: '', children: new Map(), service: null };
  for (const svc of services) {
    const name = (svc.serviceName || '—').trim();
    const parts = name.includes('.') ? name.split('.').filter(Boolean) : [name];
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!node.children.has(part)) {
        node.children.set(part, { label: part, children: new Map(), service: null });
      }
      node = node.children.get(part);
      if (i === parts.length - 1) {
        node.service = svc;
      }
    }
  }
  return root;
}

function renderServiceTreeNode(node, path, parentEl, depth, ctx) {
  const childEntries = [...node.children.entries()].sort((a, b) =>
    compareTreeNodes(a[0], a[1], b[0], b[1], ctx.sortBy || 'name-asc', ctx.getLocale));

  const folders = [];
  const items = [];

  for (const [key, child] of childEntries) {
    if (child.children.size > 0) {
      folders.push([key, child]);
    } else if (child.service) {
      items.push([key, child]);
    }
  }

  items.sort((a, b) => compareServices(a[1].service, b[1].service, ctx.sortBy || 'name-asc', ctx.getLocale));

  if (folders.length > 0) {
    const foldersEl = document.createElement('div');
    foldersEl.className = 'service-tree-folders';
    for (const [key, child] of folders) {
      foldersEl.appendChild(createServiceFolderBranch(key, child, path, depth, ctx));
    }
    parentEl.appendChild(foldersEl);
  }

  if (items.length > 0) {
    const itemsEl = document.createElement('div');
    itemsEl.className = 'service-tree-items';
    for (const [key, child] of items) {
      const childPath = path ? `${path}.${key}` : key;
      itemsEl.appendChild(createServiceTreeLeaf(childPath, child.service, depth, key, ctx));
    }
    parentEl.appendChild(itemsEl);
  }
}

function createServiceFolderBranch(key, child, path, depth, ctx) {
  const childPath = path ? `${path}.${key}` : key;
  const details = document.createElement('details');
  details.className = 'service-tree-branch';
  details.dataset.path = childPath;
  details.style.setProperty('--depth', String(depth));
  details.open = ctx.expandedPaths.has(childPath) || depth < 1;

  const summary = document.createElement('summary');
  summary.className = 'service-tree-summary';
  const stats = summarizeServiceSubtree(child);
  summary.innerHTML = `
    <span class="service-tree-folder-icon" aria-hidden="true"></span>
    <span class="service-tree-label">${escapeHtml(key)}</span>
    <span class="service-tree-meta">${stats.total} · ${stats.running} ${ctx.t('status.running').toLowerCase()}</span>`;
  details.appendChild(summary);

  const childrenEl = document.createElement('div');
  childrenEl.className = 'service-tree-children';
  childrenEl.style.setProperty('--depth', String(depth + 1));
  renderServiceTreeNode(child, childPath, childrenEl, depth + 1, ctx);

  if (child.service) {
    const ownItem = document.createElement('div');
    ownItem.className = 'service-tree-items service-tree-own-item';
    ownItem.appendChild(createServiceTreeLeaf(childPath, child.service, depth + 1, key, ctx));
    childrenEl.appendChild(ownItem);
  }

  details.appendChild(childrenEl);
  return details;
}

function summarizeServiceSubtree(node) {
  let total = 0;
  let running = 0;
  const walk = (n) => {
    if (n.service) {
      total++;
      if (serviceStatusKey(n.service) === 'RUNNING') running++;
    }
    for (const child of n.children.values()) {
      walk(child);
    }
  };
  walk(node);
  return { total, running };
}

function createServiceTreeLeaf(path, svc, depth, displayName, ctx) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'service-tree-leaf service-selectable';
  if (svc.serviceName === ctx.selectedServiceName) {
    row.classList.add('selected');
  }
  row.style.setProperty('--depth', String(depth));
  row.dataset.path = path;
  row.dataset.serviceName = svc.serviceName || '';
  const statusKey = serviceStatusKey(svc);
  const statusLabel = serviceStatusLabel(statusKey, ctx.t);
  const name = displayName || leafServiceName(svc.serviceName);
  row.innerHTML = `
    <span class="service-tree-item-icon" aria-hidden="true"></span>
    <span class="badge-dot ${statusDotClass(statusKey)}"></span>
    <span class="service-tree-leaf-name" title="${escapeHtml(svc.serviceName || '')}">${escapeHtml(name)}</span>
    <span class="service-tree-leaf-status">${escapeHtml(statusLabel)}</span>`;
  row.addEventListener('click', () => ctx.onSelect?.(svc));
  return row;
}

function createServiceBadge(svc, ctx) {
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'badge service-selectable';
  if (svc.serviceName === ctx.selectedServiceName) {
    badge.classList.add('selected');
  }
  const dot = document.createElement('span');
  dot.className = 'badge-dot ' + statusDotClass(serviceStatusKey(svc));
  badge.appendChild(dot);
  badge.appendChild(document.createTextNode(svc.serviceName || '—'));
  badge.title = svc.serviceName || '';
  badge.addEventListener('click', () => ctx.onSelect?.(svc));
  return badge;
}
