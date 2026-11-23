interface FileOpenButtonsProps {
  /** Open the file with its default app (reveal=false) or show it in Finder/Explorer */
  onOpen: (reveal: boolean) => void
}

/** Hover-only "open file" + "reveal in folder" icons for a file row in the git panel */
export function FileOpenButtons({ onOpen }: FileOpenButtonsProps) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover/file:opacity-100 transition-opacity flex-shrink-0">
      <IconButton title="Open file" onClick={() => onOpen(false)}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </IconButton>
      <IconButton title="Reveal in folder" onClick={() => onOpen(true)}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </IconButton>
    </div>
  )
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={e => { e.stopPropagation(); onClick() }}
      className="w-4 h-4 flex items-center justify-center rounded border-0 bg-transparent p-0 cursor-pointer text-[var(--mc-text-muted)] hover:text-[var(--mc-accent,#58a6ff)] hover:bg-[var(--mc-bg-tertiary)] transition-colors"
    >
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{children}</svg>
    </button>
  )
}
