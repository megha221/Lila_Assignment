# Insights

Three findings from exploring the Feb 10–14, 2026 LILA BLACK telemetry with this tool. Counts come from the processed catalog (`web/public/data/index.json`, 796 matches, ~89k event rows).

---

## 1. Combat is almost entirely PvE — humans dominate bots

### What caught my eye
Heatmaps and match markers are full of orange kill triangles, but almost none are true PvP.

### Evidence
| Event | Count |
|-------|------:|
| `BotKill` (human kills bot) | **2,415** |
| `BotKilled` (bot kills human) | **700** |
| `Kill` / `Killed` (human vs human) | **3 / 3** |

Humans win bot fights at roughly **3.45 : 1**. Across 796 matches there are only **3** recorded human-on-human kills.

### Why a Level Designer should care
If BLACK is sold as a tense extraction shooter, the live loop currently teaches “farm bots,” not “contest players.” POI design, audio stingers, and risk/reward that assume PvP will feel empty.

### Actionable
| Metric to watch | Action |
|-----------------|--------|
| PvP kill share (`Kill` / all kills) | Raise bot aggression or reduce bot density in high-traffic loot lanes so humans collide more |
| Time-to-first-player-contact | Add contested mid-map extract / high-tier loot that forces path overlap |
| BotKill : BotKilled ratio | If ratio stays >3, tune bot aim/HP or spawn bots on player approaches rather than static camps |

---

## 2. Grand Rift is heavily underplayed vs Ambrose Valley

### What caught my eye
Switching the map filter makes Grand Rift feel empty compared with Ambrose Valley.

### Evidence
| Map | Matches | Share |
|-----|--------:|------:|
| AmbroseValley | 566 | **71.1%** |
| Lockdown | 171 | 21.5% |
| GrandRift | **59** | **7.4%** |

Path samples follow the same skew (Ambrose ~48.6k points vs Grand Rift ~5.7k).

### Why a Level Designer should care
Balance and POI feedback for Grand Rift is statistically thin. You may be tuning a map most players never see — or the map is losing the queue for UX reasons (load time, spawn quality, extract clarity).

### Actionable
| Metric to watch | Action |
|-----------------|--------|
| Map pick / queue rate by map | Audit Grand Rift matchmaking weight, unlock rules, and first-session map tutorial |
| Early drop-off on Grand Rift (path length, leave rate) | Compare spawn-to-loot time vs Ambrose; fix dead spawns / unclear routes |
| Extract success rate by map | If extracts fail more on Grand Rift, storm/extract timing may be punishing newcomers |

---

## 3. Storm deaths are rare overall — but much deadlier on smaller maps

### What caught my eye
Storm markers (`KilledByStorm`) are sparse on Ambrose Valley heatmaps, but Lockdown shows a higher storm death rate per match.

### Evidence
| Map | Storm deaths | Per 100 matches |
|-----|-------------:|----------------:|
| AmbroseValley | 17 | **3.0** |
| GrandRift | 5 | **8.5** |
| Lockdown | 17 | **9.9** |

Total storm deaths in the dataset: **39** (very rare vs 12,885 loot events).

### Why a Level Designer should care
On Ambrose Valley the storm may be too forgiving (low educational pressure). On Lockdown/Grand Rift it may clip fights or extracts too hard relative to map size — players die to zone before learning routes.

### Actionable
| Metric to watch | Action |
|-----------------|--------|
| Storm deaths / match by map | Soften Lockdown storm speed or widen safe corridors toward extract |
| Extract attempts vs storm deaths | Add earlier storm telegraphs / minimap safe-zone preview on small maps |
| Loot-per-life vs storm deaths | If loot stays high (~16.5 loot events per human journey) while storm kills stay tiny on Ambrose, consider faster late-circle pressure so extracts feel earned |

---

## How to reproduce in the tool

1. Open https://github.com/megha221/Lila_Assignment/
2. For insight 1: enable **Kill zones** heatmap on Ambrose Valley; scrub matches with high BotKill counts.
3. For insight 2: switch **Map** between Ambrose Valley and Grand Rift — note match list length.
4. For insight 3: filter Lockdown, enable death heatmap, look for purple storm diamonds vs pink bot-death markers.
