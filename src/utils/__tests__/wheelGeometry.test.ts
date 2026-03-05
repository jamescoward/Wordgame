import { describe, it, expect } from 'vitest'
import { letterIndexAtPoint, getLetterPositions } from '../wheelGeometry'

// Wheel parameters matching LetterWheel component
const WHEEL_CONFIG = {
  cx: 150,
  cy: 150,
  radius: 110,
  containerSize: 300,
}

const LETTERS_7 = ['C', 'R', 'A', 'M', 'M', 'E', 'D']
const LETTERS_6 = ['A', 'B', 'C', 'D', 'E', 'F']

describe('wheelGeometry', () => {
  describe('getLetterPositions', () => {
    it('returns an array of the same length as letters', () => {
      const positions = getLetterPositions(LETTERS_7, WHEEL_CONFIG)
      expect(positions).toHaveLength(LETTERS_7.length)
    })

    it('positions first letter at top (angle -PI/2)', () => {
      const positions = getLetterPositions(LETTERS_7, WHEEL_CONFIG)
      const first = positions[0]
      // At -PI/2: x = cx, y = cy - radius
      expect(first.x).toBeCloseTo(WHEEL_CONFIG.cx, 1)
      expect(first.y).toBeCloseTo(WHEEL_CONFIG.cy - WHEEL_CONFIG.radius, 1)
    })

    it('distributes letters evenly around the circle', () => {
      const positions = getLetterPositions(LETTERS_6, WHEEL_CONFIG)
      // For 6 letters, each should be 60° apart
      const dx = positions[1].x - positions[0].x
      const dy = positions[1].y - positions[0].y
      const dist01 = Math.sqrt(dx * dx + dy * dy)

      const dx2 = positions[2].x - positions[1].x
      const dy2 = positions[2].y - positions[1].y
      const dist12 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

      expect(dist01).toBeCloseTo(dist12, 0)
    })

    it('all positions are on the circle (distance from centre = radius)', () => {
      const positions = getLetterPositions(LETTERS_7, WHEEL_CONFIG)
      for (const pos of positions) {
        const dx = pos.x - WHEEL_CONFIG.cx
        const dy = pos.y - WHEEL_CONFIG.cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        expect(dist).toBeCloseTo(WHEEL_CONFIG.radius, 1)
      }
    })
  })

  describe('letterIndexAtPoint', () => {
    it('returns null when point is far from all letters', () => {
      // Centre of wheel — far from all letters
      const result = letterIndexAtPoint(
        WHEEL_CONFIG.cx,
        WHEEL_CONFIG.cy,
        LETTERS_7,
        WHEEL_CONFIG,
        30 // hit radius px
      )
      expect(result).toBeNull()
    })

    it('returns the correct index when point is on the first letter', () => {
      // First letter is at top: x = cx, y = cy - radius
      const positions = getLetterPositions(LETTERS_7, WHEEL_CONFIG)
      const result = letterIndexAtPoint(
        positions[0].x,
        positions[0].y,
        LETTERS_7,
        WHEEL_CONFIG,
        30
      )
      expect(result).toBe(0)
    })

    it('returns the correct index when point is near the third letter', () => {
      const positions = getLetterPositions(LETTERS_7, WHEEL_CONFIG)
      // Slightly offset from exact position — within hit radius
      const result = letterIndexAtPoint(
        positions[2].x + 5,
        positions[2].y + 5,
        LETTERS_7,
        WHEEL_CONFIG,
        30
      )
      expect(result).toBe(2)
    })

    it('returns null when point is outside hit radius', () => {
      const positions = getLetterPositions(LETTERS_7, WHEEL_CONFIG)
      // 40px away from the first letter, with hit radius 30
      const result = letterIndexAtPoint(
        positions[0].x + 40,
        positions[0].y,
        LETTERS_7,
        WHEEL_CONFIG,
        30
      )
      expect(result).toBeNull()
    })

    it('returns the nearest letter when two are close', () => {
      const positions = getLetterPositions(LETTERS_7, WHEEL_CONFIG)
      // Point between index 0 and 1, slightly closer to index 1
      const midX = (positions[0].x + positions[1].x) / 2
      const midY = (positions[0].y + positions[1].y) / 2
      const biasToward1X = midX + (positions[1].x - positions[0].x) * 0.1
      const biasToward1Y = midY + (positions[1].y - positions[0].y) * 0.1
      const result = letterIndexAtPoint(
        biasToward1X,
        biasToward1Y,
        LETTERS_7,
        WHEEL_CONFIG,
        40
      )
      expect(result).toBe(1)
    })
  })
})
