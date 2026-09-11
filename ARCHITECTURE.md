# Architecture

Static tool for Level Designers: parquet is compiled once into JSON, then a Vite app draws it on the minimap. No backend, no env vars.

## Stack

| Layer | Choice | Why |
|--------|--------|-----|
| Pipeline | Python + PyArrow + Pillow | Fast parquet read; one script writes everything the browser needs |
| App | Vite + React + TypeScript | Fast local loop, static `dist/` for GitHub Pages |
| Render | HTML Canvas | 15+ paths + heat + markers at 60-ish UI updates; DOM SVG would be heavier |
| Host | GitHub Pages | Shareable URL, no server to keep alive |

Considered Streamlit (quick, weaker map UX) and Next.js (unnecessary SSR for a local JSON app).

## Data flow

```
player_data/*.nakama-0  ──►  scripts/build_data.py  ──►  web/public/
     parquet + README              decode, UV, heat          catalog.json
     + full-res minimaps           resize maps to 1024      matches/{id}.json
                                                            heatmaps.json
                                                            minimaps/*.jpg
                                                                   │
                                                                   ▼
                                                          Vite app fetch
                                                          catalog → one match
                                                          canvas draw
```

1. **Catalog** (~125 KB) loads first: maps, dates, 796 match summaries, default match id.
2. **One match JSON** loads on selection (default ~26 KB). Paths are `[t, u, v]`; events are `[t, u, v, type]`.
3. **Heatmaps** (64×64, all days per map) load once. Overlay is not limited to the selected match.
4. Source minimaps are 2k–9k px; the pipeline writes **1024×1024 JPEGs** so first paint stays light.

The browser never reads parquet.

## Coordinate mapping

README world system: plot **`x` + `z`**. **`y` is height** and is dropped.

Each map has `scale`, `origin_x`, `origin_z`. UV in the JSON is **image space** (origin top-left):

```
u = (x - origin_x) / scale
v = 1 - (z - origin_z) / scale     # flip: game Z-up vs image Y-down

pixel_x = u * width
pixel_y = v * height
```

README example (Ambrose Valley, `x=-301.45`, `z=-355.55`) lands at **~(78, 890)** in 1024 space. All 89,104 points fall inside `[0,1]` UV.

The README says minimaps are 1024×1024; the files are larger (4320 / 2160 / 9000). We still use the README UV math, then scale to the image we actually draw.

## Assumptions (ambiguous data)

| Ambiguity | What we did |
|-----------|-------------|
| `event` is bytes | Decode UTF-8. |
| UUID vs numeric `user_id` | UUID = human, numeric = bot (filename and rows agree). |
| `ts` declared `timestamp[ms]` but values are unix **seconds** (they land on Feb 10–14 2026). Read as ms they all sit in 1970 and every match looks like &lt;1s. | Store match-relative **milliseconds**: `(ts_sec - match_min) * 1000`. Playback 1× = real duration (~6–15 min). |
| Calendar date | Filter by **folder** (`February_10` → `2026-02-10`), not the 1970 parquet clock. Folder dates match the decoded unix days. |
| 743 / 796 matches have one player file | Reconstruct what we have; UI warns when a match is a single file. |
| Heat “traffic” | Human `Position` only — bot patrols would wash out LD signal. Kills = `Kill`+`BotKill`. Deaths = `Killed`+`BotKilled`+`KilledByStorm`. |

## Tradeoffs

| Decision | Alternatives | Why this |
|----------|--------------|----------|
| Per-match JSON + catalog | One 3 MB blob | First paint is catalog + one match; filters stay on the client |
| Precomputed 64×64 heat | Compute in the browser | Instant overlay; 64 cells ≈ 16 px on a 1024 map |
| Resize minimaps to 1024 JPG | Ship 9k source images | ~118 KB each vs several MB |
| Canvas, not Mapbox/WebGL | Extra library | Three maps, no tiles, no GIS |
| Default 8× playback | 1× only | Median match is ~6–7 minutes; LDs need to scrub fast |
| Keep all path samples | Thin to 2 px | 89k points already compact once UV-rounded |
