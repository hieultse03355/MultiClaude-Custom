import { useState, useCallback, useRef, useEffect } from 'react'
import type { GitLogEntry, GitBranchDiffFile } from '@shared/types'
import { BranchDiffFileList } from '../github-view/branch-diff-file-list'

interface HistoryTabProps {
  projectPath: string
  entries: GitLogEntry[]
  isLoading?: boolean
  /** Open the diff of one file as changed by one commit */
  onFileClick: (entry: GitLogEntry, file: GitBranchDiffFile) => void
}

/** Per-commit changed-file list; commits are immutable so results are cached */
type CommitFilesState = GitBranchDiffFile[] | 'loading' | 'error'

const MAX_VISIBLE = 20

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString()
}

export function HistoryTab({ projectPath, entries, isLoading, onFileClick }: HistoryTabProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [commitFiles, setCommitFiles] = useState<Record<string, CommitFilesState>>({})
  const commitFilesRef = useRef(commitFiles)
  commitFilesRef.current = commitFiles

  // Cached file lists belong to one repo
  useEffect(() => {
    setExpanded(new Set())
    setCommitFiles({})
  }, [projectPath])

  const loadFiles = useCallback(async (hash: string) => {
    const cached = commitFilesRef.current[hash]
    if (cached && cached !== 'error') return
    setCommitFiles(prev => ({ ...prev, [hash]: 'loading' }))
    try {
      const files = await window.electron.git.commitFiles(projectPath, hash)
      setCommitFiles(prev => ({ ...prev, [hash]: files }))
    } catch {
      setCommitFiles(prev => ({ ...prev, [hash]: 'error' }))
    }
  }, [projectPath])

  const toggle = useCallback((hash: string) => {
    const opening = !expanded.has(hash)
    setExpanded(prev => {
      const next = new Set(prev)
      if (opening) next.add(hash)
      else next.delete(hash)
      return next
    })
    if (opening) void loadFiles(hash)
  }, [expanded, loadFiles])

  // Only show the loading placeholder on first load — background polls keep the
  // current list on screen (swapping it for a placeholder made the list flicker)
  if (isLoading && entries.length === 0) {
    return <div className="px-3 py-3 text-xs text-[var(--mc-text-muted)] text-center">Loading history...</div>
  }

  if (entries.length === 0) {
    return <div className="px-3 py-3 text-xs text-[var(--mc-text-muted)] text-center">No commits yet</div>
  }

  return (
    <div>
      {entries.slice(0, MAX_VISIBLE).map(entry => {
        const isOpen = expanded.has(entry.hash)
        const files = commitFiles[entry.hash]
        return (
          <div key={entry.hash}>
            <div
              className="flex items-center gap-1.5 px-3 py-[3px] hover:bg-[var(--mc-bg-hover)] transition-colors cursor-pointer select-none"
              onClick={() => toggle(entry.hash)}
              title={`${entry.message}\n${entry.author} · ${new Date(entry.date).toLocaleString()}`}
            >
              <svg
                className={`w-2.5 h-2.5 text-[var(--mc-text-muted)] flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-mono text-[10px] text-yellow-500 flex-shrink-0">{entry.hashShort}</span>
              {/* "local" = not on any remote yet (no badge when the repo has no remote) */}
              {entry.pushed === false && (
                <span
                  className="text-[9px] font-semibold uppercase px-1 rounded leading-[14px] flex-shrink-0 text-amber-400 bg-amber-400/15"
                  title="Only in the local repo — not pushed to any remote yet"
                >
                  local
                </span>
              )}
              <span className="text-[10px] text-[var(--mc-text-primary)] truncate flex-1">{entry.message}</span>
              <span className="text-[10px] text-[var(--mc-text-muted)] flex-shrink-0 whitespace-nowrap">{formatRelativeDate(entry.date)}</span>
            </div>

            {isOpen && (
              <div className="pl-3 border-l border-[var(--mc-border)]/60 ml-[17px]">
                {files === 'loading' || files === undefined ? (
                  <div className="px-2 py-1 text-[10px] text-[var(--mc-text-muted)] italic">Loading files...</div>
                ) : files === 'error' ? (
                  <div className="px-2 py-1 text-[10px] text-red-400">Failed to load files</div>
                ) : (
                  <BranchDiffFileList
                    files={files}
                    onFileClick={file => onFileClick(entry, file)}
                    emptyText="No file changes"
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
      {entries.length > MAX_VISIBLE && (
        <div className="px-3 py-1 text-[10px] text-[var(--mc-text-muted)] text-center">
          +{entries.length - MAX_VISIBLE} more
        </div>
      )}
    </div>
  )
}
