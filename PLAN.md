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
- **Theming:** See Phase 7 below — scenic backgrounds and block themes earnable via Gems currency

---

## Phase 7: Cosmetics System

### Design Philosophy
Cosmetics are purely visual — they never affect gameplay. They are earnable through play quality (bonus words, flawless puzzles, streaks), not grinding. Stars remain for power-ups; Gems are the cosmetics currency, rewarding skilled and consistent play.

---

### 7.1 Currency: Gems (💎)

A second currency, earned passively and separately from Stars. Gems are **only** spent in the cosmetics shop — they never compete with power-ups.

**Earning Gems:**

| Action | Gems |
|--------|------|
| Complete any puzzle | +1 💎 |
| Find a bonus word (any puzzle) | +1 💎 |
| Flawless puzzle (zero invalid attempts) | +2 💎 |
| 3-day streak milestone | +5 💎 |
| 7-day streak milestone | +10 💎 |
| 14-day streak milestone | +20 💎 |

**Design note:** Gem earning is slow and intentional — a player completing one puzzle a day flawlessly with one bonus word earns ~4💎/day. A background at 80💎 takes ~3 weeks. This makes cosmetics feel earned.

**Cheat code (for testing):** Tap the 💎 counter in the header **7 times within 3 seconds** to receive +500💎, with a toast notification: `"🔑 +500💎 cheat activated"`. This only triggers if taps are fast enough (debounced). No visual hint of this mechanic — it's a pure cheat code.

---

### 7.2 Data Model

```typescript
// src/types.ts additions

interface Background {
  id: string;
  name: string;
  price: number;          // 0 = free
  filename: string;       // e.g. "forest-canopy.jpg" in public/backgrounds/
  photographer: string;   // Credit name
  photographerUrl: string; // Unsplash profile URL
}

interface BlockTheme {
  id: string;
  name: string;
  price: number;          // 0 = free
  premium: boolean;       // Premium themes get a special badge
  vars: {
    '--theme-slot-bg': string;
    '--theme-slot-found-bg': string;
    '--theme-slot-text': string;
    '--theme-slot-border': string;
    '--theme-slot-found-text': string;
  };
  // Premium themes may also include:
  effect?: 'holographic' | 'shimmer' | 'none';
}

interface CosmeticsState {
  gems: number;
  purchasedBackgrounds: string[];  // background IDs
  activeBackground: string;        // 'default' or background ID
  purchasedThemes: string[];       // theme IDs
  activeTheme: string;             // 'default' or theme ID
}
```

**Persistence:** Stored separately in localStorage under key `wordgame_cosmetics_v1`. Isolated from game state so cosmetics are never lost if game state is reset.

---

### 7.3 Backgrounds (6 total)

Images are **manually downloaded** from Unsplash and bundled in `public/backgrounds/`. The Unsplash standard license permits this without mandatory attribution when images are not accessed via the Unsplash API — however, we include a photographer credit overlay on each active background as good practice and respect for creators.

| # | ID | Name | Price | Vibe |
|---|-----|------|-------|------|
| 1 | `default` | Default (dark navy) | Free | Current look — always available |
| 2 | `forest-canopy` | Forest Canopy | 80 💎 | Looking up through tall trees — calm, focused |
| 3 | `night-city` | Night City | 80 💎 | Blurred city bokeh lights — moody, urban |
| 4 | `golden-beach` | Golden Hour Beach | 80 💎 | Warm sand, long shadows — relaxed |
| 5 | `snowy-mountain` | Snowy Mountain | 100 💎 | Alpine peaks, crisp blue sky — clean, energising |
| 6 | `cherry-blossom` | Cherry Blossom | 100 💎 | Japanese garden, pink petals — delicate, seasonal |

**Image specs:**
- Format: JPEG, ~400KB each (optimised for mobile)
- Dimensions: 1080×1920px (portrait, covers full mobile viewport)
- Applied as `background-image` on the game root, `background-size: cover`, `background-position: center`
- A subtle dark overlay (`rgba(0,0,0,0.45)`) preserves game readability
- Attribution badge (bottom-left corner, small, semi-transparent): `Photo: [Photographer] / Unsplash`
- Attribution data stored in `src/data/cosmetics.ts` alongside the catalogue

