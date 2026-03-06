/**
 * TDD tests for the streak tracking hook — written RED first.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStreak } from '../useStreak'

// We'll use localStorage in tests — Vitest provides a jsdom environment
beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useStreak', () => {
  describe('initial state', () => {
    it('starts with streakDays = 0 on a fresh install', () => {
      const { result } = renderHook(() => useStreak())
      expect(result.current.streakDays).toBe(0)
    })

    it('starts with dailyBonusAvailable = true on first play', () => {
      const { result } = renderHook(() => useStreak())
      expect(result.current.dailyBonusAvailable).toBe(true)
    })
  })

  describe('recordPlay', () => {
    it('increments streak to 1 on first play', () => {
      const { result } = renderHook(() => useStreak())
      act(() => result.current.recordPlay('2026-03-05'))
      expect(result.current.streakDays).toBe(1)
    })

    it('increments streak for consecutive days', () => {
      const { result } = renderHook(() => useStreak())
      act(() => result.current.recordPlay('2026-03-05'))
      act(() => result.current.recordPlay('2026-03-06'))
      expect(result.current.streakDays).toBe(2)
    })

    it('resets streak to 1 when a day is skipped', () => {
      const { result } = renderHook(() => useStreak())
      act(() => result.current.recordPlay('2026-03-05'))
      // Gap of 2 days
      act(() => result.current.recordPlay('2026-03-07'))
      expect(result.current.streakDays).toBe(1)
    })

    it('does not double-count the same day', () => {
      const { result } = renderHook(() => useStreak())
      act(() => result.current.recordPlay('2026-03-05'))
      act(() => result.current.recordPlay('2026-03-05')) // same day again
      expect(result.current.streakDays).toBe(1)
    })

    it('marks dailyBonusAvailable as false after claiming today', () => {
      const { result } = renderHook(() => useStreak())
      // Must use the actual current date for dailyBonusAvailable to flip
      const today = new Date().toISOString().slice(0, 10)
      act(() => result.current.recordPlay(today))
      expect(result.current.dailyBonusAvailable).toBe(false)
    })
  })

  describe('dailyBonusStars', () => {
    it('returns 5 * streakDays for the daily bonus', () => {
      const { result } = renderHook(() => useStreak())
      act(() => result.current.recordPlay('2026-03-05'))
      act(() => result.current.recordPlay('2026-03-06'))
      // streak = 2, bonus = 5 * 2 = 10
      expect(result.current.dailyBonusStars).toBe(10)
    })

    it('returns 5 on day 1', () => {
      const { result } = renderHook(() => useStreak())
      act(() => result.current.recordPlay('2026-03-05'))
      expect(result.current.dailyBonusStars).toBe(5)
    })
  })

  describe('persistence', () => {
    it('persists streak across hook remounts', () => {
      const { result: r1 } = renderHook(() => useStreak())
      act(() => r1.current.recordPlay('2026-03-05'))

      // Remount the hook (simulates page reload)
      const { result: r2 } = renderHook(() => useStreak())
      expect(r2.current.streakDays).toBe(1)
    })
  })
})
