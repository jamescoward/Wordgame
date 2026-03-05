# Word Game - Implementation Plan

## Overview

A mobile-friendly word game where players find shorter words hidden within the letters of a longer word. Inspired by games like "Wordscapes" / "Word Cookies" — but ad-free and microtransaction-free.

## Screenshot Reference

The game from the screenshot shows:
- A grid of word slots (short words on left, longer on right) grouped by length
- A circular "letter wheel" at the bottom with 7 letters (C, A, D, R, M, E, M)
- The long word is **CRAMMED** and valid sub-words include: CARE, MARE, CAME, ARMED, CRAM, DAME, CREAM, DEAR, DREAM, MADE, RAMMED, MEAD, CRAMMED

---

## Tech Stack Decision: React PWA (Progressive Web App)

**Why not React Native / Expo / Flutter?**
- A word game is purely UI + logic — no camera, GPS, push notifications needed
- A PWA works on **all** phones via the browser and can be "installed" to the home screen
- Zero Android SDK / Xcode / emulator setup — just `npm start`
- Playwright can screenshot the running app headlessly for agent-driven development
- Simplest possible stack for a software engineer new to mobile

**Stack:**
| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **React 18** + TypeScript | Widely known, huge ecosystem |
| Build tool | **Vite** | Fast, zero-config, great defaults |
| Styling | **CSS Modules** or plain CSS | No extra deps, simple |
| Game state | **React useState/useReducer** | No Redux needed for this scope |
| Word dictionary | **Static JSON bundled at build** | No server needed |
| Puzzle generation | **Build-time script** | Pre-generate puzzles from dictionary |
| Testing | **Vitest** + **Playwright** | Unit + visual/E2E |
| PWA | **vite-plugin-pwa** | Service worker, install prompt, offline |
| Screenshots | **Playwright** | Headless browser screenshots in CI |

---

## Phase 1: Project Scaffolding & Dev Environment

### 1.1 Initialize project
```bash
npm create vite@latest . -- --template react-ts
npm install
```

### 1.2 Claude Code hooks (`.claude/hooks.toml`)
Set up hooks so future agents auto-configure the environment:

```toml
# .claude/hooks.toml

[[hooks]]
event = "session_start"
description = "Install dependencies and verify dev environment"
command = "npm install && npx playwright install chromium --with-deps 2>/dev/null || true"
```

### 1.3 Project structure
```
Wordgame/
├── .claude/
│   └── hooks.toml              # Agent environment setup
├── CLAUDE.md                   # Agent instructions for the project
├── src/
│   ├── main.tsx                # Entry point
│   ├── App.tsx                 # Root component
│   ├── components/
│   │   ├── Game.tsx            # Main game container
│   │   ├── WordGrid.tsx        # Grid showing word slots
│   │   ├── LetterWheel.tsx     # Circular letter input
│   │   └── WordSlot.tsx        # Individual word slot (hidden/revealed)
│   ├── hooks/
│   │   └── useGameState.ts     # Core game logic hook
│   ├── utils/
│   │   ├── puzzleGenerator.ts  # Generate puzzles from dictionary
│   │   └── wordValidator.ts    # Check if a word is valid
│   ├── data/
│   │   └── puzzles.json        # Pre-generated puzzle data
│   └── styles/
│       ├── game.css
│       ├── wordGrid.css
│       └── letterWheel.css
├── scripts/
│   └── generatePuzzles.ts      # Build-time puzzle generation
├── e2e/
│   └── screenshot.spec.ts      # Playwright screenshot tests
├── public/
│   └── manifest.json           # PWA manifest
└── package.json
```

### 1.4 CLAUDE.md (agent instructions)
Create a `CLAUDE.md` with:
- How to run the dev server: `npm run dev`
- How to run tests: `npm test`
- How to take screenshots: `npm run screenshot`
- How to generate puzzles: `npm run generate-puzzles`
- Architecture overview and key files
- Coding conventions (TypeScript strict, no `any`, functional components)

---

## Phase 2: Core Game Logic

### 2.1 Puzzle data model
```typescript
interface Puzzle {
  id: number;
  letters: string[];          // e.g. ["C","R","A","M","M","E","D"]
  mainWord: string;           // "CRAMMED"
  words: string[];            // All valid sub-words sorted by length
}
```