**Sourcing workflow (for agent implementing this):**
1. Search Unsplash for each theme at `https://unsplash.com/s/photos/[theme]`
2. Download the chosen image (use the "Free download" button, not the API)
3. Resize/optimise to 1080×1920px (use sharp or squoosh)
4. Place in `public/backgrounds/[id].jpg`
5. Record photographer name + profile URL in `src/data/cosmetics.ts`

---

### 7.4 Block Themes (6 total, 2 premium)

Themes override CSS variables scoped to word grid slots and letter wheel tiles. Applied via a `data-theme="[id]"` attribute on the `<div class="game-root">` element. All theme variables are defined in `src/styles/themes.css`.

**Standard themes (4):**

| # | ID | Name | Price | Block bg | Block text | Border/accent |
|---|-----|------|-------|----------|------------|---------------|
| 1 | `default` | Default | Free | `#0f3460` (dark blue) | `#eaeaea` | `#f5a623` (gold) |
| 2 | `amethyst` | Amethyst | 60 💎 | `#3b1361` (deep purple) | `#f0e6ff` | `#c084fc` (lavender) |
| 3 | `forest` | Forest | 60 💎 | `#1a3a2a` (dark green) | `#d4f4e2` | `#6ee7b7` (mint) |
| 4 | `sunset` | Sunset | 60 💎 | `#7c2d12` (deep orange) | `#fff0e6` | `#fb923c` (coral) |

**Premium themes (2) — with CSS effects:**

| # | ID | Name | Price | Description |
|---|-----|------|-------|-------------|
| 5 | `midnight-gold` | Midnight Gold | 150 💎 | Jet black slots with gold text and a subtle gold shimmer gradient on found words. Clean and premium. |
| 6 | `holographic` | Holographic | 150 💎 | Dark base with an animated rainbow shimmer on found word slots — cycling hue-rotation CSS animation. Subtle and tasteful, not garish. |

Premium themes get a `✦ PREMIUM` badge in the shop and a distinct card styling.

**CSS implementation approach:**
```css
/* src/styles/themes.css */
:root {
  --theme-slot-bg: #0f3460;
  --theme-slot-found-bg: #1a5c2a;
  --theme-slot-text: #eaeaea;
  --theme-slot-border: #f5a623;
  --theme-slot-found-text: #ffffff;
}

[data-theme="amethyst"] {
  --theme-slot-bg: #3b1361;
  --theme-slot-found-bg: #5a2090;
  --theme-slot-text: #f0e6ff;
  --theme-slot-border: #c084fc;
  --theme-slot-found-text: #ffffff;
}

/* ... etc for each theme */

[data-theme="holographic"] .word-slot.found {
  animation: holo-shimmer 3s linear infinite;
}

@keyframes holo-shimmer {
  0%   { filter: hue-rotate(0deg) brightness(1.1); }
  100% { filter: hue-rotate(360deg) brightness(1.1); }
}
```

---

### 7.5 Shop UI

**Entry point:** A palette icon button (🎨) in the game header, next to the existing bonus words button. Shows the player's current gem count.

**Shop modal layout:**
```
┌─────────────────────────────┐
│  🎨 Shop          💎 47     │
│  ─────────────────────────  │
│  [ Backgrounds ] [ Themes ] │  ← tab bar
│                             │
│  ┌──────┐  ┌──────┐         │
│  │ img  │  │ img  │         │  ← 2-column grid
│  │      │  │      │         │
│  │Default│  │Forest│         │
│  │ FREE │  │80 💎 │         │
│  │[Active]  │[Buy] │         │
│  └──────┘  └──────┘         │
│                             │
│  ┌──────┐  ┌──────┐         │
│  │ ...  │  │ ...  │         │
│  └──────┘  └──────┘         │
└─────────────────────────────┘
```

