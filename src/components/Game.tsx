import { useState, useEffect, useRef } from 'react'
import { useGameState } from '../hooks/useGameState'
import LetterWheel from './LetterWheel'
import WordGrid from './WordGrid'
import puzzlesData from '../data/puzzles.json'
import type { Puzzle } from '../types'
import '../styles/game.css'

const puzzles = puzzlesData as Puzzle[]

const STORAGE_KEY = 'wordgame_state'

interface PersistedState {
  puzzleIndex: number
  foundWords: string[]
  score: number
}

function loadSaved(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : null
  } catch {
    return null
  }
}

type FeedbackKind = 'found' | 'already_found' | 'invalid' | 'complete' | null

export default function Game() {
  const saved = loadSaved()
  const initialPuzzleIndex = saved?.puzzleIndex ?? 0
  const puzzle = puzzles[initialPuzzleIndex % puzzles.length]

  const { state, selectLetter, clearInput, submitWord, shuffleWheel, isPuzzleComplete } =
    useGameState(puzzle)

  const [feedback, setFeedback] = useState<FeedbackKind>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist state on change
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        puzzleIndex: state.puzzleIndex,
        foundWords: state.foundWords,
        score: state.score,
      })
    )
  }, [state.foundWords, state.puzzleIndex, state.score])

  function showFeedback(kind: FeedbackKind, duration = 1200) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    setFeedback(kind)
    feedbackTimer.current = setTimeout(() => setFeedback(null), duration)
  }

  function handleSubmit() {
    const result = submitWord()
    if (result === 'found' && isPuzzleComplete) {
      showFeedback('complete', 2500)
    } else {
      showFeedback(result)
    }
  }

  function handleNextPuzzle() {
    // Reload page with next puzzle index
    const nextIndex = (state.puzzleIndex + 1) % puzzles.length
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ puzzleIndex: nextIndex, foundWords: [], score: state.score })
    )
    window.location.reload()
  }

  const feedbackMessages: Record<NonNullable<FeedbackKind>, string> = {
    found: '✓ Found!',
    already_found: 'Already found',
    invalid: 'Not a word',
    complete: '🎉 Puzzle complete!',
  }

  return (
    <div className="game" data-testid="game">
      {/* Header */}
      <header className="game-header">
        <h1 className="game-title">Word Game</h1>
        <div className="game-score" data-testid="score">
          ⭐ {state.score}
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
        <WordGrid words={state.puzzle.words} foundWords={state.foundWords} />
      </main>

      {/* Letter wheel — fixed to bottom */}
      <footer className="game-footer">
        <LetterWheel
          letters={state.puzzle.letters}
          selectedIndices={state.selectedIndices}
          onLetterTap={selectLetter}
          onClear={clearInput}
          onSubmit={handleSubmit}
          onShuffle={shuffleWheel}
          currentWord={state.currentInput.join('')}
        />
      </footer>

      {/* Puzzle complete overlay */}
      {isPuzzleComplete && feedback === 'complete' && (
        <div className="complete-overlay" data-testid="complete-overlay">
          <div className="complete-card">
            <p className="complete-emoji">🎉</p>
            <h2>Puzzle Complete!</h2>
            <p className="complete-score">You earned {state.score} stars</p>
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
