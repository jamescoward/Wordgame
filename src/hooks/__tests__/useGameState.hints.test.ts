/**
 * Hint system tests — updated for Sprint 3 star-based costs.
 * Hints now cost stars rather than consuming free "hint uses".
 */
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameState, HINT_COST } from '../useGameState'
import type { Puzzle } from '../../types'

const TEST_PUZZLE: Puzzle = {
  id: 1,
  letters: ['C', 'R', 'A', 'M', 'M', 'E', 'D'],
  mainWord: 'CRAMMED',
  words: ['CAR', 'RAM', 'MAD', 'MARE', 'CAME', 'CARE'],
}

describe('useGameState - hint system (star-based)', () => {
  describe('useHint', () => {
    it('is exposed on the hook return value', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      expect(typeof result.current.useHint).toBe('function')
    })

    it('returns "no_stars" when player has fewer than HINT_COST stars', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      // Starts with 0 stars
      let hintResult: string | undefined
      act(() => { hintResult = result.current.useHint() })
      expect(hintResult).toBe('no_stars')
    })

    it('deducts HINT_COST stars when successful', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.dispatch({ type: 'LOAD_STATE', state: { score: 20 } }))
      act(() => result.current.useHint())
      expect(result.current.state.score).toBe(20 - HINT_COST)
    })

    it('sets revealedHints to contain the hinted word', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.dispatch({ type: 'LOAD_STATE', state: { score: 20 } }))
      act(() => result.current.useHint())
      expect(result.current.state.revealedHints.length).toBeGreaterThan(0)
    })

    it('sets revealUsed to true after hint', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.dispatch({ type: 'LOAD_STATE', state: { score: 20 } }))
      act(() => result.current.useHint())
      expect(result.current.state.revealUsed).toBe(true)
    })

    it('does not hint an already found word', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      // Find CAR: C(0) A(2) R(1) — original order
      act(() => result.current.selectLetter(0)) // C
      act(() => result.current.selectLetter(2)) // A
      act(() => result.current.selectLetter(1)) // R
      act(() => result.current.submitWord())
      act(() => result.current.dispatch({ type: 'LOAD_STATE', state: { score: 20 } }))
      act(() => result.current.useHint())
      const hintedWords = result.current.state.revealedHints
      expect(hintedWords).not.toContain('CAR')
    })

    it('returns "no_words" when all words are already found', () => {
      const minPuzzle: Puzzle = {
        id: 99,
        letters: ['C', 'A', 'T'],
        mainWord: 'CAT',
        words: ['CAT'],
      }
      const { result } = renderHook(() => useGameState(minPuzzle))
      // Find CAT: C(0) A(1) T(2)
      act(() => result.current.selectLetter(0))
      act(() => result.current.selectLetter(1))
      act(() => result.current.selectLetter(2))
      act(() => result.current.submitWord())
      act(() => result.current.dispatch({ type: 'LOAD_STATE', state: { score: 50 } }))
      let hintResult: string | undefined
      act(() => { hintResult = result.current.useHint() })
      expect(hintResult).toBe('no_words')
    })

    it('returns "hinted" on success', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.dispatch({ type: 'LOAD_STATE', state: { score: 20 } }))
      let hintResult: string | undefined
      act(() => { hintResult = result.current.useHint() })
      expect(hintResult).toBe('hinted')
    })
  })
})
