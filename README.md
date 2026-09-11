# LILA Player Journey Viz

Web tool for LILA Games Level Designers to explore player journeys on LILA BLACK maps.

## Live demo

**https://github.com/megha221/Lila_Assignment**

Hosted on GitHub Pages (static export of the Next.js app).

Minimaps are shipped as 1024×1024 JPEGs (~140KB each) so the first load stays light. The full match catalog loads in the background after the default match is shown.

## Features

- Player paths on the correct minimap (world → pixel mapping)
- Human vs bot styling
- Event markers: loot, kills, deaths, storm deaths
- Filters by map, date, and match
- Timeline playback
- Heatmap overlays: traffic, kill zones, death zones
- Layer toggles (paths / bots / events)

## Walkthrough

Open the live app: **https://megha221.github.io/lila-Assignment/**

1. **First paint**  
   The default Ambrose Valley match loads on the minimap. Blue **solid** lines are humans; gray **dashed** lines are bots. Orange end-dot = last position; green = live position while playing.

2. **Read the markers**  
   Open **Legend** if collapsed:
   - yellow square = Loot  
   - red/orange triangle = Kill / BotKill  
   - pink/red circle = Death / BotKilled  
   - purple diamond = Killed by storm  

3. **Filter**  
   Use **Map**, **Date**, then **Match** (right panel). Match list is sorted by event richness. Stats under the filters show humans / bots / event breakdown for the selected match.

4. **Playback**  
   Click **Play** to watch the match unfold, or drag the timeline scrubber. Use **Speed** (0.5×–4×) and **Reset** to restart from the beginning.

5. **Heatmaps**  
   Under **Overlays**, pick **Traffic**, **Kill zones**, or **Death zones**. These use all days on the selected map (not only the current match). Set back to **Off** to clear.

6. **Layer toggles**  
   Uncheck **Paths**, **Bots**, or **Events** to declutter — useful when comparing a heatmap against human-only routes.

7. **Compare maps**  
   Switch Map to **Grand Rift** or **Lockdown** and repeat filters + heatmaps to see play-rate and hot-spot differences (see [INSIGHTS.md](./INSIGHTS.md)).

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 + React + TypeScript |
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

This writes JSON + minimaps into `web/public/`.

### 2. Run the web app locally

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production (local):

```bash
cd web
npm run build
npx serve out
```

### Deploy to GitHub Pages

```bash
cd web
npm run build:gh
touch out/.nojekyll
npx gh-pages -d out --dotfiles -m "Deploy"
```

Site: https://megha221.github.io/lila-Assignment/

## Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — stack, data flow, coordinate mapping, assumptions, tradeoffs
- [INSIGHTS.md](./INSIGHTS.md) — three Level Designer findings from the telemetry

## Project layout

```
lila/
├── player_data/          # Source parquet + minimaps + README
├── scripts/build_data.py # Parquet → JSON pipeline
├── web/                  # Next.js app
│   └── public/data/      # Processed match/heatmap JSON
├── ARCHITECTURE.md
├── INSIGHTS.md
└── README.md
```

## Env vars

None required for the deployed static/JSON-backed app.
