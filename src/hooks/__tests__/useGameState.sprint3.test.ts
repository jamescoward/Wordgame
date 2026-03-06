/**
 * Sprint 3 TDD tests — written RED first, then implemented to go GREEN.
 *
 * Covers:
 *  - Star-based hint system (hints cost stars)
 *  - Bonus word detection (valid English word not in puzzle list → +1 star)
 *  - Flawless round bonus (no invalid attempts → +10 stars at completion)
 *  - Puzzle completion bonuses (+5 always, +5 if no reveals used)
 *  - hadInvalidAttempt tracking
 */
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameState, BONUS_COMPLETE, BONUS_NO_REVEAL, BONUS_FLAWLESS } from '../useGameState'
import type { Puzzle } from '../../types'

// CRAMMED puzzle — letters C(0) R(1) A(2) M(3) M(4) E(5) D(6)
const TEST_PUZZLE: Puzzle = {
  id: 1,
  letters: ['C', 'R', 'A', 'M', 'M', 'E', 'D'],
  mainWord: 'CRAMMED',
  words: ['CAR', 'RAM', 'MAD', 'MARE', 'CAME', 'CARE'],
}

// Minimal 2-word puzzle for completion tests
const MINI_PUZZLE: Puzzle = {
  id: 99,
  letters: ['C', 'A', 'T'],
  mainWord: 'CAT',
  words: ['ACT', 'CAT'],
}

// Helper: spell out a word using letter positions
function spellWord(
  result: ReturnType<typeof renderHook<ReturnType<typeof useGameState>, Puzzle>>['result'],
  word: string,
  puzzle: Puzzle
) {
  const letters = puzzle.letters
  const pool = letters.map((l, i) => ({ l: l.toUpperCase(), i }))
  const used: number[] = []
  for (const ch of word.toUpperCase()) {
    const found = pool.find(({ l, i }) => l === ch && !used.includes(i))
    if (!found) throw new Error(`Cannot spell ${word}: missing ${ch}`)
    used.push(found.i)
    act(() => result.current.selectLetter(found.i))
  }
}

// ─── Bonus word detection ────────────────────────────────────────────────────

describe('bonus word detection', () => {
  it('returns "bonus_word" when submitting a valid English word not in puzzle list', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    // "ARM" is a valid English word but NOT in TEST_PUZZLE.words (which has CAR,RAM,MAD,MARE,CAME,CARE)
    spellWord(result, 'ARM', TEST_PUZZLE)
    let submitResult: string | undefined
    act(() => { submitResult = result.current.submitWord() })
    expect(submitResult).toBe('bonus_word')
  })

  it('awards 1 star for a bonus word', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    spellWord(result, 'ARM', TEST_PUZZLE)
    act(() => result.current.submitWord())
    expect(result.current.state.score).toBe(1)
  })

  it('tracks bonus words in bonusWords array', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    spellWord(result, 'ARM', TEST_PUZZLE)
    act(() => result.current.submitWord())
    expect(result.current.state.bonusWords).toContain('ARM')
  })

  it('does not award a bonus word twice for the same word', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    // First submission — bonus word
    spellWord(result, 'ARM', TEST_PUZZLE)
    act(() => result.current.submitWord())
    // Second submission of same word
    spellWord(result, 'ARM', TEST_PUZZLE)
    let secondResult: string | undefined
    act(() => { secondResult = result.current.submitWord() })
    expect(secondResult).toBe('already_found')
    // Score should still be 1, not 2
    expect(result.current.state.score).toBe(1)
  })

  it('still returns "invalid" for a nonsense word not in dictionary', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    // "CRMD" is not a valid word
    act(() => result.current.selectLetter(0)) // C
    act(() => result.current.selectLetter(1)) // R
    act(() => result.current.selectLetter(3)) // M
    act(() => result.current.selectLetter(6)) // D
    let submitResult: string | undefined
    act(() => { submitResult = result.current.submitWord() })
    expect(submitResult).toBe('invalid')
  })
})

