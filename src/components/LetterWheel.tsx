import { useCallback } from 'react'
import '../styles/letterWheel.css'

interface LetterWheelProps {
  letters: string[]
  selectedIndices: number[]
  onLetterTap: (index: number) => void
  onClear: () => void
  onSubmit: () => void
  onShuffle: () => void
  currentWord: string
}

const TWO_PI = Math.PI * 2

export default function LetterWheel({
  letters,
  selectedIndices,
  onLetterTap,
  onClear,
  onSubmit,
  onShuffle,
  currentWord,
}: LetterWheelProps) {
  const radius = 110 // px, distance from center to letter center
  const cx = 150     // SVG viewBox centre
  const cy = 150

  // Build SVG path string tracing selected letters in order
  const pathPoints = selectedIndices.map(i => {
    const angle = (TWO_PI * i) / letters.length - Math.PI / 2
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    }
  })

  const pathD =
    pathPoints.length > 1
      ? pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : ''

  const handleTap = useCallback(
    (index: number) => () => onLetterTap(index),
    [onLetterTap]
  )

  return (
    <div className="letter-wheel-container" data-testid="letter-wheel">
      {/* Current word preview */}
      <div className="current-word" data-testid="current-word">
        {currentWord || <span className="placeholder">Tap letters to spell a word</span>}
      </div>

      {/* Wheel */}
      <div className="wheel-wrapper">
        <svg
          viewBox="0 0 300 300"
          className="wheel-svg"
          aria-hidden="true"
        >
          {/* Outer ring decoration */}
          <circle cx={cx} cy={cy} r={radius + 28} className="wheel-ring" />

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
            const px = 50 + (radius / 150) * Math.cos(angle) * 50
            const py = 50 + (radius / 150) * Math.sin(angle) * 50
            const isSelected = selectedIndices.includes(i)

            return (
              <button
                key={i}
                className={`wheel-letter${isSelected ? ' selected' : ''}`}
                style={{
                  left: `${px}%`,
                  top: `${py}%`,
                }}
                onClick={handleTap(i)}
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

      {/* Action buttons */}
      <div className="wheel-actions">
        <button
          className="action-btn clear-btn"
          onClick={onClear}
          disabled={currentWord.length === 0}
          data-testid="clear-btn"
        >
          Clear
        </button>
        <button
          className="action-btn submit-btn"
          onClick={onSubmit}
          disabled={currentWord.length < 3}
          data-testid="submit-btn"
        >
          Enter
        </button>
      </div>
    </div>
  )
}
