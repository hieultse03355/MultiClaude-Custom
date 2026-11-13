import * as fs from 'fs'

/** How much of a transcript's tail to scan when seeding a session's usage. */
const TAIL_BYTES = 1024 * 1024

interface UsageShape {
  input_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  output_tokens?: number
}

export interface LineUsage {
  /** Tokens occupying the context window as of this reply. */
  tokens: number
  model?: string
  effort?: string
}

/**
 * Context usage, model and effort of a main-thread assistant line, read from
 * the API-reported `usage`. Returns null for any other line (user lines,
 * subagent sidechains, lines without usage).
 */
export function usageFromLine(line: unknown): LineUsage | null {
  if (!line || typeof line !== 'object') return null
  const l = line as {
    type?: string
    isSidechain?: boolean
    effort?: string
    perTurnEffort?: string
    message?: { model?: string; usage?: UsageShape }
  }
  if (l.type !== 'assistant' || l.isSidechain) return null
  const u = l.message?.usage
  if (!u) return null
  const tokens =
    (u.input_tokens ?? 0) +
    (u.cache_creation_input_tokens ?? 0) +
    (u.cache_read_input_tokens ?? 0) +
    (u.output_tokens ?? 0)
  if (tokens <= 0) return null
  return {
    tokens,
    model: l.message?.model,
    effort: l.perTurnEffort ?? l.effort
  }
}

/**
 * Latest usage recorded in a transcript file, found by scanning its tail
 * backwards. Covers sessions whose history predates the log watcher, which
 * only reads bytes appended after app start.
 */
export function readLastUsage(filePath: string): LineUsage | null {
  let fd: number | null = null
  try {
    fd = fs.openSync(filePath, 'r')
    const size = fs.fstatSync(fd).size
    const start = Math.max(0, size - TAIL_BYTES)
    const buf = Buffer.alloc(size - start)
    fs.readSync(fd, buf, 0, buf.length, start)
    const lines = buf.toString('utf8').split('\n')
    // A mid-file start lands inside a line; drop that fragment.
    if (start > 0) lines.shift()
    for (let i = lines.length - 1; i >= 0; i--) {
      const raw = lines[i].trim()
      if (!raw.includes('"usage"')) continue
      try {
        const usage = usageFromLine(JSON.parse(raw))
        if (usage) return usage
      } catch {
        // skip malformed
      }
    }
    return null
  } catch {
    return null
  } finally {
    if (fd !== null) fs.closeSync(fd)
  }
}
