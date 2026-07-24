import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="text-xs px-2 py-1 rounded border border-outline-variant hover:bg-surface-high text-on-surface-variant"
      aria-label={label ?? t('containers.detail.copyId')}
    >
      {copied ? t('containers.detail.copied') : (label ?? t('containers.detail.copyId'))}
    </button>
  )
}
