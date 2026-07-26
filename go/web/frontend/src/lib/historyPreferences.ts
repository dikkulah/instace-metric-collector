const SAMPLE_LIMIT_KEY = 'imc.history.sampleLimit'

export const HISTORY_SAMPLE_LIMIT_MIN = 50
export const HISTORY_SAMPLE_LIMIT_MAX = 5000
export const HISTORY_SAMPLE_LIMIT_DEFAULT = 500

export function clampHistorySampleLimit(value: number): number {
  if (!Number.isFinite(value)) return HISTORY_SAMPLE_LIMIT_DEFAULT
  return Math.min(HISTORY_SAMPLE_LIMIT_MAX, Math.max(HISTORY_SAMPLE_LIMIT_MIN, Math.round(value)))
}

export function loadHistorySampleLimit(): number {
  try {
    const raw = localStorage.getItem(SAMPLE_LIMIT_KEY)
    if (!raw) return HISTORY_SAMPLE_LIMIT_DEFAULT
    return clampHistorySampleLimit(Number(raw))
  } catch {
    return HISTORY_SAMPLE_LIMIT_DEFAULT
  }
}

export function saveHistorySampleLimit(limit: number): void {
  try {
    localStorage.setItem(SAMPLE_LIMIT_KEY, String(clampHistorySampleLimit(limit)))
  } catch {
    /* ignore */
  }
}
