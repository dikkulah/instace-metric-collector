const STORAGE_KEY = 'metrics.ui.locale';

let messages = {};
let locale = 'en';

export async function initI18n(defaultLocale, supportedLocales) {
  locale = resolveLocale(defaultLocale, supportedLocales);
  await loadLocale(locale);
  applyTranslations(document);
  return locale;
}

function resolveLocale(defaultLocale, supportedLocales) {
  const stored = localStorage.getItem(STORAGE_KEY);
  const supported = supportedLocales.split(',').map(s => s.trim()).filter(Boolean);
  if (stored && supported.includes(stored)) {
    return stored;
  }
  const browser = (navigator.language || 'en').toLowerCase();
  if (browser.startsWith('tr') && supported.includes('tr')) {
    return 'tr';
  }
  return supported.includes(defaultLocale) ? defaultLocale : (supported[0] || 'en');
}

export async function setLocale(next) {
  locale = next;
  localStorage.setItem(STORAGE_KEY, next);
  await loadLocale(locale);
  applyTranslations(document);
  document.dispatchEvent(new CustomEvent('locale-changed', { detail: locale }));
}

export function t(key) {
  return messages[key] || key;
}

export function getLocale() {
  return locale;
}

async function loadLocale(loc) {
  const response = await fetch(`/locales/${loc}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load locale: ${loc}`);
  }
  messages = await response.json();
}

function applyTranslations(root) {
  root.querySelectorAll('[data-i18n]:not([data-i18n-dynamic])').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.setAttribute('title', t(key));
  });
}
