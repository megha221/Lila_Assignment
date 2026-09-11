# LILA Player Journey Viz

Web tool for LILA Games Level Designers to explore how players actually move, loot, and fight on LILA BLACK maps.

## Live demo

**https://megha221.github.io/Lila_Assignment/**

Hosted on GitHub Pages (static Vite build). No login, no env vars.

## Walkthrough

1. **First paint**  
   Ambrose Valley loads with a busy default match. **Solid cyan** = human path; **dashed gray** = bots. Orange dot = last / live position.

2. **Read the markers**  
   Open **Legend** if it is collapsed:
   - yellow square = Loot  
   - red / orange triangle = Kill / Bot kill  
   - pink / red circle = Death / killed by bot  
   - purple diamond = Storm death  

   Hover a marker for type and match time.

3. **Filter**  
   **Map → Date → Match** (right panel). Matches are sorted by humans, then combat, then loot. Stats under the filters are for the selected match. Use **Prev / Next** to step through the list.

4. **Playback**  
   **Play** watches the match unfold (default **8×** — sessions are ~6–15 minutes). Drag the scrubber, change **Speed**, or **Reset**. Spacebar toggles play when focus is not in a control.

5. **Heatmaps**  
   **Overlays**: Traffic, Kill zones, or Death zones. These use **all days on the selected map**, not only this match. Set **Off** to clear.

6. **Layer toggles**  
   Uncheck **Paths**, **Bots**, or **Events** to compare a heatmap against human-only routes.

7. **Compare maps**  
   Switch to **Grand Rift** or **Lockdown** and repeat filters + heatmaps. See [INSIGHTS.md](./INSIGHTS.md) for why the three maps feel so different.

## Features

- Player paths on the correct minimap (world → image UV)
- Human vs bot styling
- Event markers: loot, kills, deaths, storm deaths
- Filters by map, date, and match
- Timeline playback
- Heatmap overlays: traffic, kill zones, death zones
- Layer toggles (paths / bots / events)

## Tech stack

| Layer | Choice |
|--------|--------|
| Frontend | Vite + React + TypeScript |
| Rendering | HTML Canvas |
| Data prep | Python + PyArrow (parquet → JSON) |
| Hosting | GitHub Pages |

## Setup

### 1. Rebuild processed data (optional)

Requires Python 3 and the provided `player_data/` folder.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/build_data.py
```

Writes JSON + 1024px minimaps into `web/public/`.

### 2. Run the web app locally

```bash
cd web
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

Production preview:

```bash
cd web
npm run build
npm run preview
```

## Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — stack, data flow, coordinate mapping, assumptions, tradeoffs
- [INSIGHTS.md](./INSIGHTS.md) — three Level Designer findings from the telemetry

## Project layout

```
├── player_data/           # Source parquet + minimaps + README
├── scripts/build_data.py  # Parquet → JSON pipeline
├── web/                   # Vite app
│   └── public/            # Processed JSON + minimaps
├── ARCHITECTURE.md
├── INSIGHTS.md
└── README.md
```

## Env vars

None required.
