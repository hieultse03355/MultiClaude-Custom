// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExtraGitRepos } from '../use-extra-git-repos'

// In-memory Storage — the test runtime's localStorage is not always available
function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: k => data.get(k) ?? null,
    key: i => [...data.keys()][i] ?? null,
    removeItem: k => { data.delete(k) },
    setItem: (k, v) => { data.set(k, String(v)) }
  }
}

describe('useExtraGitRepos', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', memoryStorage()) })

  it('adds, dedupes and removes repos, persisting per project', () => {
    const { result, unmount } = renderHook(() => useExtraGitRepos('/proj/a'))
    act(() => result.current.addRepo('/repos/x'))
    act(() => result.current.addRepo('/repos/x'))
    act(() => result.current.addRepo('/repos/y'))
    expect(result.current.repos).toEqual(['/repos/x', '/repos/y'])
    unmount()

    // Survives remount (persisted)
    const again = renderHook(() => useExtraGitRepos('/proj/a'))
    expect(again.result.current.repos).toEqual(['/repos/x', '/repos/y'])
    act(() => again.result.current.removeRepo('/repos/x'))
    expect(again.result.current.repos).toEqual(['/repos/y'])
  })

  it('ignores the active project path itself', () => {
    const { result } = renderHook(() => useExtraGitRepos('/proj/a'))
    act(() => result.current.addRepo('/proj/a'))
    expect(result.current.repos).toEqual([])
  })

  it('keeps a separate list per project and reloads on project switch', () => {
    const { result, rerender } = renderHook(({ p }) => useExtraGitRepos(p), { initialProps: { p: '/proj/a' } })
    act(() => result.current.addRepo('/repos/x'))
    rerender({ p: '/proj/b' })
    expect(result.current.repos).toEqual([])
    rerender({ p: '/proj/a' })
    expect(result.current.repos).toEqual(['/repos/x'])
  })

  it('survives corrupt storage', () => {
    localStorage.setItem('git-panel-extra-repos:/proj/a', '{not json')
    const { result } = renderHook(() => useExtraGitRepos('/proj/a'))
    expect(result.current.repos).toEqual([])
  })
})
