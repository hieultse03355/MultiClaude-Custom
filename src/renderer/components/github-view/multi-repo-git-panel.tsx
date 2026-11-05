import { useCallback, useState } from 'react'
import type { GitStatus } from '@shared/types'
import { useExtraGitRepos } from '../../hooks/use-extra-git-repos'
import { useToastStore } from '../../stores'
import { GitHubPanelContent } from './github-view'
import { GitHubAccountSection } from './github-account-section'
import { RepoRow, clearRepoRowState } from './repo-row'

interface MultiRepoGitPanelProps {
  projectPath: string | undefined
}

/** Drop trailing slashes so "/a/b/" and "/a/b" are the same repo */
function normalizePath(p: string): string {
  return p.length > 1 ? p.replace(/[\\/]+$/, '') : p
}

/**
 * GitHub panel showing several git repositories at once (VS Code style):
 * the active project's repo plus any folders the user added by hand.
 * Each repo is a collapsible row expanding into the full git panel.
 * Mount with `key={projectPath}` so a project switch starts from a fresh instance.
 */
export function MultiRepoGitPanel({ projectPath }: MultiRepoGitPanelProps) {
  const { repos, addRepo, removeRepo } = useExtraGitRepos(projectPath)
  const [primaryStatus, setPrimaryStatus] = useState<GitStatus | null>(null)

  const handleAddRepo = useCallback(async () => {
    try {
      const picked = await window.electron.project.openFolder()
      if (!picked) return
      const repoPath = normalizePath(picked)
      const status = await window.electron.git.status(repoPath)
      if (!status.isRepo) {
        useToastStore.getState().addToast(`Not a git repository: ${repoPath}`, 'error')
        return
      }
      addRepo(repoPath)
    } catch (err) {
      useToastStore.getState().addToast(`Failed to add repository: ${String(err)}`, 'error')
    }
  }, [addRepo])

  const handleRemoveRepo = useCallback((repoPath: string) => {
    removeRepo(repoPath)
    clearRepoRowState(repoPath)
  }, [removeRepo])

  // No project selected — keep the original empty state
  if (!projectPath) return <GitHubPanelContent projectPath={undefined} />

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--mc-bg-primary)]">
      <div className="flex items-center justify-between px-2.5 py-1 border-b border-[var(--mc-border)]">
        <span className="text-[10.5px] font-semibold text-[var(--mc-text-muted)] uppercase tracking-widest">
          Repositories <span className="opacity-70">{repos.length + 1}</span>
        </span>
        <button
          onClick={handleAddRepo}
          title="Add a git folder to this panel"
          className="flex items-center gap-1 px-1.5 h-5 rounded border-0 bg-transparent cursor-pointer text-[10.5px] text-[var(--mc-text-muted)] hover:text-[var(--mc-accent,#58a6ff)] hover:bg-[var(--mc-bg-tertiary)] transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add folder
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <RepoRow repoPath={projectPath} isPrimary onStatus={setPrimaryStatus} />
        {repos.map(repo => (
          <RepoRow key={repo} repoPath={repo} isPrimary={false} onRemove={() => handleRemoveRepo(repo)} />
        ))}
      </div>

      {/* Account section once for the whole panel, using the active project's repo */}
      <GitHubAccountSection
        currentBranch={primaryStatus?.branch}
        hasRemote={primaryStatus?.hasRemote ?? false}
      />
    </div>
  )
}
