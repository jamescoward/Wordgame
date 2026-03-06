import { useReducer, useCallback } from 'react'
import type { Puzzle, GameState, GameAction } from '../types'
import { isValidWord, canFormWord } from '../utils/dictionary'

// Star costs for power-ups
export const HINT_COST = 5       // Letter reveal: shows first hidden letter of a word
export const REVEAL_COST = 15    // Word reveal: fully reveals a word

// Completion bonuses
export const BONUS_COMPLETE = 5    // Awarded for finishing the puzzle
export const BONUS_NO_REVEAL = 5   // Awarded when no reveals were purchased
export const BONUS_FLAWLESS = 10   // Awarded when no invalid words were submitted

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
    puzzle,              // Letters start in original order; call shuffleWheel() to randomise
    foundWords: [],
    bonusWords: [],
    currentInput: [],
    selectedIndices: [],
    score: 0,
    puzzleIndex: 0,
    revealedHints: [],
    revealedWords: [],
    hadInvalidAttempt: false,
    revealUsed: false,
    bonusAwarded: false,
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

    case 'UNWIND_TO': {
      const pos = state.selectedIndices.indexOf(action.index)
      if (pos === -1) return state
      return {
        ...state,
        selectedIndices: state.selectedIndices.slice(0, pos + 1),
        currentInput: state.currentInput.slice(0, pos + 1),
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
      if (state.revealedHints.includes(action.word)) return state
      return {
        ...state,
        score: state.score - HINT_COST,
        revealedHints: [...state.revealedHints, action.word],
        revealUsed: true,
      }
    }

    case 'USE_REVEAL': {
      if (state.revealedWords.includes(action.word)) return state
      return {
        ...state,
        score: state.score - REVEAL_COST,
        revealedWords: [...state.revealedWords, action.word],
        // Also count as revealedHints so WordGrid can show the word
        revealedHints: state.revealedHints.includes(action.word)
          ? state.revealedHints
          : [...state.revealedHints, action.word],
        revealUsed: true,
      }
    }

    case 'LOAD_STATE':
      return { ...state, ...action.state }

    default:
      return state
  }
}

export type SubmitResult =
  | 'found'
  | 'bonus_word'
  | 'already_found'
  | 'invalid'

export type HintResult = 'hinted' | 'no_stars' | 'no_words'
export type RevealResult = 'revealed' | 'no_stars' | 'no_words'

export interface UseGameStateReturn {
  state: GameState
  dispatch: (action: GameAction) => void
  selectLetter: (index: number) => void
  unwindTo: (index: number) => void
  clearInput: () => void
  submitWord: () => SubmitResult
  shuffleWheel: () => void
  useHint: () => HintResult
  useReveal: () => RevealResult
  isPuzzleComplete: boolean
  isFlawless: boolean
}

export function useGameState(puzzle: Puzzle): UseGameStateReturn {
  const [state, dispatch] = useReducer(gameReducer, puzzle, createInitialState)

  const selectLetter = useCallback((index: number) => {
    dispatch({ type: 'SELECT_LETTER', index })
  }, [])

  const unwindTo = useCallback((index: number) => {
    dispatch({ type: 'UNWIND_TO', index })
  }, [])

  const clearInput = useCallback(() => {
    dispatch({ type: 'CLEAR_INPUT' })
  }, [])

  const submitWord = useCallback((): SubmitResult => {
    const word = state.currentInput.join('')
    dispatch({ type: 'CLEAR_INPUT' })

    // Already found (puzzle word or bonus word)
    if (state.foundWords.includes(word) || state.bonusWords.includes(word)) {
      return 'already_found'
    }

    // Valid puzzle word
    if (state.puzzle.words.includes(word)) {
      const newFoundWords = [...state.foundWords, word]
      const newScore = state.score + scoreForWord(word)
      const allFound =
        state.puzzle.words.length > 0 &&
        state.puzzle.words.every(w => newFoundWords.includes(w))

      let bonusScore = 0
      if (allFound && !state.bonusAwarded) {
        bonusScore += BONUS_COMPLETE
        if (!state.revealUsed) bonusScore += BONUS_NO_REVEAL
        if (!state.hadInvalidAttempt) bonusScore += BONUS_FLAWLESS
      }

      dispatch({
        type: 'LOAD_STATE',
        state: {
          foundWords: newFoundWords,
          score: newScore + bonusScore,
          bonusAwarded: allFound ? true : state.bonusAwarded,
        },
      })
      return 'found'
    }

    // Valid English word (bonus word) — must be formable from puzzle letters
    if (
      word.length >= 3 &&
      isValidWord(word) &&
      canFormWord(word, state.puzzle.letters)
    ) {
      dispatch({
        type: 'LOAD_STATE',
        state: {
          bonusWords: [...state.bonusWords, word],
          score: state.score + 1,
        },
      })
      return 'bonus_word'
    }

    // Invalid — track the attempt
    if (!state.hadInvalidAttempt) {
      dispatch({ type: 'LOAD_STATE', state: { hadInvalidAttempt: true } })
    }
    return 'invalid'
  }, [state])

  const shuffleWheel = useCallback(() => {
    dispatch({ type: 'SHUFFLE_WHEEL' })
  }, [])

  const useHint = useCallback((): HintResult => {
    if (state.score < HINT_COST) return 'no_stars'

    // Find an unfound, un-hinted word to reveal one letter of
    const candidates = state.puzzle.words.filter(
      w => !state.foundWords.includes(w) && !state.revealedHints.includes(w)
    )
    if (candidates.length === 0) return 'no_words'

    const target = candidates.reduce((shortest, w) =>
      w.length < shortest.length ? w : shortest
    )
    dispatch({ type: 'USE_HINT', word: target })
    return 'hinted'
  }, [state])

  const useReveal = useCallback((): RevealResult => {
    if (state.score < REVEAL_COST) return 'no_stars'

    const candidates = state.puzzle.words.filter(
      w => !state.foundWords.includes(w) && !state.revealedWords.includes(w)
    )
    if (candidates.length === 0) return 'no_words'

    const target = candidates.reduce((shortest, w) =>
      w.length < shortest.length ? w : shortest
    )
    dispatch({ type: 'USE_REVEAL', word: target })
    return 'revealed'
  }, [state])

  const isPuzzleComplete =
    state.puzzle.words.length > 0 &&
    state.puzzle.words.every(w => state.foundWords.includes(w))

  const isFlawless = !state.hadInvalidAttempt

  return {
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
  }
}
