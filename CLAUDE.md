# Word Game - Agent Instructions

## What is this?
A mobile-friendly word game PWA (Progressive Web App) built with React + TypeScript + Vite. Players find shorter words hidden within the letters of a longer word using a circular letter wheel.

## Quick Start
```bash
npm install
npm run dev          # Start dev server on localhost:5173
npm run build        # Type-check and build for production
npm test             # Run unit tests (Vitest)
npm run screenshot   # Capture game screenshot with Playwright
npm run generate-puzzles  # Regenerate puzzle data from word list
```

## Architecture
- **Framework:** React 18 + TypeScript (strict mode)
- **Build:** Vite
- **Testing:** Vitest (unit) + Playwright (E2E/screenshots)
- **State:** React hooks (useState/useReducer), no external state library
- **Persistence:** localStorage
- **PWA:** vite-plugin-pwa

## Key Files
- `src/components/Game.tsx` — Main game container
- `src/components/LetterWheel.tsx` — Circular letter input widget
- `src/components/WordGrid.tsx` — Grid of word slots
- `src/hooks/useGameState.ts` — Core game logic
- `src/data/puzzles.json` — Pre-generated puzzle data
- `scripts/generatePuzzles.ts` — Puzzle generation from word list
- `e2e/screenshot.spec.ts` — Playwright screenshot capture

## Coding Conventions
- TypeScript strict mode, no `any`
- Functional components only
- CSS Modules or plain CSS (no CSS-in-JS libraries)
- Mobile-first design (375px-430px width target)
- All interactive elements must have minimum 44px touch targets
- Use `data-testid` attributes on key elements for Playwright

## Taking Screenshots
After making UI changes, run `npm run screenshot` to capture what the game looks like. Screenshots are saved to `screenshots/game.png`. This lets you verify visual changes without a physical device.

## Puzzle Format
```typescript
interface Puzzle {
  id: number;
  letters: string[];      // Letters available on the wheel
  mainWord: string;       // The long word all sub-words come from
  words: string[];        // All valid sub-words to find
}
```

## Implementation Plan
See `PLAN.md` for the full implementation plan with phases and sprint breakdown.
