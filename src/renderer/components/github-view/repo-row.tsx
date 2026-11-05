import { useState, useEffect, useCallback, useRef } from 'react'
import type { GitStatus } from '@shared/types'
import { useGitRepoSummary } from '../../hooks/use-git-repo-summary'
import { GitHubPanelContent } from './github-view'

interface RepoRowProps {
  repoPath: string
  /** The active project's own repo — opened by default and cannot be removed */
  isPrimary: boolean
  onRemove?: () => void
  /** Latest git status of this repo (from row polling or the embedded panel) */
  onStatus?: (status: GitStatus | null) => void
}

const OPEN_KEY_PREFIX = 'git-panel-repo-open:'
/** Consecutive isRepo:false results before an extra repo is treated as gone */
const NOT_REPO_THRESHOLD = 2

function folderName(repoPath: string): string {
  return repoPath.split(/[\\/]/).filter(Boolean).pop() ?? repoPath
}

/** Forget the stored open/closed state of a repo row (used when removing it). */
export function clearRepoRowState(repoPath: string): void {
  try {
    localStorage.removeItem(OPEN_KEY_PREFIX + repoPath)
  } catch {
    // Ignore storage errors
  }
}

/**
 * One repository in the multi-repo GitHub panel: a sticky header row (name,
 * branch, change count) that expands into the full git panel for that repo.
 */
export function RepoRow({ repoPath, isPrimary, onRemove, onStatus }: RepoRowProps) {
  const storageKey = OPEN_KEY_PREFIX + repoPath
  const [isOpen, setIsOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored !== null ? stored === 'true' : isPrimary
    } catch {
      return isPrimary
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(isOpen))
    } catch {
      // Ignore storage errors
    }
  }, [isOpen, storageKey])

  // Status comes from row polling while collapsed, from the embedded panel while open
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [notARepo, setNotARepo] = useState(false)
  const notRepoStreakRef = useRef(0)

  const handleStatus = useCallback((next: GitStatus | null) => {
    if (!next) return
    setStatus(next)
    notRepoStreakRef.current = next.isRepo ? 0 : notRepoStreakRef.current + 1
    setNotARepo(notRepoStreakRef.current >= NOT_REPO_THRESHOLD)
  }, [])

  const polled = useGitRepoSummary(repoPath, !isOpen)
  useEffect(() => { handleStatus(polled) }, [polled, handleStatus])
  useEffect(() => { onStatus?.(status) }, [status, onStatus])

  const changeCount = status ? status.staged + status.unstaged + status.untracked : 0
  // The primary repo always keeps its panel (same behaviour as the old single-repo panel)
  const hidePanel = notARepo && !isPrimary

  return (
    <div className="border-b border-[var(--mc-border)]">
      <div
        className="sticky top-0 z-10 group/repo flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none bg-[var(--mc-bg-secondary)] hover:bg-[var(--mc-bg-hover)] border-b border-[var(--mc-border)]/60 transition-colors"
        onClick={() => setIsOpen(prev => !prev)}
        title={repoPath}
      >
        <svg
          className={`w-2.5 h-2.5 text-[var(--mc-text-muted)] transition-transform duration-150 flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>

        <span className="text-[12px] font-semibold text-[var(--mc-text-primary)] truncate min-w-0">
          {folderName(repoPath)}
        </span>

        {status?.branch && (
          <span className="text-[10.5px] text-green-400 truncate flex-shrink min-w-0">{status.branch}</span>
        )}
        {notARepo && <span className="text-[10.5px] text-red-400 flex-shrink-0">not a git repo</span>}

        <span className="flex-1" />

        {!!status?.ahead && (
          <span
            className="text-[10px] font-semibold flex-shrink-0 text-sky-400"
            title={`${status.ahead} commit(s) not pushed to ${status.tracking ?? 'remote'}`}
          >
            ↑{status.ahead}
          </span>
        )}

        {changeCount > 0 && (
          <span
            className="text-[10px] font-semibold px-1.5 rounded-full leading-[16px] flex-shrink-0 text-amber-400 bg-amber-400/10"
            title={`${status?.staged ?? 0} staged · ${status?.unstaged ?? 0} changed · ${status?.untracked ?? 0} untracked`}
          >
            {changeCount}
          </span>
        )}

        {!isPrimary && onRemove && (
          <button
            title="Remove from panel (folder is not deleted)"
            onClick={e => { e.stopPropagation(); onRemove() }}
            className="w-5 h-5 flex items-center justify-center rounded border-0 bg-transparent p-0 cursor-pointer opacity-0 group-hover/repo:opacity-100 text-[var(--mc-text-muted)] hover:text-red-400 hover:bg-[var(--mc-bg-tertiary)] transition-all flex-shrink-0"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && !hidePanel && (
        <GitHubPanelContent
          projectPath={repoPath}
          embedded
          // Primary keeps the original section keys so existing open/closed prefs survive
          sectionScope={isPrimary ? undefined : repoPath}
          onStatusChange={handleStatus}
        />
      )}
    </div>
  )
}