// ─── hadInvalidAttempt tracking ─────────────────────────────────────────────

describe('hadInvalidAttempt tracking', () => {
  it('starts false', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    expect(result.current.state.hadInvalidAttempt).toBe(false)
  })

  it('becomes true after an invalid submission', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    act(() => result.current.selectLetter(0)) // C
    act(() => result.current.selectLetter(1)) // R
    act(() => result.current.submitWord())    // "CR" — invalid
    expect(result.current.state.hadInvalidAttempt).toBe(true)
  })

  it('stays false when only valid words (puzzle or bonus) are submitted', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    // Submit CAR (puzzle word)
    spellWord(result, 'CAR', TEST_PUZZLE)
    act(() => result.current.submitWord())
    // Submit ARM (bonus word)
    spellWord(result, 'ARM', TEST_PUZZLE)
    act(() => result.current.submitWord())
    expect(result.current.state.hadInvalidAttempt).toBe(false)
  })
})

// ─── Puzzle completion bonuses ───────────────────────────────────────────────

describe('puzzle completion bonuses', () => {
  it('awards all bonuses when completing flawlessly with no reveals', () => {
    const { result } = renderHook(() => useGameState(MINI_PUZZLE))
    spellWord(result, 'ACT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    spellWord(result, 'CAT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    // ACT(1) + CAT(1) + complete(BONUS_COMPLETE) + no-reveal(BONUS_NO_REVEAL) + flawless(BONUS_FLAWLESS)
    expect(result.current.state.score).toBe(2 + BONUS_COMPLETE + BONUS_NO_REVEAL + BONUS_FLAWLESS)
  })

  it('awards +complete bonus but NOT flawless when there was an invalid attempt', () => {
    const { result } = renderHook(() => useGameState(MINI_PUZZLE))
    // Make one invalid attempt first
    act(() => result.current.selectLetter(0)) // 'C' alone — not a word
    act(() => result.current.submitWord())
    // Then complete the puzzle cleanly
    spellWord(result, 'ACT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    spellWord(result, 'CAT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    // ACT(1) + CAT(1) + complete(BONUS_COMPLETE) + no-reveal(BONUS_NO_REVEAL) — NO flawless
    expect(result.current.state.score).toBe(2 + BONUS_COMPLETE + BONUS_NO_REVEAL)
  })

  it('awards no-reveal bonus when completed without any reveals', () => {
    const { result } = renderHook(() => useGameState(MINI_PUZZLE))
    // Make an invalid attempt to block flawless bonus, so we can isolate no-reveal
    act(() => result.current.selectLetter(0))
    act(() => result.current.submitWord())
    spellWord(result, 'ACT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    spellWord(result, 'CAT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    // ACT(1) + CAT(1) + complete(BONUS_COMPLETE) + no-reveal(BONUS_NO_REVEAL) (no flawless)
    expect(result.current.state.score).toBe(2 + BONUS_COMPLETE + BONUS_NO_REVEAL)
  })

  it('does NOT award no-hints bonus when reveals were used', () => {
    const { result } = renderHook(() => useGameState(MINI_PUZZLE))
    // Give player some stars to spend on hint
    act(() => {
      // Manually set score high enough to afford a hint
      result.current.dispatch({ type: 'LOAD_STATE', state: { score: 50 } })
    })
    // Use a reveal (costs stars)
    act(() => result.current.useReveal())
    // Find all words
    spellWord(result, 'ACT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    spellWord(result, 'CAT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    // Score: 50 - hint_cost + ACT(1) + CAT(1) + complete(10) = no +15 bonus
    expect(result.current.state.revealUsed).toBe(true)
  })

  it('does not award completion bonus twice', () => {
    const { result } = renderHook(() => useGameState(MINI_PUZZLE))
    spellWord(result, 'ACT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    spellWord(result, 'CAT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    const scoreAfterComplete = result.current.state.score
    // Try submitting a bonus word after completion — should not re-trigger bonus
    spellWord(result, 'ACT', MINI_PUZZLE)
    act(() => result.current.submitWord()) // already found
    expect(result.current.state.score).toBe(scoreAfterComplete)
  })
})

// ─── Flawless round bonus ────────────────────────────────────────────────────

describe('flawless round bonus (no invalid attempts)', () => {
  it('awards flawless bonus stars when puzzle completed with no invalid attempts', () => {
    const { result } = renderHook(() => useGameState(MINI_PUZZLE))
    // Complete without any invalid submissions
    spellWord(result, 'ACT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    spellWord(result, 'CAT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    // ACT(1) + CAT(1) + complete(BONUS_COMPLETE) + no-reveals(BONUS_NO_REVEAL) + flawless(BONUS_FLAWLESS)
    expect(result.current.state.score).toBe(2 + BONUS_COMPLETE + BONUS_NO_REVEAL + BONUS_FLAWLESS)
  })

  it('does NOT award flawless bonus when there was an invalid attempt', () => {
    const { result } = renderHook(() => useGameState(MINI_PUZZLE))
    // Make one invalid attempt
    act(() => result.current.selectLetter(0)) // C
    act(() => result.current.submitWord())    // "C" — invalid (too short/not in dict)
    // Then complete the puzzle
    spellWord(result, 'ACT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    spellWord(result, 'CAT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    // ACT(1) + CAT(1) + complete(BONUS_COMPLETE) + no-reveals(BONUS_NO_REVEAL) = no flawless
    expect(result.current.state.score).toBe(2 + BONUS_COMPLETE + BONUS_NO_REVEAL)
  })

  it('exposes isFlawless on the hook when puzzle is complete with no invalid attempts', () => {
    const { result } = renderHook(() => useGameState(MINI_PUZZLE))
    spellWord(result, 'ACT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    spellWord(result, 'CAT', MINI_PUZZLE)
    act(() => result.current.submitWord())
    expect(result.current.isFlawless).toBe(true)
  })

  it('isFlawless is false when there was an invalid attempt', () => {
    const { result } = renderHook(() => useGameState(MINI_PUZZLE))
    act(() => result.current.selectLetter(0))
    act(() => result.current.submitWord())
    expect(result.current.isFlawless).toBe(false)
  })
})

// ─── Star-based hint costs ───────────────────────────────────────────────────

describe('star-based hint costs', () => {
  it('useHint costs 5 stars (letter reveal)', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    // Give the player stars first
    act(() => result.current.dispatch({ type: 'LOAD_STATE', state: { score: 20 } }))
    act(() => result.current.useHint())
    expect(result.current.state.score).toBe(15) // 20 - 5
  })

  it('useHint returns "no_stars" when player cannot afford it', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    // Score starts at 0
    let hintResult: string | undefined
    act(() => { hintResult = result.current.useHint() })
    expect(hintResult).toBe('no_stars')
  })

  it('useReveal costs 15 stars (full word reveal)', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    act(() => result.current.dispatch({ type: 'LOAD_STATE', state: { score: 20 } }))
    act(() => result.current.useReveal())
    expect(result.current.state.score).toBe(5) // 20 - 15
  })

  it('useReveal returns "no_stars" when player cannot afford it', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    let revealResult: string | undefined
    act(() => { revealResult = result.current.useReveal() })
    expect(revealResult).toBe('no_stars')
  })

  it('useReveal fully reveals a word in revealedHints', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    act(() => result.current.dispatch({ type: 'LOAD_STATE', state: { score: 20 } }))
    act(() => result.current.useReveal())
    expect(result.current.state.revealedHints.length).toBeGreaterThan(0)
  })

  it('useReveal sets revealUsed to true', () => {
    const { result } = renderHook(() => useGameState(TEST_PUZZLE))
    act(() => result.current.dispatch({ type: 'LOAD_STATE', state: { score: 20 } }))
    act(() => result.current.useReveal())
    expect(result.current.state.revealUsed).toBe(true)
  })
})
