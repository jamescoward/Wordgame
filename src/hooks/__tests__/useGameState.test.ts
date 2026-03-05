import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameState } from '../useGameState'
import type { Puzzle } from '../../types'

const TEST_PUZZLE: Puzzle = {
  id: 1,
  letters: ['C', 'R', 'A', 'M', 'M', 'E', 'D'],
  mainWord: 'CRAMMED',
  words: ['CAR', 'RAM', 'MAD', 'MARE', 'CAME', 'CARE', 'CRAM', 'DAME', 'DEAR', 'MADE', 'CREAM', 'CRAMMED'],
}

describe('useGameState', () => {
  describe('initial state', () => {
    it('starts with the provided puzzle', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      expect(result.current.state.puzzle).toBe(TEST_PUZZLE)
    })

    it('starts with empty found words', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      expect(result.current.state.foundWords).toEqual([])
    })

    it('starts with empty current input', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      expect(result.current.state.currentInput).toEqual([])
    })

    it('starts with zero score', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      expect(result.current.state.score).toBe(0)
    })
  })

  describe('selectLetter', () => {
    it('adds a letter to currentInput by wheel index', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.selectLetter(0)) // 'C'
      expect(result.current.state.currentInput).toEqual(['C'])
      expect(result.current.state.selectedIndices).toEqual([0])
    })

    it('appends multiple letters in order', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.selectLetter(2)) // 'A'
      act(() => result.current.selectLetter(3)) // 'M'
      expect(result.current.state.currentInput).toEqual(['A', 'M'])
    })

    it('does not allow selecting the same index twice', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.selectLetter(0))
      act(() => result.current.selectLetter(0))
      expect(result.current.state.currentInput).toEqual(['C'])
    })

    it('allows selecting the same letter from a different index (duplicate letters)', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      // Letters: C(0) R(1) A(2) M(3) M(4) E(5) D(6) — M appears at idx 3 and 4
      act(() => result.current.selectLetter(3)) // 'M'
      act(() => result.current.selectLetter(4)) // 'M' (different index)
      expect(result.current.state.currentInput).toEqual(['M', 'M'])
    })
  })

  describe('clearInput', () => {
    it('clears current input and selected indices', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.selectLetter(0))
      act(() => result.current.selectLetter(1))
      act(() => result.current.clearInput())
      expect(result.current.state.currentInput).toEqual([])
      expect(result.current.state.selectedIndices).toEqual([])
    })
  })

  describe('submitWord', () => {
    it('adds a valid word to foundWords', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      // spell C-A-R
      act(() => result.current.selectLetter(0)) // C
      act(() => result.current.selectLetter(2)) // A
      act(() => result.current.selectLetter(1)) // R
      act(() => result.current.submitWord())
      expect(result.current.state.foundWords).toContain('CAR')
    })

    it('clears input after submitting', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.selectLetter(0))
      act(() => result.current.selectLetter(2))
      act(() => result.current.selectLetter(1))
      act(() => result.current.submitWord())
      expect(result.current.state.currentInput).toEqual([])
    })

    it('returns "found" for a valid new word', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.selectLetter(0)) // C
      act(() => result.current.selectLetter(2)) // A
      act(() => result.current.selectLetter(1)) // R
      let submitResult: string | undefined
      act(() => { submitResult = result.current.submitWord() })
      expect(submitResult).toBe('found')
    })

    it('returns "already_found" for a duplicate word', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      // Submit CAR twice
      const selectAndSubmitCAR = () => {
        act(() => result.current.selectLetter(0))
        act(() => result.current.selectLetter(2))
        act(() => result.current.selectLetter(1))
        act(() => result.current.submitWord())
      }
      selectAndSubmitCAR()
      let secondResult: string | undefined
      act(() => result.current.selectLetter(0))
      act(() => result.current.selectLetter(2))
      act(() => result.current.selectLetter(1))
      act(() => { secondResult = result.current.submitWord() })
      expect(secondResult).toBe('already_found')
    })

    it('returns "invalid" for a word not in puzzle list', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.selectLetter(0)) // C
      act(() => result.current.selectLetter(1)) // R
      let submitResult: string | undefined
      act(() => { submitResult = result.current.submitWord() })
      expect(submitResult).toBe('invalid')
    })

    it('increments score when valid word found (3-letter = 1 point)', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.selectLetter(0)) // C
      act(() => result.current.selectLetter(2)) // A
      act(() => result.current.selectLetter(1)) // R
      act(() => result.current.submitWord())
      expect(result.current.state.score).toBe(1)
    })

    it('awards more points for longer words (5-letter = 3 pts)', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      // CREAM: C(0) R(1) E(5) A(2) M(3)
      act(() => result.current.selectLetter(0)) // C
      act(() => result.current.selectLetter(1)) // R
      act(() => result.current.selectLetter(5)) // E
      act(() => result.current.selectLetter(2)) // A
      act(() => result.current.selectLetter(3)) // M
      act(() => result.current.submitWord())
      expect(result.current.state.score).toBe(3)
    })
  })

  describe('shuffleWheel', () => {
    it('returns letters in a different order (shuffled)', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      // Run shuffle many times; at least one should differ
      const original = [...result.current.state.puzzle.letters]
      let diffFound = false
      for (let i = 0; i < 20; i++) {
        act(() => result.current.shuffleWheel())
        const shuffled = result.current.state.puzzle.letters
        if (JSON.stringify(shuffled) !== JSON.stringify(original)) {
          diffFound = true
          break
        }
      }
      expect(diffFound).toBe(true)
    })

    it('keeps the same set of letters after shuffle', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      const original = [...result.current.state.puzzle.letters].sort()
      act(() => result.current.shuffleWheel())
      const shuffled = [...result.current.state.puzzle.letters].sort()
      expect(shuffled).toEqual(original)
    })

    it('clears current input when shuffling', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      act(() => result.current.selectLetter(0))
      act(() => result.current.shuffleWheel())
      expect(result.current.state.currentInput).toEqual([])
    })
  })

  describe('isPuzzleComplete', () => {
    it('returns false when not all words are found', () => {
      const { result } = renderHook(() => useGameState(TEST_PUZZLE))
      expect(result.current.isPuzzleComplete).toBe(false)
    })

    it('returns true when all words are found', () => {
      const minPuzzle: Puzzle = {
        id: 99,
        letters: ['C', 'A', 'T'],
        mainWord: 'CAT',
        words: ['ACT', 'CAT'],
      }
      const { result } = renderHook(() => useGameState(minPuzzle))
      // Find ACT: A(1) C(0) T(2)
      act(() => result.current.selectLetter(1))
      act(() => result.current.selectLetter(0))
      act(() => result.current.selectLetter(2))
      act(() => result.current.submitWord())
      // Find CAT: C(0) A(1) T(2)
      act(() => result.current.selectLetter(0))
      act(() => result.current.selectLetter(1))
      act(() => result.current.selectLetter(2))
      act(() => result.current.submitWord())
      expect(result.current.isPuzzleComplete).toBe(true)
    })
  })
})