### 2.2 Puzzle generation script (`scripts/generatePuzzles.ts`)
1. Source a word list (use a public domain English word list — e.g., a filtered subset of SOWPODS or TWL, or a curated common-words list)
2. For each word of 6-8 letters:
   - Find all valid sub-words (3+ letters) that can be formed from its letters
   - Only keep puzzles with 8-20 valid sub-words (good difficulty range)
3. Output as `src/data/puzzles.json`
4. Generate ~500 puzzles to start

**Word list source:** Use a bundled list of ~20,000 common English words (avoid obscure/offensive words). Can source from open datasets or curate from multiple sources.

### 2.3 Game state (`hooks/useGameState.ts`)
```typescript
interface GameState {
  puzzle: Puzzle;
  foundWords: Set<string>;     // Words the player has found
  currentInput: string[];      // Letters currently selected on wheel
  selectedIndices: number[];   // Which wheel positions are selected
  hints: number;               // Available hint currency
  score: number;               // Lifetime score
  puzzleIndex: number;         // Current puzzle number
}
```

Key actions:
- `selectLetter(index)` — add letter to current input (by wheel position)
- `deselectLetter()` — remove last letter
- `submitWord()` — check if current input forms a valid word
- `shuffleWheel()` — randomize letter positions on wheel
- `useHint()` — reveal one letter of an unfound word
- `nextPuzzle()` — advance to next puzzle

### 2.4 Word validation
- Check if the submitted word exists in the puzzle's word list
- Check it hasn't already been found
- Provide feedback (shake animation for invalid, reveal animation for valid)

---

## Phase 3: UI Components

### 3.1 LetterWheel component
- Circular arrangement of letters (use CSS `transform: rotate()` for positioning)
- Touch/drag interaction: swipe through letters to spell words
- Also support tap-to-select for accessibility
- Visual feedback: selected letters highlight, line traces the path
- Shuffle button to randomize positions

**Implementation approach:**
- Position letters on a circle using `sin`/`cos` math
- Track touch events (`onTouchStart`, `onTouchMove`, `onTouchEnd`)
- Draw connecting line with SVG overlay or CSS
- Animate shuffle with CSS transitions

### 3.2 WordGrid component
- Display word slots grouped by word length (left column: shorter, right: longer)
- Each slot shows: blank boxes when unsolved, letters when solved
- Compact layout — 2 columns like the reference screenshot
- Words sorted by length, then alphabetically within each length

### 3.3 WordSlot component
- Shows letter count as empty boxes when word is hidden
- Reveals with animation when found
- Hint: can reveal individual letters within the slot

### 3.4 Game component (container)
- Manages layout: WordGrid top ~60%, LetterWheel bottom ~40%
- Score display at top
- Shuffle button, hint button
- "Next puzzle" prompt when all words found
- Persist progress to localStorage

### 3.5 Mobile-first responsive design
- Design for 375px width (iPhone SE) up to 430px (iPhone Pro Max)
- Use `vh`/`dvh` units for full-screen layout
- Touch targets minimum 44px
- No horizontal scrolling
- Safe area insets for notched phones (`env(safe-area-inset-*)`)

---

## Phase 4: Polish & Persistence

### 4.1 localStorage persistence
- Save: current puzzle index, found words, score, hint balance
- Auto-save on every state change
- Load on app start

### 4.2 Animations
- Letter selection: scale up + color change
- Valid word: letters fly from wheel to grid slot
- Invalid word: shake animation on wheel
- Puzzle complete: celebration animation (confetti or similar, keep lightweight)
- Word reveal (hint): typewriter-style letter reveal

### 4.3 PWA setup
- `vite-plugin-pwa` for service worker generation
- App manifest with icon, theme color, display: standalone
- Offline support (entire game works offline since puzzles are bundled)
- "Add to Home Screen" prompt

---

## Phase 5: Screenshot & Testing Infrastructure

### 5.1 Playwright setup
```bash
npm install -D @playwright/test
npx playwright install chromium
```

### 5.2 Screenshot script (`e2e/screenshot.spec.ts`)
```typescript
test('capture game screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 Pro
  await page.goto('http://localhost:5173');
  await page.waitForSelector('[data-testid="letter-wheel"]');
  await page.screenshot({ path: 'screenshots/game.png', fullPage: true });
});
```

