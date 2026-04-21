# Chromino

A 1–4 player Chromino webapp built with Next.js 15 (App Router), TypeScript, and Vercel KV.
Play locally (hotseat + AI) or online (6-character match code, real-time via SSE).

## Quick start

```bash
pnpm install
pnpm generate:tiles   # regenerates data/tiles.json (80 tiles)
pnpm test             # run unit tests
pnpm dev              # http://localhost:3030
```

Open [http://localhost:3030](http://localhost:3030) and click **Play locally** to try instantly.

## Online multiplayer

Online play requires Vercel KV (Upstash Redis). Copy `.env.example` to `.env.local` and fill in:

```
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

Then:

- **Host**: Click **Create online game**. Share the 6-character code.
- **Guest**: Enter the code on the home screen and click **Join**.
- **Host controls**: kick players, set number of AI seats, then start.

Refresh-safe: the last joined game is remembered in `localStorage` (`chromino_last_game`). Your player identity is a UUID in `chromino_player_id`; as long as you keep that, you can rejoin at any point.

## Project layout

```
app/
  page.tsx                    # home / menu
  game/local/page.tsx         # local game (hotseat + AI)
  game/[code]/page.tsx        # lobby + online game
  api/game/create/            # POST create lobby
  api/game/[code]/            # GET state, POST join
  api/game/[code]/start/      # host starts game
  api/game/[code]/kick/       # host kicks a player
  api/game/[code]/action/     # submit a move, server runs AI turns
  api/game/[code]/events/     # SSE stream (Edge runtime)

lib/
  types.ts                    # GameState, Tile, Move, ...
  colors.ts                   # palette + wild rendering
  tile-generator.ts           # produces the 80-tile set (75 basic + 5 wild)
  rng.ts                      # seeded PRNG (mulberry32) + Fisher–Yates
  placement-validator.ts      # legal placement + enumeration
  game-engine.ts              # initGame, applyMove, win conditions
  ai-player.ts                # greedy AI
  match-code.ts               # 6-char codes
  kv.ts                       # KV save/load
  game-store.ts               # Zustand client store

components/
  Tile.tsx                    # SVG tile
  Board.tsx                   # SVG board with zoom/pan + candidate ghosts
  Hand.tsx                    # local-mode hand
  PlayerPanel.tsx

tests/
  tile-generator.test.ts
  placement-validator.test.ts
  game-engine.test.ts

scripts/
  generate-tiles.ts           # writes data/tiles.json
```

## Rules summary

See [prd/rules.md](prd/rules.md) for the full, authoritative rules. Highlights:

- **80 tiles**: 75 basic (each unique up to reflection) + 5 wild (center = Chameleon).
- **Start**: a random wild tile is placed horizontally at the origin, color-side up.
- **Placement**: each turn place one tile touching at least **2** existing matching cells; wild cells match anything.
- **Draw/pass**: if you have no legal play, draw one tile. If still no play (or bag empty), your turn ends.
- **Last tile**: you cannot play a wild as your final tile — you must draw instead.
- **End**: when a player empties their hand, every other player gets one more action, then the game ends.

## Tech notes

- **SSE on Vercel**: `app/api/game/[code]/events/route.ts` exports `runtime = 'edge'` to dodge the 10s serverless function limit. It polls KV every 500ms for version changes and heartbeats every 25s.
- **Authoritative server**: all moves go through `/api/game/[code]/action`. The client reflects state optimistically after the POST resolves, not before, so rejected moves never desync.
- **Reproducible shuffles**: `mulberry32` + string seed from match code means tests can replay games deterministically.
