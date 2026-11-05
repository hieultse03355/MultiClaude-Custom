import { useState, useEffect, useCallback } from 'react'

/**
 * Extra git repository folders the user added by hand to the GitHub panel,
 * stored per active project so each project tab keeps its own related repos.
 * The active project's own path is never stored here — it is always shown.
 */

const STORAGE_PREFIX = 'git-panel-extra-repos:'

function readRepos(projectPath: string | undefined): string[] {
  if (!projectPath) return []
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + projectPath)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

function writeRepos(projectPath: string, repos: string[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + projectPath, JSON.stringify(repos))
  } catch {
    // Storage unavailable — list stays in memory for this session only
  }
}

export function useExtraGitRepos(projectPath: string | undefined) {
  const [repos, setRepos] = useState<string[]>(() => readRepos(projectPath))

  // Reload when the active project changes
  useEffect(() => {
    setRepos(readRepos(projectPath))
  }, [projectPath])

  const addRepo = useCallback((repoPath: string) => {
    if (!projectPath || repoPath === projectPath) return
    setRepos(prev => {
      if (prev.includes(repoPath)) return prev
      const next = [...prev, repoPath]
      writeRepos(projectPath, next)
      return next
    })
  }, [projectPath])

  const removeRepo = useCallback((repoPath: string) => {
    if (!projectPath) return
    setRepos(prev => {
      const next = prev.filter(p => p !== repoPath)
      writeRepos(projectPath, next)
      return next
    })
  }, [projectPath])

  return { repos, addRepo, removeRepo }
}