### 5.3 npm scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "screenshot": "npx playwright test e2e/screenshot.spec.ts",
    "generate-puzzles": "tsx scripts/generatePuzzles.ts"
  }
}
```

The agent workflow becomes:
1. Make changes
2. `npm run build` — verify it compiles
3. `npm run screenshot` — capture what it looks like
4. Review screenshot, iterate

---

## Phase 6: Gameplay Hooks & Progression (Replacing Microtransactions)

### Design Philosophy
The original game monetizes frustration — you get stuck, you pay. We want to monetize **satisfaction** — you play well, you earn rewards. Everything is earnable through gameplay alone.

### 6.1 Currency: Stars

Players earn **Stars** for:
| Action | Stars |
|--------|-------|
| Find a 3-letter word | 1 |
| Find a 4-letter word | 2 |
| Find a 5-letter word | 3 |
| Find a 6-letter word | 5 |
| Find a 7+ letter word | 8 |
| Complete a puzzle (find all words) | 10 bonus |
| Complete without hints | 15 bonus |
| Daily streak (consecutive days) | 5 × streak day |
| Find a "bonus word" (valid but not in puzzle list) | 3 |

### 6.2 Spending Stars
| Power-up | Cost | Effect |
|----------|------|--------|
| **Reveal a letter** | 5 stars | Shows one letter in any unsolved word |
| **Reveal a word** | 15 stars | Fully reveals one word |
| **Shuffle+** | 3 stars | Shuffle AND highlight letters of one unsolved word briefly |
| **Skip puzzle** | 25 stars | Move to next puzzle without completing |

### 6.3 Streak System
- Track consecutive days played
- Increasing daily bonus: Day 1 = 5 stars, Day 7 = 35 stars
- Streak freeze: costs 20 stars, keeps streak alive for one missed day
- Visual streak counter on main screen

### 6.4 Bonus Words
- If a player enters a **valid English word** from the letters that isn't in the puzzle's required word list, it counts as a "bonus word"
- Bonus words earn 3 stars each
- Track bonus words found across all puzzles
- Milestone rewards at 10, 50, 100 bonus words found

### 6.5 Difficulty Progression
- Puzzles get gradually harder (more words, longer words)
- Every 10 puzzles: a "challenge puzzle" with a 8-9 letter word
- Challenge puzzles award double stars

### 6.6 Achievements (Future Phase)
Ideas for later implementation:
- "Speed Demon" — complete a puzzle in under 60 seconds
- "No Help Needed" — complete 10 puzzles without hints
- "Wordsmith" — find 500 total words
- "Streak Master" — maintain a 30-day streak
- "Bonus Hunter" — find 100 bonus words
- "Completionist" — complete all puzzles in a difficulty tier

### 6.7 Daily Challenge (Future Phase)
- One special puzzle per day, same for all players
- Leaderboard by completion time
- Extra star rewards for top performance

---

## Implementation Order

For an agent executing this plan, build in this exact order:

### Sprint 1: Playable prototype
1. Scaffold Vite + React + TypeScript project
2. Create CLAUDE.md and `.claude/hooks.toml`
3. Write puzzle generation script with a small bundled word list
4. Generate initial set of puzzles
5. Build `useGameState` hook with core logic
6. Build `LetterWheel` component (tap to select)
7. Build `WordGrid` and `WordSlot` components
8. Build `Game` container tying it all together
9. Mobile-first CSS
10. Set up Playwright and capture first screenshot

### Sprint 2: Touch interactions & polish
1. Add swipe/drag interaction to LetterWheel
2. Add animations (word found, invalid word, puzzle complete)
3. Add shuffle button
4. localStorage persistence
5. Score and hint system
6. PWA manifest and service worker

### Sprint 3: Progression & gameplay hooks
1. Star currency system
2. Hint spending (letter reveal, word reveal)
3. Streak tracking
4. Bonus word detection
5. Difficulty progression
6. Achievement system

---

## Key Decisions & Trade-offs

| Decision | Rationale |
|----------|-----------|
| PWA over native app | No app store, no build tools, works everywhere, easy to screenshot |
| Pre-generated puzzles | No server needed, works offline, deterministic |
| CSS over Canvas | Accessible, SEO-friendly (not that it matters), easier to style |
| No backend | All state in localStorage, zero infrastructure |
| TypeScript strict | Catch bugs early, better agent experience |
| Playwright screenshots | Agents can visually verify changes without a phone |

## Future Considerations
- **Backend (optional):** If adding daily challenges/leaderboards, would need a simple API (Cloudflare Workers or similar)
- **Native wrapper (optional):** Could wrap PWA with Capacitor for app store distribution later
- **Larger word list:** Start with ~20k common words, can expand later
- **Theming:** The reference app has scenic backgrounds — could add theme customization as a star-earnable cosmetic
