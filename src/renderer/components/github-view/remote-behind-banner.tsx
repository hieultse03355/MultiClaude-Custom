interface RemoteBehindBannerProps {
  /** Commits on the upstream branch not yet pulled */
  behind: number
  /** Upstream branch name, e.g. "origin/main" */
  tracking: string | undefined
  /** Local commits not yet pushed — a pull will merge instead of fast-forward */
  ahead: number
  syncing: boolean
  onPull: () => void
}

/**
 * Shown under the panel header when the remote branch has commits the local
 * branch lacks (known after the background fetch the panel runs on open).
 */
export function RemoteBehindBanner({ behind, tracking, ahead, syncing, onPull }: RemoteBehindBannerProps) {
  if (behind <= 0) return null

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[var(--mc-border)]/60 bg-sky-400/10">
      <span className="text-[11px] font-semibold text-sky-400 flex-shrink-0">↓{behind}</span>
      <span
        className="text-[10.5px] text-[var(--mc-text-secondary)] truncate flex-1 min-w-0"
        title={ahead > 0 ? `Branch has diverged: ${ahead} local commit(s) not pushed — pull will merge` : undefined}
      >
        {behind} new commit{behind > 1 ? 's' : ''} on {tracking ?? 'remote'}
        {ahead > 0 && <span className="text-amber-400"> · diverged</span>}
      </span>
      <button
        onClick={onPull}
        disabled={syncing}
        className="flex items-center gap-1 px-2 h-5 rounded border-0 cursor-pointer text-[10.5px] font-semibold bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
      >
        <svg className={`w-3 h-3 ${syncing ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        {syncing ? 'Pulling…' : 'Pull'}
      </button>
    </div>
  )
}
