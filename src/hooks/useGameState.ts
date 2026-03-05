import { useReducer, useCallback } from 'react'
import type { Puzzle, GameState, GameAction } from '../types'

const INITIAL_HINTS = 3

// Point values by word length
function scoreForWord(word: string): number {
  const len = word.length
  if (len <= 3) return 1
  if (len === 4) return 2
  if (len === 5) return 3
  if (len === 6) return 5
  return 8 // 7+
}

// Fisher-Yates shuffle (returns new array)
function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function createInitialState(puzzle: Puzzle): GameState {
  return {
    puzzle,
    foundWords: [],
    currentInput: [],
    selectedIndices: [],
    score: 0,
    puzzleIndex: 0,
    hints: INITIAL_HINTS,
    revealedHints: [],
  }
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_LETTER': {
      // Prevent selecting the same wheel position twice
      if (state.selectedIndices.includes(action.index)) return state
      const letter = state.puzzle.letters[action.index]
      return {
        ...state,
        currentInput: [...state.currentInput, letter],
        selectedIndices: [...state.selectedIndices, action.index],
      }
    }

    case 'CLEAR_INPUT':
      return { ...state, currentInput: [], selectedIndices: [] }

    case 'SHUFFLE_WHEEL': {
      const shuffledLetters = shuffleArray(state.puzzle.letters)
      return {
        ...state,
        puzzle: { ...state.puzzle, letters: shuffledLetters },
        currentInput: [],
        selectedIndices: [],
      }
    }

    case 'NEXT_PUZZLE':
      return state // Handled in hook with new puzzle

    case 'USE_HINT': {
      if (state.hints <= 0) return state
      if (state.revealedHints.includes(action.word)) return state
      return {
        ...state,
        hints: state.hints - 1,
        revealedHints: [...state.revealedHints, action.word],
      }
    }

    case 'LOAD_STATE':
      return { ...state, ...action.state }

    default:
      return state
  }
}

export type SubmitResult = 'found' | 'already_found' | 'invalid'
export type HintResult = 'hinted' | 'no_hints' | 'no_words'

export interface UseGameStateReturn {
  state: GameState
  selectLetter: (index: number) => void
  clearInput: () => void
  submitWord: () => SubmitResult
  shuffleWheel: () => void
  useHint: () => HintResult
  isPuzzleComplete: boolean
}

export function useGameState(puzzle: Puzzle): UseGameStateReturn {
  const [state, dispatch] = useReducer(gameReducer, puzzle, createInitialState)

  const selectLetter = useCallback((index: number) => {
    dispatch({ type: 'SELECT_LETTER', index })
  }, [])

  const clearInput = useCallback(() => {
    dispatch({ type: 'CLEAR_INPUT' })
  }, [])

  const submitWord = useCallback((): SubmitResult => {
    const word = state.currentInput.join('')
    dispatch({ type: 'CLEAR_INPUT' })

    if (state.foundWords.includes(word)) return 'already_found'
    if (!state.puzzle.words.includes(word)) return 'invalid'

    // Valid new word — update state
    dispatch({
      type: 'LOAD_STATE',
      state: {
        foundWords: [...state.foundWords, word],
        score: state.score + scoreForWord(word),
      },
    })
    return 'found'
  }, [state])

  const shuffleWheel = useCallback(() => {
    dispatch({ type: 'SHUFFLE_WHEEL' })
  }, [])

  const useHint = useCallback((): HintResult => {
    if (state.hints <= 0) return 'no_hints'

    // Find an unfound, un-hinted word to reveal
    const candidates = state.puzzle.words.filter(
      w => !state.foundWords.includes(w) && !state.revealedHints.includes(w)
    )
    if (candidates.length === 0) return 'no_words'

    // Pick the shortest candidate to give the smallest hint
    const target = candidates.reduce((shortest, w) =>
      w.length < shortest.length ? w : shortest
    )
    dispatch({ type: 'USE_HINT', word: target })
    return 'hinted'
  }, [state])

  const isPuzzleComplete =
    state.puzzle.words.length > 0 &&
    state.puzzle.words.every(w => state.foundWords.includes(w))

  return { state, selectLetter, clearInput, submitWord, shuffleWheel, useHint, isPuzzleComplete }
}
