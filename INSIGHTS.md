# Insights

Numbers below are from the processed catalog + heatmaps (796 matches, 5 days). Open the tool, pick the map, and turn on the named overlay to see the same pattern.

---

## 1. Combat is bot hunting, not PvP

**What caught my eye.** The assignment asks for kill/death markers, but the map almost never shows a human-on-human fight.

**Evidence.** Across 89,104 events there are **3 Kill + 3 Killed** (three matches total). In the same window: **2,415 BotKill** and **700 BotKilled**. Loot (12,885) outnumbers bot kills ~5:1. Lockdown has **zero** PvP events in this sample.

**Actionable?** Yes.

| Metric | What to watch |
|--------|----------------|
| PvP events / match | Should rise if you add reasons to contest extracts |
| BotKill / minute, time-to-first-bot | Bot density and first-contact pacing |
| Loot / BotKill | ~5.3 now — if it climbs, combat is falling out of the loop |

**For a Level Designer.** Sightlines and cover you built for *player* fights are barely tested. The live combat loop is **bot camps on loot routes**. Tune bot spawn points and approach lanes first; treat PvP arenas as a future bet, not the current one. In the tool: sort matches by “fights,” then compare a 14-bot Ambrose match vs one of the three PvP IDs (`c4a250c9…`, `042774ea…`, `711c9a67…`).

---

## 2. Grand Rift is almost off the rotation

**What caught my eye.** Switching maps in the filter makes Grand Rift feel empty compared with Ambrose Valley.

**Evidence.**

| Map | Matches | Share | Human files | Path rows | Loot / match |
|-----|---------|-------|-------------|-----------|--------------|
| Ambrose Valley | 566 | **71.1%** | 554 | 61,013 | 17.6 |
| Lockdown | 171 | 21.5% | 170 | 21,238 | 12.0 |
| Grand Rift | 59 | **7.4%** | 57 | 6,853 | 14.9 |

Fights per match are similar (~4). Grand Rift is not “less fun per session” in this data — it is **rarely entered**. Feb 14 (partial day) does not explain the gap; the skew is there on Feb 10–13 too.

**Actionable?** Yes.

| Metric | What to watch |
|--------|----------------|
| Match share by map | Target a floor (e.g. ≥20% each) |
| Queue / playlist weight | If share stays ~7%, the playlist is the bug |
| Extract / first-loot time on Grand Rift | If worse than Ambrose, the map is punishing new players |

**For a Level Designer.** Do not spend the next pass polishing Ambrose chokepoints only. Either **weight Grand Rift up** in matchmaking, or give it a clearer first-minute route (spawn → visible loot → extract) so it earns play. Use the tool: same overlay on all three maps; Grand Rift’s heat is sparse because **n is small**, not because the layout is proven.

---

## 3. Most of each map is unused; kills sit on a few cells

**What caught my eye.** Traffic overlay on Ambrose looks like roads and a handful of buildings, not a filled valley. Kill overlay is even tighter.

**Evidence** (64×64 grids, human `Position` for traffic):

| Map | Cells with any traffic | Traffic in the hottest 10% of cells | Cells with any kill | Kills in the hottest 10% |
|-----|------------------------|--------------------------------------|---------------------|---------------------------|
| Ambrose Valley | 38.1% | **71.8%** | 11.9% | **95.6%** |
| Lockdown | 24.6% | 81.6% | 5.6% | 100% |
| Grand Rift | 24.0% | 76.0% | 2.7% | 100% |

Hottest Ambrose traffic cell has **481** samples; many neighbors are zero. Storm is a weak closer: **39** storm deaths vs **703** combat deaths (about **5%**).

**Actionable?** Yes.

| Metric | What to watch |
|--------|----------------|
| % cells with ≥N visits | Did the last POI pass actually move traffic? |
| Kill-cell count | If it stays ~12% of Ambrose, fights are scripted to a few camps |
| Storm deaths / match | If it stays ~0.05, the storm is a timer, not a space threat |

**For a Level Designer.** You can **lean in** (more loot/bots on those corridors — cheaper, matches current behavior) or **pull out** (side extracts, interior loot, storm that actually cuts the road). The tool’s traffic vs kill overlays show whether a new POI is getting walks or just sitting next to the highway. Death-zone overlay is the same picture, sparser — good for checking camp-and-die spots after a bot-density change.
