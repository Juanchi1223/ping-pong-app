# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PingPongZS** — internal app for tracking and ranking ping pong matches between friends. Single-admin interface (no multi-user auth). Full-stack: Node/Express + knex/sqlite3 backend, React/Vite frontend.

> **Note**: `better-sqlite3` was avoided — it has no prebuilt binary for Node 25 and fails to compile. Use `knex` + `sqlite3` instead.

## Commands

```bash
# Run both backend and frontend concurrently
npm run dev

# Run individually
npm run dev:backend   # Express on http://localhost:3001
npm run dev:frontend  # Vite on http://localhost:3000 (proxies /api to :3001)

# Install all dependencies (first time)
npm run install:all
```

## Architecture

```
ping-pong-app/
├── backend/
│   ├── server.js          # Express entry point
│   ├── db.js              # SQLite setup via better-sqlite3
│   ├── elo.js             # ELO calculation (K=32)
│   └── routes/
│       ├── players.js     # CRUD + badge computation
│       └── matches.js     # Match registration + H2H queries
└── frontend/
    └── src/
        ├── api/index.js   # All fetch calls in one place
        ├── App.jsx        # React Router setup
        ├── components/Layout.jsx  # Sidebar nav
        └── pages/
            ├── Dashboard.jsx      # Rankings table + badge cards
            ├── Players.jsx        # Player CRUD with modals
            ├── RegisterMatch.jsx  # Match form with live ELO preview
            ├── PlayerProfile.jsx  # Stats + match history
            └── HeadToHead.jsx     # H2H comparison view
```

## Data Model

**players**: `id, name, mmr (default 1000), wins, losses, points_scored, points_conceded, current_win_streak, current_loss_streak, active, created_at`

**matches**: `id, player_a_id, player_b_id, score_a, score_b, mmr_delta_a, mmr_delta_b, played_at`

## ELO Algorithm

```js
// K = 32, standard Elo formula
expectedA = 1 / (1 + 10^((mmrB - mmrA) / 400))
deltaA = round(32 * (actualA - expectedA))  // actualA = 1 if win, 0 if loss
```

Upsets (low MMR beats high MMR) produce large swings; expected wins produce small ones.

## Ranking Badges

- **El Muro** (🏰): player with highest `points_scored - points_conceded`
- **On Fire** (🔥): player with longest current win streak (≥2)
- **Cold Spell** (❄️): player with longest current loss streak (≥2)

Badge computation is in `backend/routes/players.js` → `computeBadges()`. Frontend mirrors the same ELO formula in `RegisterMatch.jsx` for the live preview.

## Frontend Stack

- React 18 + React Router v6
- Vite (dev server on :3000, proxies `/api` to :3001)
- Tailwind CSS v3 — custom colors defined in `tailwind.config.js`
- Fonts: Bebas Neue (headings), JetBrains Mono (stats), DM Sans (body) via Google Fonts
- CSS animations and component styles in `src/index.css`
