import { describe, it, expect } from 'vitest'
import { formatModelName } from '../context-category-meta'

describe('formatModelName', () => {
  it('shortens Claude model ids', () => {
    expect(formatModelName('claude-opus-5-5')).toBe('Opus 5.5')
    expect(formatModelName('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
    expect(formatModelName('claude-fable-5-1')).toBe('Fable 5.1')
  })

  it('returns unrecognised ids unchanged', () => {
    expect(formatModelName('<synthetic>')).toBe('<synthetic>')
  })
})
