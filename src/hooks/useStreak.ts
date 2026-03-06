import { useState, useCallback } from 'react'

const STORAGE_KEY = 'wordgame_streak_v1'

interface StreakData {
  streakDays: number
  lastPlayedDate: string // ISO date string "YYYY-MM-DD"
}

function loadStreakData(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StreakData
  } catch {
    // ignore
  }
  return { streakDays: 0, lastPlayedDate: '' }
}

function saveStreakData(data: StreakData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/** Returns the previous day's date string relative to `dateStr` */
function prevDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export interface UseStreakReturn {
  streakDays: number
  dailyBonusAvailable: boolean
  dailyBonusStars: number
  recordPlay: (today: string) => void
}

export function useStreak(): UseStreakReturn {
  const [data, setData] = useState<StreakData>(loadStreakData)

  const today = new Date().toISOString().slice(0, 10)
  const dailyBonusAvailable = data.lastPlayedDate !== today

  const recordPlay = useCallback((playDate: string) => {
    setData(prev => {
      // Same day — no change
      if (prev.lastPlayedDate === playDate) return prev

      // Consecutive day — increment streak
      const newStreak =
        prev.lastPlayedDate === prevDay(playDate)
          ? prev.streakDays + 1
          : 1 // Gap or first play — reset to 1

      const updated: StreakData = {
        streakDays: newStreak,
        lastPlayedDate: playDate,
      }
      saveStreakData(updated)
      return updated
    })
  }, [])

  return {
    streakDays: data.streakDays,
    dailyBonusAvailable,
    dailyBonusStars: data.streakDays * 5,
    recordPlay,
  }
}
