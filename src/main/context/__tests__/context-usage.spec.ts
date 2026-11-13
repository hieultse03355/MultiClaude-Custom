import { describe, it, expect, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { readLastUsage, usageFromLine } from '../context-usage'

const usage = { input_tokens: 2, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 50 }

describe('usageFromLine', () => {
  it('sums input, cache and output tokens and reads model and effort', () => {
    expect(
      usageFromLine({
        type: 'assistant',
        effort: 'high',
        perTurnEffort: 'medium',
        message: { model: 'claude-opus-5-5', usage }
      })
    ).toEqual({ tokens: 1152, model: 'claude-opus-5-5', effort: 'medium' })
  })

  it('falls back to session effort when no per-turn effort is set', () => {
    expect(usageFromLine({ type: 'assistant', effort: 'high', message: { usage } })?.effort).toBe('high')
  })

  it('ignores sidechain, user, zero-usage and usage-less lines', () => {
    expect(usageFromLine({ type: 'assistant', isSidechain: true, message: { usage } })).toBeNull()
    expect(usageFromLine({ type: 'user', message: { usage } })).toBeNull()
    expect(usageFromLine({ type: 'assistant', message: { usage: { input_tokens: 0 } } })).toBeNull()
    expect(usageFromLine({ type: 'assistant', message: {} })).toBeNull()
  })
})

describe('readLastUsage', () => {
  let dir: string | null = null
  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true })
    dir = null
  })

  it('returns the latest main-thread assistant usage in the file', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-usage-'))
    const file = path.join(dir, 's.jsonl')
    const lines = [
      { type: 'assistant', message: { usage: { input_tokens: 10 } } },
      { type: 'assistant', message: { model: 'claude-opus-5-5', usage } },
      { type: 'assistant', isSidechain: true, message: { usage: { input_tokens: 5 } } },
      { type: 'user', message: { content: 'hi' } }
    ]
    fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join('\n') + '\n')
    expect(readLastUsage(file)).toMatchObject({ tokens: 1152, model: 'claude-opus-5-5' })
  })

  it('returns null for a missing file', () => {
    expect(readLastUsage('/nonexistent/x.jsonl')).toBeNull()
  })
})