**Item states:**
- **Free / active:** Green "Active" badge, no price
- **Free / inactive:** "Equip" button (no cost)
- **Purchased / inactive:** "Equip" button
- **Purchased / active:** Green "Active" badge
- **Locked:** Price shown, "Buy" button — disabled + greyed if insufficient gems

**Theme preview in shop:** Each theme card shows a small preview of 3 word slots rendered with that theme's colours (no real words, just styled boxes). Backgrounds show a cropped thumbnail.

**Purchase flow:** Tap "Buy" → confirm dialog ("Buy [name] for 80💎?") → deduct gems → item moves to "Equip" state → toast: `"+Forest background unlocked!"`

---

### 7.6 Gem Integration into Game Flow

Gem awards are triggered at the same points as star awards, in `useGameState.ts`. A new `gems` field is added to `CosmeticsState` (separate reducer/hook) and updated via dispatched actions:

```typescript
// Events that award gems (dispatched from useGameState)
type GemEvent =
  | { type: 'PUZZLE_COMPLETE' }          // +1
  | { type: 'BONUS_WORD_FOUND' }         // +1
  | { type: 'FLAWLESS_PUZZLE' }          // +2 (on completion if no invalid attempts)
  | { type: 'STREAK_MILESTONE'; days: 3 | 7 | 14 }  // +5/+10/+20
  | { type: 'CHEAT_GEMS' }              // +500 (testing only)
```

A toast notification shows gem awards: `+1 💎` appearing in addition to the star award toast.

---

### 7.7 File Structure

**New files:**
```
src/
├── data/
│   └── cosmetics.ts          # Background + theme catalogue (typed arrays)
├── hooks/
│   └── useCosmeticsState.ts  # Cosmetics state, gem currency, localStorage
├── components/
│   └── Shop.tsx              # Shop modal (tabs, item grid, buy/equip logic)
├── styles/
│   ├── themes.css            # All theme CSS variable overrides + premium effects
│   └── shop.css              # Shop modal styles

public/
└── backgrounds/
    ├── forest-canopy.jpg
    ├── night-city.jpg
    ├── golden-beach.jpg
    ├── snowy-mountain.jpg
    └── cherry-blossom.jpg
```

**Modified files:**
```
src/
├── types.ts                  # Add Background, BlockTheme, CosmeticsState interfaces
├── components/Game.tsx       # Add shop button, gem counter, apply active theme/bg,
│                             #   wire gem events from game state to cosmetics hook
├── hooks/useGameState.ts     # Emit gem events on puzzle complete, bonus word, flawless
└── styles/game.css           # Add background overlay styles, header gem display
```

---

### 7.8 Implementation Order

Build in this sequence to keep the game playable at each step:

1. **Types & data catalogue** — Define interfaces, write `cosmetics.ts` with all 12 items
2. **`useCosmeticsState` hook** — Gem storage, purchase logic, localStorage persistence, cheat code handler
3. **CSS themes** — Write `themes.css` with all 6 theme variable sets + holographic animation
4. **Apply theme to game** — Wire `data-theme` attribute to active theme in `Game.tsx`, confirm themes work
5. **Background support** — Add background image CSS, attribution badge, wire active background
6. **Download & bundle images** — Source 5 Unsplash images, optimise, place in `public/backgrounds/`
7. **Shop modal** — Build `Shop.tsx` with tabs, item grid, buy/equip logic
8. **Gem earning integration** — Wire gem events from `useGameState` into `useCosmeticsState`
9. **Gem display in header** — Show 💎 count next to shop button, cheat code tap handler
10. **Polish** — Purchase animations, toast notifications, gem award toasts, screenshot

---

### 7.9 Unsplash Licensing Note

Images are downloaded directly from Unsplash (not via the Unsplash API), which means the standard Unsplash license applies. This license permits free use including commercial use without mandatory attribution. However, we include a photographer credit overlay on each active background as a courtesy and best practice.

A `public/backgrounds/CREDITS.md` file documents all image sources for transparency.
