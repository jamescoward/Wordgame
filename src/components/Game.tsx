import { useState, useEffect, useRef } from 'react'
import { useGameState } from '../hooks/useGameState'
import LetterWheel from './LetterWheel'
import WordGrid from './WordGrid'
import puzzlesData from '../data/puzzles.json'
import type { Puzzle } from '../types'
import '../styles/game.css'

const puzzles = puzzlesData as Puzzle[]

const STORAGE_KEY = 'wordgame_state_v2'

interface PersistedState {
  puzzleIndex: number
  foundWords: string[]
  score: number
  hints: number
  revealedHints: string[]
}

function loadSaved(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : null
  } catch {
    return null
  }
}

type FeedbackKind = 'found' | 'already_found' | 'invalid' | 'complete' | 'hinted' | 'no_hints' | null

export default function Game() {
  const saved = loadSaved()
  const initialPuzzleIndex = saved?.puzzleIndex ?? 0
  const puzzle = puzzles[initialPuzzleIndex % puzzles.length]

  const { state, selectLetter, clearInput, submitWord, shuffleWheel, useHint, isPuzzleComplete } =
    useGameState(puzzle)

  const [feedback, setFeedback] = useState<FeedbackKind>(null)
  const [isShaking, setIsShaking] = useState(false)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist state on change
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        puzzleIndex: state.puzzleIndex,
        foundWords: state.foundWords,
        score: state.score,
        hints: state.hints,
        revealedHints: state.revealedHints,
      })
    )
  }, [state.foundWords, state.puzzleIndex, state.score, state.hints, state.revealedHints])

  function showFeedback(kind: FeedbackKind, duration = 1200) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    setFeedback(kind)
    feedbackTimer.current = setTimeout(() => setFeedback(null), duration)
  }

  function triggerShake() {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }

  function handleSubmit() {
    const result = submitWord()
    if (result === 'found' && isPuzzleComplete) {
      showFeedback('complete', 2500)
    } else if (result === 'invalid') {
      triggerShake()
      showFeedback('invalid')
    } else {
      showFeedback(result)
    }
  }

  function handleHint() {
    const result = useHint()
    if (result === 'hinted') showFeedback('hinted')
    else if (result === 'no_hints') showFeedback('no_hints')
  }

  function handleNextPuzzle() {
    const nextIndex = (initialPuzzleIndex + 1) % puzzles.length
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        puzzleIndex: nextIndex,
        foundWords: [],
        score: state.score,
        hints: state.hints,
        revealedHints: [],
      })
    )
    window.location.reload()
  }

  const feedbackMessages: Record<NonNullable<FeedbackKind>, string> = {
    found: '✓ Found!',
    already_found: 'Already found',
    invalid: 'Not a word',
    complete: '🎉 Puzzle complete!',
    hinted: '💡 Hint revealed',
    no_hints: 'No hints left',
  }

  return (
    <div className="game" data-testid="game">
      {/* Header */}
      <header className="game-header">
        <h1 className="game-title">Word Game</h1>
        <div className="game-header-right">
          <div className="game-score" data-testid="score">
            ⭐ {state.score}
          </div>
          <button
            className="hint-btn"
            onClick={handleHint}
            disabled={state.hints === 0}
            data-testid="hint-btn"
            aria-label={`Use hint (${state.hints} remaining)`}
          >
            💡 {state.hints}
          </button>
        </div>
      </header>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`feedback-toast feedback-${feedback}`}
          data-testid="feedback"
        >
          {feedbackMessages[feedback]}
        </div>
      )}

      {/* Word grid — scrollable */}
      <main className="game-main">
        <WordGrid
          words={state.puzzle.words}
          foundWords={state.foundWords}
          revealedHints={state.revealedHints}
        />
      </main>

      {/* Letter wheel — fixed to bottom */}
      <footer className="game-footer">
        <LetterWheel
          letters={state.puzzle.letters}
          selectedIndices={state.selectedIndices}
          onLetterSelect={selectLetter}
          onClear={clearInput}
          onSubmit={handleSubmit}
          onShuffle={shuffleWheel}
          currentWord={state.currentInput.join('')}
          isShaking={isShaking}
        />
      </footer>

      {/* Puzzle complete overlay */}
      {isPuzzleComplete && feedback === 'complete' && (
        <div className="complete-overlay" data-testid="complete-overlay">
          <div className="complete-card">
            <div className="complete-confetti" aria-hidden="true">🎉✨🌟✨🎉</div>
            <h2>Puzzle Complete!</h2>
            <p className="complete-score">Score: {state.score} stars</p>
            <button className="next-btn" onClick={handleNextPuzzle}>
              Next Puzzle →
            </button>
          </div>
        </div>
      )}

      {/* Next puzzle button (after overlay dismiss) */}
      {isPuzzleComplete && feedback !== 'complete' && (
        <div className="next-puzzle-bar">
          <button className="next-btn" onClick={handleNextPuzzle}>
            Next Puzzle →
          </button>
        </div>
      )}
    </div>
  )
}
