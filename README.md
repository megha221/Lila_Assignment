# LILA Player Journey Viz

Web tool for LILA Games Level Designers to explore player journeys on LILA BLACK maps.

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

## Setup

### 1. Rebuild processed data (optional)

Requires Python 3 and the provided `player_data/` folder.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/build_data.py
```

This writes JSON + minimaps into `web/public/`.

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

## Project layout

```
├── player_data/          # Source parquet + minimaps + README
├── scripts/build_data.py # Parquet → JSON pipeline
├── web/                  # Vite app
│   └── public/           # Processed match/heatmap JSON + minimaps
└── README.md
```

## Env vars

None required.
