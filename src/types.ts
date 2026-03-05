export interface Puzzle {
  id: number
  letters: string[]     // Letters on the wheel, e.g. ["C","R","A","M","M","E","D"]
  mainWord: string      // The long word, e.g. "CRAMMED"
  words: string[]       // All valid sub-words sorted by length then alpha
}

export interface GameState {
  puzzle: Puzzle
  foundWords: string[]          // Words found so far (Set serialised as array)
  currentInput: string[]        // Letters currently selected (in order)
  selectedIndices: number[]     // Wheel positions selected
  score: number
  puzzleIndex: number
}

export type GameAction =
  | { type: 'SELECT_LETTER'; index: number }
  | { type: 'CLEAR_INPUT' }
  | { type: 'SUBMIT_WORD' }
  | { type: 'SHUFFLE_WHEEL' }
  | { type: 'NEXT_PUZZLE' }
  | { type: 'LOAD_STATE'; state: Partial<GameState> }
