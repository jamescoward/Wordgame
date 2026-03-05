import { useCallback, useRef } from 'react'
import { letterIndexAtPoint } from '../utils/wheelGeometry'
import '../styles/letterWheel.css'

interface LetterWheelProps {
  letters: string[]
  selectedIndices: number[]
  onLetterSelect: (index: number) => void
  onSubmit: () => void
  onShuffle: () => void
  currentWord: string
  isShaking?: boolean
}

const TWO_PI = Math.PI * 2

// Wheel geometry constants (match SVG viewBox layout)
const WHEEL_CX = 150
const WHEEL_CY = 150
const WHEEL_RADIUS = 110
const CONTAINER_SIZE = 300
const HIT_RADIUS = 36  // px — how close a touch must be to a letter centre

const WHEEL_CONFIG = {
  cx: WHEEL_CX,
  cy: WHEEL_CY,
  radius: WHEEL_RADIUS,
  containerSize: CONTAINER_SIZE,
}

export default function LetterWheel({
  letters,
  selectedIndices,
  onLetterSelect,
  onSubmit,
  onShuffle,
  currentWord,
  isShaking = false,
}: LetterWheelProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const lastDragIndex = useRef<number | null>(null)
  const isDragging = useRef(false)

  // Build SVG path string tracing selected letters in order
  const pathPoints = selectedIndices.map(i => {
    const angle = (TWO_PI * i) / letters.length - Math.PI / 2
    return {
      x: WHEEL_CX + WHEEL_RADIUS * Math.cos(angle),
      y: WHEEL_CY + WHEEL_RADIUS * Math.sin(angle),
    }
  })

  const pathD =
    pathPoints.length > 1
      ? pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : ''

  /**
   * Convert a client-space touch point to SVG coordinate space.
   * The SVG viewBox is 300×300 but the element renders at a different pixel size.
   */
  function clientToSvg(clientX: number, clientY: number): { x: number; y: number } | null {
    const wrapper = wrapperRef.current
    if (!wrapper) return null
    const rect = wrapper.getBoundingClientRect()
    const scaleX = CONTAINER_SIZE / rect.width
    const scaleY = CONTAINER_SIZE / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  function handleDragPoint(clientX: number, clientY: number) {
    const svgPt = clientToSvg(clientX, clientY)
    if (!svgPt) return
    const idx = letterIndexAtPoint(svgPt.x, svgPt.y, letters, WHEEL_CONFIG, HIT_RADIUS)
    if (idx !== null && idx !== lastDragIndex.current) {
      lastDragIndex.current = idx
      onLetterSelect(idx)
    }
  }

  // ── Touch handlers ────────────────────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    isDragging.current = true
    lastDragIndex.current = null
    const touch = e.touches[0]
    handleDragPoint(touch.clientX, touch.clientY)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letters, onLetterSelect])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    e.preventDefault()
    const touch = e.touches[0]
    handleDragPoint(touch.clientX, touch.clientY)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letters, onLetterSelect])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    isDragging.current = false
    lastDragIndex.current = null
    if (currentWord.length >= 3) {
      onSubmit()
    }
  }, [currentWord, onSubmit])

  return (
    <div className="letter-wheel-container" data-testid="letter-wheel">
      {/* Current word preview */}
      <div className="current-word" data-testid="current-word">
        {currentWord}
      </div>

      {/* Wheel */}
      <div
        ref={wrapperRef}
        className={`wheel-wrapper${isShaking ? ' shake' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          viewBox="0 0 300 300"
          className="wheel-svg"
          aria-hidden="true"
        >
          {/* Outer ring decoration */}
          <circle cx={WHEEL_CX} cy={WHEEL_CY} r={WHEEL_RADIUS + 28} className="wheel-ring" />

          {/* Trace line */}
          {pathD && (
            <path d={pathD} className="wheel-trace" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Dot at each selected letter */}
          {pathPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={6} className="wheel-dot" />
          ))}
        </svg>

        {/* Letter buttons positioned over SVG */}
        <div className="wheel-letters">
          {letters.map((letter, i) => {
            const angle = (TWO_PI * i) / letters.length - Math.PI / 2
            // Position relative to 300x300 SVG coordinate space, then convert to %
            const px = 50 + (WHEEL_RADIUS / 150) * Math.cos(angle) * 50
            const py = 50 + (WHEEL_RADIUS / 150) * Math.sin(angle) * 50
            const isSelected = selectedIndices.includes(i)

            return (
              <button
                key={i}
                className={`wheel-letter${isSelected ? ' selected' : ''}`}
                style={{
                  left: `${px}%`,
                  top: `${py}%`,
                }}
                aria-label={`Letter ${letter}`}
                data-testid={`wheel-letter-${i}`}
              >
                {letter}
              </button>
            )
          })}

          {/* Centre shuffle button */}
          <button
            className="wheel-center"
            onClick={onShuffle}
            aria-label="Shuffle letters"
            data-testid="shuffle-btn"
          >
            ↺
          </button>
        </div>
      </div>

    </div>
  )
}
