const DEFAULT_MAX_LEN = 80;

export function truncateCommand(command, maxLen = DEFAULT_MAX_LEN) {
  const text = (command || '').trim();
  if (!text) {
    return '—';
  }
  if (text.length <= maxLen) {
    return text;
  }
  return text.slice(0, Math.max(1, maxLen - 1)) + '…';
}

export async function copyToClipboard(text) {
  const value = text || '';
  if (!value) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function buildCommandCopyButton(command, t) {
  const full = command || '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'command-copy-btn';
  btn.title = t('processes.command.copy');
  btn.dataset.fullCommand = full;

  const code = document.createElement('code');
  code.className = 'command-text';
  code.textContent = truncateCommand(full);
  btn.appendChild(code);

  const icon = document.createElement('span');
  icon.className = 'command-copy-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '⧉';
  btn.appendChild(icon);

  return btn;
}

export function attachCommandCopyHandlers(container, t) {
  if (!container || container.dataset.commandCopyBound === '1') {
    return;
  }
  container.dataset.commandCopyBound = '1';
  container.addEventListener('click', async (event) => {
    const btn = event.target.closest('.command-copy-btn');
    if (!btn || !container.contains(btn)) {
      return;
    }
    const ok = await copyToClipboard(btn.dataset.fullCommand || '');
    if (!ok) {
      return;
    }
    btn.classList.add('copied');
    btn.title = t('processes.command.copied');
    window.setTimeout(() => {
      btn.classList.remove('copied');
      btn.title = t('processes.command.copy');
    }, 1500);
  });
}
