import type { ContextCategory } from '@shared/types'

export interface CategoryMeta {
  label: string
  /** CSS variable or direct color — rendered as the bar fill. */
  color: string
  /** Sort order in the drawer (top = smallest). */
  order: number
}

export const CATEGORY_META: Record<ContextCategory, CategoryMeta> = {
  'claude-md': { label: 'CLAUDE.md', color: 'var(--accent-purple, #a78bfa)', order: 1 },
  'mentioned-file': { label: 'Mentioned files', color: 'var(--accent-blue, #60a5fa)', order: 2 },
  'tool-output': { label: 'Tool output', color: 'var(--accent-cyan, #22d3ee)', order: 3 },
  'thinking-text': { label: 'Thinking + text', color: 'var(--accent-green, #4ade80)', order: 4 },
  'task-coordination': { label: 'Task coordination', color: 'var(--accent-orange, #fb923c)', order: 5 },
  'user-messages': { label: 'User messages', color: 'var(--accent-pink, #f472b6)', order: 6 }
}

/** Context window size the usage percentage is measured against. */
export const CONTEXT_LIMIT = 1_000_000

/** Warn when total tokens cross 80% of the context window. */
export const CONTEXT_WARNING_THRESHOLD = CONTEXT_LIMIT * 0.8

/** Share of {@link CONTEXT_LIMIT} used, as a whole percentage capped at 100. */
export function getContextUsagePct(total: number): number {
  return Math.min(100, Math.round((total / CONTEXT_LIMIT) * 100))
}

/**
 * Tokens to measure against the window: the API-reported usage when known,
 * else the categorized estimate (which omits system prompt and tools).
 */
export function getContextUsedTokens(snapshot: { usedTokens?: number; total: number }): number {
  return snapshot.usedTokens ?? snapshot.total
}

/** Short display name for a model id: `claude-opus-5-5` → `Opus 5.5`. */
export function formatModelName(model: string): string {
  const m = /^claude-([a-z]+)-(\d+(?:-\d+)*?)(?:-\d{8})?$/.exec(model)
  if (!m) return model
  return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2].replace(/-/g, '.')}`
}
