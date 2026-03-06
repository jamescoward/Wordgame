import { useState, useEffect, useRef } from 'react'
import { useGameState, HINT_COST, REVEAL_COST, BONUS_COMPLETE, BONUS_NO_REVEAL, BONUS_FLAWLESS } from '../hooks/useGameState'
import { useStreak } from '../hooks/useStreak'
import { useCosmeticsState } from '../hooks/useCosmeticsState'
import LetterWheel from './LetterWheel'
import WordGrid from './WordGrid'
import Shop from './Shop'
import puzzlesData from '../data/puzzles.json'
import { BACKGROUNDS, BLOCK_THEMES } from '../data/cosmetics'
import type { Puzzle } from '../types'
import '../styles/game.css'
import '../styles/themes.css'

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
  | 'gem_award'
  | 'shop_purchase'
  | 'cheat_gems'
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
  const cosmetics = useCosmeticsState()

  const [feedback, setFeedback] = useState<FeedbackKind>(null)
  const [feedbackExtra, setFeedbackExtra] = useState<string>('')
  const [isShaking, setIsShaking] = useState(false)
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false)
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Shuffle letters on first render so the wheel doesn't reveal word order
  useEffect(() => {
    shuffleWheel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore persisted state and award daily streak bonus in one dispatch
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

      // Award streak milestone gems
      if (newStreakDays === 3 || newStreakDays === 7 || newStreakDays === 14) {
        cosmetics.awardGems({ type: 'STREAK_MILESTONE', days: newStreakDays as 3 | 7 | 14 })
      }
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

  // Persist state on change
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
    const wasFlawless = !state.hadInvalidAttempt
    const result = submitWord()

    if (result === 'found') {
      const allFound = state.puzzle.words.every(
        w => [...state.foundWords, state.currentInput.join('')].includes(w)
      )
      if (isPuzzleComplete || allFound) {
        // Puzzle complete — award gems
        cosmetics.awardGems({ type: 'PUZZLE_COMPLETE' })
        if (wasFlawless) {
          cosmetics.awardGems({ type: 'FLAWLESS_PUZZLE' })
        }
        showFeedback('complete', 2500)
      } else {
        showFeedback('found')
      }
    } else if (result === 'bonus_word') {
      cosmetics.awardGems({ type: 'BONUS_WORD_FOUND' })
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
        bonusWords: state.bonusWords,
        score: state.score,
        revealedHints: [],
        revealedWords: [],
      })
    )
    window.location.reload()
  }

  function handleGemTap() {
    const prevGems = cosmetics.state.gems
    cosmetics.handleGemTap()
    // Check if cheat was triggered (gems jumped by 500)
    // We do this via a small delay to let state update
    setTimeout(() => {
      if (cosmetics.state.gems - prevGems >= 500) {
        showFeedback('cheat_gems', 2000, '🔑 +500💎 cheat activated')
      }
    }, 50)
  }

  function handlePurchaseSuccess(name: string) {
    showFeedback('shop_purchase', 2000, `✨ ${name} unlocked!`)
  }

  // Resolve active background image style
  const activeBg = BACKGROUNDS.find(b => b.id === cosmetics.state.activeBackground)
  const activeTheme = BLOCK_THEMES.find(t => t.id === cosmetics.state.activeTheme)

  const backgroundStyle: React.CSSProperties =
    activeBg && activeBg.id !== 'default' && activeBg.filename
      ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(/backgrounds/${activeBg.filename})` }
      : {}

  const feedbackMessages: Record<NonNullable<FeedbackKind>, string> = {
    found: '✓ Found!',
    bonus_word: '⭐ Bonus Word! +1',
    already_found: 'Already found',
    invalid: 'Not a word',
    complete: isFlawless ? '🌟 Flawless!' : '🎉 Puzzle complete!',
    hinted: `💡 Hint: -${HINT_COST}⭐`,
    revealed: `👁 Revealed: -${REVEAL_COST}⭐`,
    no_stars: 'Not enough stars!',
    no_words: 'No words left to reveal',
    daily_bonus: feedbackExtra || 'Daily bonus!',
    gem_award: feedbackExtra || '+💎',
    shop_purchase: feedbackExtra || 'Unlocked!',
    cheat_gems: feedbackExtra || '🔑 Cheat activated',
  }

  const canAffordHint = state.score >= HINT_COST
  const canAffordReveal = state.score >= REVEAL_COST

  return (
    <div
      className="game"
      data-testid="game"
      data-theme={activeTheme?.id ?? 'default'}
      style={{
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        ...backgroundStyle,
      }}
    >
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
        <div className="header-right">
          <div className="game-score" data-testid="score">
            ⭐ {state.score}
          </div>
          {/* Gem counter — tap 7 times for cheat */}
          <button
            className="gem-counter-btn"
            onClick={handleGemTap}
            aria-label={`Gems: ${cosmetics.state.gems}`}
            data-testid="gem-counter"
          >
            💎 {cosmetics.state.gems}
          </button>
          {/* Shop button */}
          <button
            className="shop-btn"
            onClick={() => setShowShop(true)}
            aria-label="Open cosmetics shop"
            data-testid="shop-btn"
          >
            🎨
          </button>
          <button
            className="bonus-words-btn"
            onClick={() => setShowBonusModal(true)}
            aria-label="View bonus words"
            data-testid="bonus-words-btn"
          >
            🎁
            {state.bonusWords.length > 0 && (
              <span className="bonus-words-count">{state.bonusWords.length}</span>
            )}
          </button>
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
            : feedback === 'shop_purchase' || feedback === 'cheat_gems'
              ? feedbackExtra
              : feedbackMessages[feedback]}
        </div>
      )}

      {/* Background attribution badge */}
      {activeBg && activeBg.id !== 'default' && activeBg.photographer && (
        <div className="bg-attribution" data-testid="bg-attribution">
          Photo: {activeBg.photographer} / Unsplash
        </div>
      )}

      {/* Word grid — scrollable */}
      <main className="game-main">
        <WordGrid
          words={state.puzzle.words}
          foundWords={state.foundWords}
          revealedHints={state.revealedHints}
          revealedWords={state.revealedWords}
        />
      </main>

      {/* Letter wheel flanked by power-up buttons */}
      <footer className="game-footer">
        <div className="powerup-left">
          <button
            className="powerup-btn shuffle-btn"
            onClick={shuffleWheel}
            aria-label="Shuffle letters"
            data-testid="shuffle-btn"
          >
            ↺
          </button>
          <button
            className={`powerup-btn hint-btn${canAffordHint ? '' : ' powerup-disabled'}`}
            onClick={handleHint}
            disabled={!canAffordHint || isPuzzleComplete}
            data-testid="hint-btn"
            aria-label={`Letter hint — costs ${HINT_COST} stars`}
          >
            💡<span className="powerup-cost">{HINT_COST}⭐</span>
          </button>
        </div>
        <LetterWheel
          letters={state.puzzle.letters}
          selectedIndices={state.selectedIndices}
          onLetterSelect={selectLetter}
          onUnwindTo={unwindTo}
          onSubmit={handleSubmit}
          onClearInput={clearInput}
          currentWord={state.currentInput.join('')}
          isShaking={isShaking}
        />
        <button
          className={`powerup-btn reveal-btn${canAffordReveal ? '' : ' powerup-disabled'}`}
          onClick={handleReveal}
          disabled={!canAffordReveal || isPuzzleComplete}
          data-testid="reveal-btn"
          aria-label={`Reveal word — costs ${REVEAL_COST} stars`}
        >
          👁<span className="powerup-cost">{REVEAL_COST}⭐</span>
        </button>
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
              <div className="bonus-line">+{BONUS_COMPLETE} ⭐ Puzzle complete</div>
              {!state.revealUsed && <div className="bonus-line">+{BONUS_NO_REVEAL} ⭐ No reveals used</div>}
              {!state.hadInvalidAttempt && (
                <div className="bonus-line bonus-flawless">+{BONUS_FLAWLESS} ⭐ Flawless round!</div>
              )}
              <div className="bonus-line bonus-gems">+1 💎 Puzzle complete</div>
              {isFlawless && <div className="bonus-line bonus-gems">+2 💎 Flawless!</div>}
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

      {/* Bonus words modal */}
      {showBonusModal && (
        <div
          className="bonus-modal-overlay"
          onClick={() => setShowBonusModal(false)}
          data-testid="bonus-modal"
        >
          <div className="bonus-modal" onClick={e => e.stopPropagation()}>
            <div className="bonus-modal-header">
              <h3>🎁 Bonus Words</h3>
              <button
                className="bonus-modal-close"
                onClick={() => setShowBonusModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {state.bonusWords.length === 0 ? (
              <p className="bonus-modal-empty">No bonus words found yet.<br />Keep playing!</p>
            ) : (
              <div className="bonus-modal-words">
                {state.bonusWords.map(word => (
                  <span key={word} className="bonus-modal-word">{word}</span>
                ))}
              </div>
            )}
            <p className="bonus-modal-tip">Bonus words are valid words not in the puzzle list. Each earns +1⭐</p>
          </div>
        </div>
      )}

      {/* Shop modal */}
      {showShop && (
        <Shop
          cosmetics={cosmetics}
          onClose={() => setShowShop(false)}
          onPurchaseSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  )
}
