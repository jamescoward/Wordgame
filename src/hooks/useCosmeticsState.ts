import { useReducer, useEffect, useRef, useCallback } from 'react'
import type { CosmeticsState, GemEvent } from '../types'
import { BACKGROUNDS, BLOCK_THEMES } from '../data/cosmetics'

const STORAGE_KEY = 'wordgame_cosmetics_v1'
const CHEAT_TAPS_REQUIRED = 7
const CHEAT_WINDOW_MS = 3000

// Gem awards by event type
function gemsForEvent(event: GemEvent): number {
  switch (event.type) {
    case 'PUZZLE_COMPLETE':   return 1
    case 'BONUS_WORD_FOUND':  return 1
    case 'FLAWLESS_PUZZLE':   return 2
    case 'STREAK_MILESTONE':
      if (event.days === 3)  return 5
      if (event.days === 7)  return 10
      if (event.days === 14) return 20
      return 0
    case 'CHEAT_GEMS':        return 500
    case 'PURCHASE':          return -event.cost
    default:                  return 0
  }
}

function priceFor(kind: 'background' | 'theme', id: string): number {
  if (kind === 'background') {
    return BACKGROUNDS.find(b => b.id === id)?.price ?? 0
  }
  return BLOCK_THEMES.find(t => t.id === id)?.price ?? 0
}

type CosmeticsAction =
  | { type: 'ADD_GEMS'; amount: number }
  | { type: 'PURCHASE_BG'; id: string; cost: number }
  | { type: 'PURCHASE_THEME'; id: string; cost: number }
  | { type: 'EQUIP_BG'; id: string }
  | { type: 'EQUIP_THEME'; id: string }
  | { type: 'LOAD'; state: Partial<CosmeticsState> }

const DEFAULT_STATE: CosmeticsState = {
  gems: 0,
  purchasedBackgrounds: ['default'],
  activeBackground: 'default',
  purchasedThemes: ['default'],
  activeTheme: 'default',
}

function cosmeticsReducer(state: CosmeticsState, action: CosmeticsAction): CosmeticsState {
  switch (action.type) {
    case 'ADD_GEMS':
      return { ...state, gems: Math.max(0, state.gems + action.amount) }

    case 'PURCHASE_BG':
      return {
        ...state,
        gems: state.gems - action.cost,
        purchasedBackgrounds: [...state.purchasedBackgrounds, action.id],
      }

    case 'PURCHASE_THEME':
      return {
        ...state,
        gems: state.gems - action.cost,
        purchasedThemes: [...state.purchasedThemes, action.id],
      }

    case 'EQUIP_BG':
      return { ...state, activeBackground: action.id }

    case 'EQUIP_THEME':
      return { ...state, activeTheme: action.id }

    case 'LOAD':
      return {
        ...state,
        ...action.state,
        // Always ensure defaults are in purchased lists
        purchasedBackgrounds: Array.from(new Set([
          'default',
          ...(action.state.purchasedBackgrounds ?? state.purchasedBackgrounds),
        ])),
        purchasedThemes: Array.from(new Set([
          'default',
          ...(action.state.purchasedThemes ?? state.purchasedThemes),
        ])),
      }

    default:
      return state
  }
}

function loadFromStorage(): Partial<CosmeticsState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<CosmeticsState>) : null
  } catch {
    return null
  }
}

export interface UseCosmeticsStateReturn {
  state: CosmeticsState
  /** Award gems from a game event */
  awardGems: (event: GemEvent) => void
  /**
   * Purchase an item. Returns true on success, false if insufficient gems or already owned.
   */
  purchase: (kind: 'background' | 'theme', id: string) => boolean
  /** Equip an already-purchased item */
  equip: (kind: 'background' | 'theme', id: string) => void
  /** Call on each tap of the gem counter (cheat code detection) */
  handleGemTap: () => void
}

export function useCosmeticsState(): UseCosmeticsStateReturn {
  const [state, dispatch] = useReducer(cosmeticsReducer, DEFAULT_STATE)

  // Load persisted state once on mount
  useEffect(() => {
    const saved = loadFromStorage()
    if (saved) {
      dispatch({ type: 'LOAD', state: saved })
    }
  }, [])

  // Persist on every state change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // Cheat code: track tap timestamps
  const tapTimestamps = useRef<number[]>([])

  const awardGems = useCallback((event: GemEvent) => {
    const amount = gemsForEvent(event)
    if (amount !== 0) {
      dispatch({ type: 'ADD_GEMS', amount })
    }
  }, [])

  const purchase = useCallback(
    (kind: 'background' | 'theme', id: string): boolean => {
      const alreadyOwned =
        kind === 'background'
          ? state.purchasedBackgrounds.includes(id)
          : state.purchasedThemes.includes(id)

      if (alreadyOwned) return false

      const cost = priceFor(kind, id)
      if (state.gems < cost) return false

      if (kind === 'background') {
        dispatch({ type: 'PURCHASE_BG', id, cost })
      } else {
        dispatch({ type: 'PURCHASE_THEME', id, cost })
      }
      return true
    },
    [state]
  )

  const equip = useCallback(
    (kind: 'background' | 'theme', id: string) => {
      const owned =
        kind === 'background'
          ? state.purchasedBackgrounds.includes(id)
          : state.purchasedThemes.includes(id)

      if (!owned) return

      if (kind === 'background') {
        dispatch({ type: 'EQUIP_BG', id })
      } else {
        dispatch({ type: 'EQUIP_THEME', id })
      }
    },
    [state]
  )

  const handleGemTap = useCallback(() => {
    const now = Date.now()
    // Filter out taps older than the cheat window
    const recent = tapTimestamps.current.filter(t => now - t < CHEAT_WINDOW_MS)
    recent.push(now)
    tapTimestamps.current = recent

    if (recent.length >= CHEAT_TAPS_REQUIRED) {
      tapTimestamps.current = []
      dispatch({ type: 'ADD_GEMS', amount: 500 })
    }
  }, [])

  return { state, awardGems, purchase, equip, handleGemTap }
}
