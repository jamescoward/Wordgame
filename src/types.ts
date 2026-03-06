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

// ─── Phase 7: Cosmetics System ────────────────────────────

export interface Background {
  id: string
  name: string
  price: number          // 0 = free
  filename: string       // e.g. "forest-canopy.jpg" in public/backgrounds/
  photographer: string   // Credit name
  photographerUrl: string
}

export interface BlockTheme {
  id: string
  name: string
  price: number          // 0 = free
  premium: boolean
  vars: {
    '--theme-slot-bg': string
    '--theme-slot-found-bg': string
    '--theme-slot-text': string
    '--theme-slot-border': string
    '--theme-slot-found-text': string
  }
  effect?: 'holographic' | 'shimmer' | 'none'
}

export interface CosmeticsState {
  gems: number
  purchasedBackgrounds: string[]   // background IDs
  activeBackground: string         // 'default' or background ID
  purchasedThemes: string[]        // theme IDs
  activeTheme: string              // 'default' or theme ID
}

export type GemEvent =
  | { type: 'PUZZLE_COMPLETE' }
  | { type: 'BONUS_WORD_FOUND' }
  | { type: 'FLAWLESS_PUZZLE' }
  | { type: 'STREAK_MILESTONE'; days: 3 | 7 | 14 }
  | { type: 'CHEAT_GEMS' }
  | { type: 'PURCHASE'; cost: number }
  | { type: 'SET_BACKGROUND'; id: string }
  | { type: 'SET_THEME'; id: string }
  | { type: 'LOAD_COSMETICS'; state: Partial<CosmeticsState> }
