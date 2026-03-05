export interface WheelConfig {
  cx: number        // SVG/container center x
  cy: number        // SVG/container center y
  radius: number    // Distance from center to letter center (px)
  containerSize: number  // Width/height of the square container (px)
}

export interface LetterPosition {
  x: number
  y: number
  index: number
}

const TWO_PI = Math.PI * 2

/**
 * Compute the (x, y) position of each letter on the wheel circle.
 * Letter 0 starts at the top (angle = -PI/2) and goes clockwise.
 */
export function getLetterPositions(
  letters: string[],
  config: WheelConfig
): LetterPosition[] {
  return letters.map((_, i) => {
    const angle = (TWO_PI * i) / letters.length - Math.PI / 2
    return {
      x: config.cx + config.radius * Math.cos(angle),
      y: config.cy + config.radius * Math.sin(angle),
      index: i,
    }
  })
}

/**
 * Given a point (px, py) in SVG/container coordinates, return the index of
 * the nearest letter within `hitRadius` pixels, or null if none is close enough.
 */
export function letterIndexAtPoint(
  px: number,
  py: number,
  letters: string[],
  config: WheelConfig,
  hitRadius: number
): number | null {
  const positions = getLetterPositions(letters, config)

  let closest: number | null = null
  let closestDist = hitRadius // must be within hitRadius to count

  for (const pos of positions) {
    const dx = px - pos.x
    const dy = py - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < closestDist) {
      closestDist = dist
      closest = pos.index
    }
  }

  return closest
}
