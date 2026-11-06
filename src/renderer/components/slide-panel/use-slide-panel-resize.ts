import { useState, useCallback, useEffect, useRef } from 'react'

const STORAGE_PREFIX = 'slide-panel-size:'
const MIN_WIDTH = 280
const MIN_HEIGHT = 150
/** Panel may take at most this fraction of the window */
const MAX_FRACTION = 0.9

function readStored(key: string): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function writeStored(key: string, value: number): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, String(Math.round(value)))
  } catch {
    // Ignore storage errors
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Drag-to-resize for a slide panel: width when docked right, height when
 * docked bottom. Sizes are remembered per panel (`resizeKey`) and orientation.
 * Returns null size until the user resizes (CSS default applies).
 */
export function useSlidePanelResize(resizeKey: string | undefined, isPortrait: boolean) {
  const sizeKey = resizeKey ? `${resizeKey}:${isPortrait ? 'h' : 'w'}` : null
  const [size, setSize] = useState<number | null>(() => (sizeKey ? readStored(sizeKey) : null))
  const [isResizing, setIsResizing] = useState(false)
  const sizeRef = useRef(size)
  sizeRef.current = size

  // Orientation flip switches to the other remembered dimension
  useEffect(() => {
    setSize(sizeKey ? readStored(sizeKey) : null)
  }, [sizeKey])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!sizeKey || e.button !== 0) return
    e.preventDefault()
    const handle = e.currentTarget
    const panel = handle.parentElement
    if (!panel) return
    handle.setPointerCapture(e.pointerId)

    const startPos = isPortrait ? e.clientY : e.clientX
    const startSize = isPortrait ? panel.offsetHeight : panel.offsetWidth
    const min = isPortrait ? MIN_HEIGHT : MIN_WIDTH
    const max = (isPortrait ? window.innerHeight : window.innerWidth) * MAX_FRACTION
    setIsResizing(true)
    document.body.style.cursor = isPortrait ? 'ns-resize' : 'ew-resize'
    document.body.style.userSelect = 'none'

    // Panel grows toward the left (right dock) or upward (bottom dock)
    const onMove = (ev: PointerEvent) => {
      const delta = startPos - (isPortrait ? ev.clientY : ev.clientX)
      setSize(clamp(startSize + delta, min, Math.max(min, max)))
    }
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setIsResizing(false)
      if (sizeRef.current !== null) writeStored(sizeKey, sizeRef.current)
    }
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
    handle.addEventListener('pointercancel', onUp)
  }, [sizeKey, isPortrait])

  /** Double-click the handle to go back to the default size */
  const onDoubleClick = useCallback(() => {
    if (!sizeKey) return
    setSize(null)
    try {
      localStorage.removeItem(STORAGE_PREFIX + sizeKey)
    } catch {
      // Ignore storage errors
    }
  }, [sizeKey])

  return { size, isResizing, onPointerDown, onDoubleClick }
}
