# Architecture

Overview of the LILA BLACK Player Journey Visualization tool.

## What we built (and why)

| Piece | Choice | Why |
|-------|--------|-----|
| Data prep | Python + PyArrow | Fast parquet decode, easy batch transforms, matches the provided schema |
| Web app | Next.js 15 + React + TypeScript | Simple static hosting, clear component structure, good DX |
| Rendering | HTML Canvas | Paths, markers, and heatmaps on a 1024×1024 minimap without a heavy map library |
| Hosting | GitHub Pages (static export) | Shareable URL with no server; Vercel CLI auth was unavailable in this environment |

We optimized for **Level Designer usability** over data-science dashboards: map-first layout, filters, playback, and heatmap toggles.

## Data flow

```
player_data/*.nakama-0 (parquet)
        │
        ▼
 scripts/build_data.py
        │
        ├─► web/public/data/bootstrap.json   (tiny default match for fast first paint)
        ├─► web/public/data/index.json       (full match catalog for filters)
        ├─► web/public/data/matches/<id>.json
        ├─► web/public/data/heatmaps/<map>.json
        ├─► web/public/data/maps.json
        └─► web/public/minimaps/*_Minimap.jpg  (1024×1024 web-sized)
                │
                ▼
        Browser (JourneyViewer)
                │
                ├─ load bootstrap + maps → pick default match
                ├─ load match JSON + minimap → canvas paint
                ├─ load index.json in background → filters
                └─ load heatmap only when overlay selected
```

Each parquet file is one player/bot in one match. The pipeline groups by `match_id`, converts world `(x, z)` → pixel `(px, py)`, downsamples long paths, and writes per-match JSON.

## World → minimap coordinate mapping

From the dataset README (images are treated as **1024×1024** logical space):

| Map | Scale | Origin X | Origin Z |
|-----|-------|----------|----------|
| AmbroseValley | 900 | -370 | -473 |
| GrandRift | 581 | -290 | -290 |
| Lockdown | 1000 | -500 | -500 |

```
u = (x - origin_x) / scale
v = (z - origin_z) / scale
pixel_x = u * 1024
pixel_y = (1 - v) * 1024   # flip Y (image origin is top-left)
```

Notes:
- Use **`x` and `z` only** for 2D plotting; `y` is elevation.
- Heatmap grids (64×64) use the same UV space so overlays align with paths.
- Source minimap art is much larger than 1024px; we resize to 1024 JPEG for load time while keeping the same logical mapping.

## Assumptions

| Ambiguity | Assumption |
|-----------|------------|
| `ts` looks like epoch dates in 1970 | Treat as **match-relative ordering** only; normalize to `t - t_min` per match. Playback stretches a match over ~20s wall-clock because raw spans are only hundreds of ms. |
| Calendar date for filters | Use the **folder date** (`February_10` → `2026-02-10`), not `ts`. |
| Filename / `user_id` bot detection | Numeric id → bot; UUID → human (per dataset README). |
| Points slightly outside 0–1 UV | Clamp out of heatmap bins; paths still draw (rare). |
| Many matches have a single human file | Still valid journeys; bots may be missing from telemetry for that match. |
| Event bytes in parquet | Decode UTF-8; unknown events kept as markers. |

## Major tradeoffs

| Decision | Alternatives considered | Chose this because |
|----------|-------------------------|-------------------|
| Precompute JSON vs query parquet in browser | DuckDB-WASM / on-the-fly parse | Smaller runtime, simpler hosting, predictable UX |
| Canvas vs MapLibre/Leaflet | Map libraries | Overkill for fixed minimap images; canvas is enough |
| Full index upfront vs bootstrap | Load all 796 matches before paint | Bootstrap (~0.4KB) + background index → faster first paint |
| Full-res minimaps vs 1024 JPEG | Keep original 2–11MB assets | Originals dominated load time; 1024 matches logical coords |
| GitHub Pages vs Vercel | Vercel | Pages worked with existing GitHub auth when Vercel token failed |
| Match-relative playback stretch | Show raw ms | Raw durations are too short to scrub meaningfully |

## Repo layout

```
lila/
├── player_data/           # source parquet + original minimaps
├── scripts/build_data.py  # ETL
├── web/                   # Next.js app
│   └── public/data/       # generated artifacts
├── ARCHITECTURE.md
├── INSIGHTS.md
└── README.md
```
