import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameState } from '../useGameState'
import type { Puzzle } from '../../types'

const TEST_PUZZLE: Puzzle = {
  id: 1,
  letters: ['C', 'R', 'A', 'M', 'M', 'E', 'D'],
  mainWord: 'CRAMMED',
  words: ['CAR', 'RAM', 'MAD', 'MARE', 'CAME', 'CARE'],
}

describe('useGameState - hint system', () => {
  describe('initial hints', () => {
    it('starts with 3 hints', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      expect(result.current.state.hints).toBe(3)
    })
  })

  describe('useHint', () => {
    it('is exposed on the hook return value', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      expect(typeof result.current.useHint).toBe('function')
    })

    it('decrements the hint count by 1', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.useHint())
      expect(result.current.state.hints).toBe(2)
    })

    it('does nothing when hints are 0', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.useHint())
      act(() => result.current.useHint())
      act(() => result.current.useHint())
      // Now at 0
      act(() => result.current.useHint())
      expect(result.current.state.hints).toBe(0)
    })

    it('sets revealedHints to contain the hinted word', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.useHint())
      expect(result.current.state.revealedHints.length).toBeGreaterThan(0)
    })

    it('does not hint an already found word', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      // Find CAR: C(0) A(2) R(1)
      act(() => result.current.selectLetter(0))
      act(() => result.current.selectLetter(2))
      act(() => result.current.selectLetter(1))
      act(() => result.current.submitWord())
      // Now hint — should not pick CAR
      act(() => result.current.useHint())
      const hintedWords = result.current.state.revealedHints
      expect(hintedWords).not.toContain('CAR')
    })

    it('returns "no_hints" when hints exhausted', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.useHint())
      act(() => result.current.useHint())
      act(() => result.current.useHint())
      let hintResult: string | undefined
      act(() => { hintResult = result.current.useHint() })
      expect(hintResult).toBe('no_hints')
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
      let hintResult: string | undefined
      act(() => { hintResult = result.current.useHint() })
      expect(hintResult).toBe('no_words')
    })

    it('returns "hinted" on success', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      let hintResult: string | undefined
      act(() => { hintResult = result.current.useHint() })
      expect(hintResult).toBe('hinted')
    })
  })
})
