import { memo } from 'react'
import { formatTokens } from '@shared/utils/format-tokens'
import { useAppStore, useContextWindowStore } from '../../stores'
import { useContextSnapshot } from '../../hooks/use-context-snapshot'
import {
  CONTEXT_LIMIT,
  CONTEXT_WARNING_THRESHOLD,
  formatModelName,
  getContextUsagePct,
  getContextUsedTokens
} from './context-category-meta'

interface Props {
  terminalId: string
}

/** Slim per-pane footer showing how much of the context window the pane's Claude session uses. */
function ContextUsageBarImpl({ terminalId }: Props) {
  const sessionId = useAppStore(
    (s) => s.terminals.find((t) => t.id === terminalId)?.claudeSessionId ?? null
  )
  const { snapshot } = useContextSnapshot(sessionId)
  if (!snapshot) return null

  const used = getContextUsedTokens(snapshot)
  const pct = getContextUsagePct(used)
  const warning = used > CONTEXT_WARNING_THRESHOLD

  return (
    <button
      type="button"
      className={`context-usage-bar${warning ? ' context-usage-bar-warn' : ''}`}
      title="Open context window breakdown"
      onClick={() => useContextWindowStore.getState().setOpen(true)}
    >
      <span className="context-usage-bar-label">Context</span>
      <span className="context-usage-bar-meter">
        <span className="context-usage-bar-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="context-usage-bar-value">
        {pct}% · {formatTokens(used)} / {formatTokens(CONTEXT_LIMIT)}
      </span>
      {(snapshot.model || snapshot.effort) && (
        <span className="context-usage-bar-model" title={snapshot.model}>
          {[snapshot.model && formatModelName(snapshot.model), snapshot.effort]
            .filter(Boolean)
            .join(' · ')}
        </span>
      )}
    </button>
  )
}

export const ContextUsageBar = memo(ContextUsageBarImpl)
