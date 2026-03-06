import { useState, useEffect, useRef } from 'react'
import { useGameState, HINT_COST, REVEAL_COST } from '../hooks/useGameState'
import { useStreak } from '../hooks/useStreak'
import LetterWheel from './LetterWheel'
import WordGrid from './WordGrid'
import puzzlesData from '../data/puzzles.json'
import type { Puzzle } from '../types'
import '../styles/game.css'

const puzzles = puzzlesData as Puzzle[]

const STORAGE_KEY = 'wordgame_state_v3'

interface PersistedState {
  puzzleIndex: number
  foundWords: string[]
  bonusWords: string[]
  score: number
  revealedHints: string[]
  revealedWords: string[]
}

function loadSaved(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : null
  } catch {
    return null
  }
}

type FeedbackKind =
  | 'found'
  | 'bonus_word'
  | 'already_found'
  | 'invalid'
  | 'complete'
  | 'hinted'
  | 'revealed'
  | 'no_stars'
  | 'no_words'
  | 'daily_bonus'
  | null

export default function Game() {
  const saved = loadSaved()
  const initialPuzzleIndex = saved?.puzzleIndex ?? 0
  const puzzle = puzzles[initialPuzzleIndex % puzzles.length]

  const {
    state,
    dispatch,
    selectLetter,
    unwindTo,
    clearInput,
    submitWord,
    shuffleWheel,
    useHint,
    useReveal,
    isPuzzleComplete,
    isFlawless,
  } = useGameState(puzzle)

  const streak = useStreak()

  const [feedback, setFeedback] = useState<FeedbackKind>(null)
  const [feedbackExtra, setFeedbackExtra] = useState<string>('')
  const [isShaking, setIsShaking] = useState(false)
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Shuffle letters on first render so the wheel doesn't reveal word order
  useEffect(() => {
    shuffleWheel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore persisted state and award daily streak bonus in one dispatch
  // (combining avoids the daily bonus using stale state.score = 0)
  useEffect(() => {
    let baseScore = saved?.score ?? 0
    let bonusMessage: string | null = null

    if (!dailyBonusClaimed && streak.dailyBonusAvailable) {
      const today = new Date().toISOString().slice(0, 10)
      streak.recordPlay(today)
      const newStreakDays = streak.streakDays + 1
      const bonusStars = newStreakDays * 5
      baseScore += bonusStars
      setDailyBonusClaimed(true)
      bonusMessage = `🔥 Day ${newStreakDays} streak! +${bonusStars}⭐`
    }

    if (saved) {
      dispatch({
        type: 'LOAD_STATE',
        state: {
          puzzleIndex: saved.puzzleIndex,
          foundWords: saved.foundWords,
          bonusWords: saved.bonusWords ?? [],
          score: baseScore,
          revealedHints: saved.revealedHints ?? [],
          revealedWords: saved.revealedWords ?? [],
        },
      })
    } else if (bonusMessage) {
      dispatch({ type: 'LOAD_STATE', state: { score: baseScore } })
    }

    if (bonusMessage) showFeedback('daily_bonus', 2500, bonusMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist state on change — use initialPuzzleIndex (read from localStorage at load time)
  // rather than state.puzzleIndex which starts at 0 until the restore effect runs.
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        puzzleIndex: initialPuzzleIndex,
        foundWords: state.foundWords,
        bonusWords: state.bonusWords,
        score: state.score,
        revealedHints: state.revealedHints,
        revealedWords: state.revealedWords,
      })
    )
  }, [
    initialPuzzleIndex,
    state.foundWords,
    state.bonusWords,
    state.score,
    state.revealedHints,
    state.revealedWords,
  ])

  function showFeedback(kind: FeedbackKind, duration = 1200, extra = '') {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    setFeedback(kind)
    setFeedbackExtra(extra)
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
    } else if (result === 'bonus_word') {
      showFeedback('bonus_word', 1500)
    } else if (result === 'invalid') {
      triggerShake()
      showFeedback('invalid')
    } else {
      showFeedback(result as FeedbackKind)
    }
  }

  function handleHint() {
    const result = useHint()
    if (result === 'hinted') showFeedback('hinted', 1200, `-${HINT_COST}⭐`)
    else if (result === 'no_stars') showFeedback('no_stars')
    else if (result === 'no_words') showFeedback('no_words')
  }

  function handleReveal() {
    const result = useReveal()
    if (result === 'revealed') showFeedback('revealed', 1200, `-${REVEAL_COST}⭐`)
    else if (result === 'no_stars') showFeedback('no_stars')
    else if (result === 'no_words') showFeedback('no_words')
  }

  function handleNextPuzzle() {
    const nextIndex = (initialPuzzleIndex + 1) % puzzles.length
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        puzzleIndex: nextIndex,
        foundWords: [],
        bonusWords: [],
        score: state.score,
        revealedHints: [],
        revealedWords: [],
      })
    )
    window.location.reload()
  }

  const feedbackMessages: Record<NonNullable<FeedbackKind>, string> = {
    found: '✓ Found!',
    bonus_word: '⭐ Bonus Word! +3',
    already_found: 'Already found',
    invalid: 'Not a word',
    complete: isFlawless ? '🌟 Flawless!' : '🎉 Puzzle complete!',
    hinted: `💡 Hint: -${HINT_COST}⭐`,
    revealed: `👁 Revealed: -${REVEAL_COST}⭐`,
    no_stars: 'Not enough stars!',
    no_words: 'No words left to reveal',
    daily_bonus: feedbackExtra || 'Daily bonus!',
  }

  const canAffordHint = state.score >= HINT_COST
  const canAffordReveal = state.score >= REVEAL_COST

  return (
    <div className="game" data-testid="game">
      {/* Header */}
      <header className="game-header">
        <div className="game-title-group">
          <h1 className="game-title">Word Game</h1>
          {streak.streakDays > 0 && (
            <div className="streak-badge" data-testid="streak-badge">
              🔥{streak.streakDays}
            </div>
          )}
        </div>
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
          {feedback === 'daily_bonus' && feedbackExtra
            ? feedbackExtra
            : feedbackMessages[feedback]}
        </div>
      )}

      {/* Word grid — scrollable */}
      <main className="game-main">
        <WordGrid
          words={state.puzzle.words}
          foundWords={state.foundWords}
          bonusWords={state.bonusWords}
          revealedHints={state.revealedHints}
          revealedWords={state.revealedWords}
        />
      </main>

      {/* Power-up bar */}
      <div className="powerup-bar">
        <button
          className={`powerup-btn hint-btn${canAffordHint ? '' : ' powerup-disabled'}`}
          onClick={handleHint}
          disabled={!canAffordHint || isPuzzleComplete}
          data-testid="hint-btn"
          aria-label={`Letter hint — costs ${HINT_COST} stars`}
        >
          💡 {HINT_COST}⭐
        </button>
        <button
          className={`powerup-btn reveal-btn${canAffordReveal ? '' : ' powerup-disabled'}`}
          onClick={handleReveal}
          disabled={!canAffordReveal || isPuzzleComplete}
          data-testid="reveal-btn"
          aria-label={`Reveal word — costs ${REVEAL_COST} stars`}
        >
          👁 {REVEAL_COST}⭐
        </button>
      </div>

      {/* Letter wheel — fixed to bottom */}
      <footer className="game-footer">
        <LetterWheel
          letters={state.puzzle.letters}
          selectedIndices={state.selectedIndices}
          onLetterSelect={selectLetter}
          onUnwindTo={unwindTo}
          onSubmit={handleSubmit}
          onClearInput={clearInput}
          onShuffle={shuffleWheel}
          currentWord={state.currentInput.join('')}
          isShaking={isShaking}
        />
      </footer>

      {/* Puzzle complete overlay */}
      {isPuzzleComplete && feedback === 'complete' && (
        <div className="complete-overlay" data-testid="complete-overlay">
          <div className="complete-card">
            <div className="complete-confetti" aria-hidden="true">
              {isFlawless ? '🌟✨💫✨🌟' : '🎉✨🌟✨🎉'}
            </div>
            <h2>{isFlawless ? '🌟 Flawless!' : 'Puzzle Complete!'}</h2>
            {isFlawless && (
              <p className="flawless-msg">No wrong guesses — perfect round!</p>
            )}
            <div className="bonus-breakdown">
              <div className="bonus-line">+{10} ⭐ Puzzle complete</div>
              {!state.revealUsed && <div className="bonus-line">+{15} ⭐ No reveals used</div>}
              {!state.hadInvalidAttempt && (
                <div className="bonus-line bonus-flawless">+{20} ⭐ Flawless round!</div>
              )}
            </div>
            <p className="complete-score">Total stars: {state.score} ⭐</p>
            <button className="next-btn" onClick={handleNextPuzzle}>
              Next Puzzle →
            </button>
          </div>
        </div>
      )}

      {/* Next puzzle button (after overlay dismissed) */}
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
