export interface Puzzle {
  id: number
  letters: string[]     // Letters on the wheel, e.g. ["C","R","A","M","M","E","D"]
  mainWord: string      // The long word, e.g. "CRAMMED"
  words: string[]       // All valid sub-words sorted by length then alpha
}

export interface GameState {
  puzzle: Puzzle
  foundWords: string[]          // Words found so far
  bonusWords: string[]          // Valid English words found that aren't in the puzzle list
  currentInput: string[]        // Letters currently selected (in order)
  selectedIndices: number[]     // Wheel positions selected
  score: number                 // Stars — earned and spendable currency
  puzzleIndex: number
  revealedHints: string[]       // Words with one letter revealed (letter hint)
  revealedWords: string[]       // Words fully revealed (word reveal power-up)
  hadInvalidAttempt: boolean    // True once any invalid word is submitted this puzzle
  revealUsed: boolean           // True if any star-spend reveal was used this puzzle
  bonusAwarded: boolean         // Completion bonus has already been awarded
}

export type GameAction =
  | { type: 'SELECT_LETTER'; index: number }
  | { type: 'UNWIND_TO'; index: number }
  | { type: 'CLEAR_INPUT' }
  | { type: 'SUBMIT_WORD' }
  | { type: 'SHUFFLE_WHEEL' }
  | { type: 'NEXT_PUZZLE' }
  | { type: 'LOAD_STATE'; state: Partial<GameState> }
  | { type: 'USE_HINT'; word: string }
  | { type: 'USE_REVEAL'; word: string }
