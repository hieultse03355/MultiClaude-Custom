import { useState, useEffect } from 'react'
import type { GitStatus } from '@shared/types'

const SUMMARY_POLL_MS = 5000

/**
 * Lightweight polling of `git status` for one repo — branch name and change
 * counts shown on a collapsed repo row in the multi-repo GitHub panel.
 * Disable it while the row is expanded: the embedded panel already polls.
 */
export function useGitRepoSummary(repoPath: string | undefined, enabled = true): GitStatus | null {
  const [status, setStatus] = useState<GitStatus | null>(null)

  useEffect(() => {
    if (!repoPath || !enabled) return
    let cancelled = false
    let inFlight = false

    const load = async () => {
      if (inFlight || document.hidden) return
      inFlight = true
      try {
        const next = await window.electron.git.status(repoPath)
        if (!cancelled) setStatus(next)
      } catch {
        // Keep the last known status on transient errors
      } finally {
        inFlight = false
      }
    }

    load()
    // Random offset so many repos don't spawn git processes on the same tick
    let interval: ReturnType<typeof setInterval> | undefined
    const start = setTimeout(() => {
      interval = setInterval(load, SUMMARY_POLL_MS)
    }, Math.random() * SUMMARY_POLL_MS)

    return () => {
      cancelled = true
      clearTimeout(start)
      if (interval) clearInterval(interval)
    }
  }, [repoPath, enabled])

  return status
}
