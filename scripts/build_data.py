#!/usr/bin/env python3
"""Parquet → compact JSON (+ 1024px minimaps) for the web app.

Outputs (under web/public/):
  data/catalog.json      match index for map/date/match filters
  data/matches/{id}.json one file per match (paths + event markers)
  data/heatmaps.json     64×64 traffic / kill / death grids per map
  minimaps/{Map}.jpg     resized top-down images

Coord convention stored in JSON (image UV, origin top-left):
  u = (x - origin_x) / scale
  v = 1 - (z - origin_z) / scale
Canvas: pixel_x = u * width, pixel_y = v * height.

Timestamps: parquet declares timestamp[ms], but the integers are unix
seconds (they land on Feb 10–14 2026). Treating them as ms makes every
match look like <1s in 1970. We convert match-relative time to ms as
(ts_sec - match_start_sec) * 1000 for playback.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd
import pyarrow.parquet as pq
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "player_data"
OUT = ROOT / "web" / "public"
UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.I,
)

MAP_CFG = {
    "AmbroseValley": {
        "label": "Ambrose Valley",
        "scale": 900,
        "origin_x": -370,
        "origin_z": -473,
        "src": "AmbroseValley_Minimap.png",
    },
    "GrandRift": {
        "label": "Grand Rift",
        "scale": 581,
        "origin_x": -290,
        "origin_z": -290,
        "src": "GrandRift_Minimap.png",
    },
    "Lockdown": {
        "label": "Lockdown",
        "scale": 1000,
        "origin_x": -500,
        "origin_z": -500,
        "src": "Lockdown_Minimap.jpg",
    },
}

EVENT_OUT = {
    "Loot": "loot",
    "Kill": "kill",
    "Killed": "death",
    "BotKill": "botKill",
    "BotKilled": "botDeath",
    "KilledByStorm": "storm",
}
KILL_EVENTS = {"Kill", "BotKill"}
DEATH_EVENTS = {"Killed", "BotKilled", "KilledByStorm"}
HEAT_SIZE = 64
MONTHS = {"February": 2}


def folder_to_date(name: str) -> str:
    month, day = name.split("_")
    return f"2026-{MONTHS[month]:02d}-{int(day):02d}"


def decode_event(val) -> str:
    if isinstance(val, (bytes, bytearray)):
        return bytes(val).decode("utf-8")
    return str(val)


def is_human(user_id: str) -> bool:
    return bool(UUID_RE.match(str(user_id)))


def match_file_id(match_id: str) -> str:
    return match_id.replace(".nakama-0", "")


def q4(x) -> float:
    return float(f"{float(x):.4f}")


def world_to_uv(x, z, map_id: str):
    cfg = MAP_CFG[map_id]
    u = (x - cfg["origin_x"]) / cfg["scale"]
    v = 1.0 - (z - cfg["origin_z"]) / cfg["scale"]
    return u, v


def load_all() -> pd.DataFrame:
    frames = []
    day_dirs = sorted(p for p in DATA.iterdir() if p.is_dir() and p.name.startswith("February"))
    for day in day_dirs:
        date = folder_to_date(day.name)
        for path in day.iterdir():
            if not path.is_file() or path.name.startswith("."):
                continue
            df = pq.read_table(path).to_pandas()
            df["date"] = date
            frames.append(df)
    df = pd.concat(frames, ignore_index=True)
    df["event"] = df["event"].map(decode_event)
    df["user_id"] = df["user_id"].astype(str)
    df["match_id"] = df["match_id"].astype(str)
    df["map_id"] = df["map_id"].astype(str)
    df["bot"] = ~df["user_id"].map(is_human)
    # Declared timestamp[ms], but values are unix seconds (see module docstring).
    df["ts_sec"] = df["ts"].to_numpy(dtype="datetime64[ms]").astype(np.int64)
    u = np.empty(len(df), dtype=np.float64)
    v = np.empty(len(df), dtype=np.float64)
    for map_id, idx in df.groupby("map_id").groups.items():
        uu, vv = world_to_uv(df.loc[idx, "x"].to_numpy(), df.loc[idx, "z"].to_numpy(), map_id)
        u[idx] = uu
        v[idx] = vv
    df["u"] = np.round(u, 4)
    df["v"] = np.round(v, 4)
    return df


def dump(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, separators=(",", ":")))


def write_minimaps() -> None:
    src_dir = DATA / "minimaps"
    out_dir = OUT / "minimaps"
    out_dir.mkdir(parents=True, exist_ok=True)
    for map_id, cfg in MAP_CFG.items():
        im = Image.open(src_dir / cfg["src"]).convert("RGB")
        im = im.resize((1024, 1024), Image.Resampling.LANCZOS)
        dest = out_dir / f"{map_id}.jpg"
        im.save(dest, "JPEG", quality=85, optimize=True)
        print(f"  minimap {map_id}: {dest.stat().st_size // 1024} KB")


def write_heatmaps(df: pd.DataFrame) -> None:
    out = {"size": HEAT_SIZE, "maps": {}}
    for map_id, g in df.groupby("map_id"):
        traffic = np.zeros((HEAT_SIZE, HEAT_SIZE), dtype=np.int32)
        kills = np.zeros_like(traffic)
        deaths = np.zeros_like(traffic)

        def bump(grid, rows):
            if rows.empty:
                return
            gx = np.clip((rows["u"].to_numpy() * HEAT_SIZE).astype(int), 0, HEAT_SIZE - 1)
            gy = np.clip((rows["v"].to_numpy() * HEAT_SIZE).astype(int), 0, HEAT_SIZE - 1)
            np.add.at(grid, (gy, gx), 1)

        bump(traffic, g[g["event"] == "Position"])
        bump(kills, g[g["event"].isin(KILL_EVENTS)])
        bump(deaths, g[g["event"].isin(DEATH_EVENTS)])
        out["maps"][map_id] = {
            "traffic": traffic.flatten().tolist(),
            "kills": kills.flatten().tolist(),
            "deaths": deaths.flatten().tolist(),
        }
        print(
            f"  heatmap {map_id}: traffic={int(traffic.sum())} "
            f"kills={int(kills.sum())} deaths={int(deaths.sum())}"
        )
    dump(OUT / "data" / "heatmaps.json", out)


def player_payload(g: pd.DataFrame, t0: int) -> dict:
    g = g.sort_values("ts_sec", kind="mergesort")
    path = [[int(r.ts_sec - t0) * 1000, q4(r.u), q4(r.v)] for r in g.itertuples(index=False)]
    events = []
    for r in g.itertuples(index=False):
        kind = EVENT_OUT.get(r.event)
        if kind:
            events.append([int(r.ts_sec - t0) * 1000, q4(r.u), q4(r.v), kind])
    return {
        "id": g["user_id"].iloc[0],
        "bot": bool(g["bot"].iloc[0]),
        "path": path,
        "events": events,
    }


def write_matches(df: pd.DataFrame) -> tuple[list[dict], str]:
    catalog = []
    out_dir = OUT / "data" / "matches"
    if out_dir.exists():
        for old in out_dir.glob("*.json"):
            old.unlink()
    out_dir.mkdir(parents=True, exist_ok=True)

    n_matches = df["match_id"].nunique()
    written = 0
    for match_id, g in df.groupby("match_id", sort=False):
        t0 = int(g["ts_sec"].min())
        t1 = int(g["ts_sec"].max())
        map_id = g["map_id"].mode().iloc[0]
        date = g["date"].min()
        players = []
        n = defaultdict(int)
        humans = bots = 0
        for _, pg in g.groupby("user_id", sort=False):
            payload = player_payload(pg, t0)
            players.append(payload)
            if payload["bot"]:
                bots += 1
            else:
                humans += 1
            n["path"] += len(payload["path"])
            for ev in payload["events"]:
                n[ev[3]] += 1
        players.sort(key=lambda p: (p["bot"], p["id"]))
        mid = match_file_id(match_id)
        payload = {
            "id": mid,
            "map": map_id,
            "date": date,
            "t0": 0,
            "t1": (t1 - t0) * 1000,
            "players": players,
        }
        dump(out_dir / f"{mid}.json", payload)
        written += 1
        catalog.append(
            {
                "id": mid,
                "map": map_id,
                "date": date,
                "humans": humans,
                "bots": bots,
                "t1": (t1 - t0) * 1000,
                "n": dict(n),
            }
        )
        if written % 200 == 0:
            print(f"  matches {written}/{n_matches}")

    def richness(m: dict) -> tuple:
        n = m["n"]
        combat = n.get("kill", 0) + n.get("death", 0) + n.get("botKill", 0) + n.get("botDeath", 0) + n.get("storm", 0)
        return (m["humans"], combat, n.get("loot", 0), m["t1"])

    catalog.sort(key=richness, reverse=True)

    def demo_score(m: dict) -> tuple:
        n = m["n"]
        combat = (
            n.get("kill", 0)
            + n.get("death", 0)
            + n.get("botKill", 0)
            + n.get("botDeath", 0)
            + n.get("storm", 0)
        )
        return (
            int(m["map"] == "AmbroseValley"),
            int(m["humans"] >= 1 and m["bots"] >= 1),
            m["humans"],
            combat,
            n.get("loot", 0),
            m["t1"],
        )

    default = max(catalog, key=demo_score)["id"]
    print(f"  wrote {written} match files")
    return catalog, default


def write_catalog(matches: list[dict], default_id: str) -> None:
    dump(
        OUT / "data" / "catalog.json",
        {
            "defaultMatch": default_id,
            "maps": {
                map_id: {"label": cfg["label"], "image": f"minimaps/{map_id}.jpg"}
                for map_id, cfg in MAP_CFG.items()
            },
            "dates": sorted({m["date"] for m in matches}),
            "matches": matches,
        },
    )


def main() -> None:
    print("Loading parquet…")
    df = load_all()
    print(f"  {len(df):,} rows, {df['match_id'].nunique()} matches")

    print("Writing minimaps…")
    write_minimaps()

    print("Writing heatmaps…")
    write_heatmaps(df)

    print("Writing matches…")
    catalog, default_id = write_matches(df)
    write_catalog(catalog, default_id)

    data_bytes = sum(p.stat().st_size for p in (OUT / "data").rglob("*.json"))
    map_bytes = sum(p.stat().st_size for p in (OUT / "minimaps").glob("*.jpg"))
    default = next(m for m in catalog if m["id"] == default_id)
    uv_ok = bool(df["u"].between(0, 1).all() and df["v"].between(0, 1).all())
    print("\n=== Step 2 ===")
    print(f"catalog matches: {len(catalog)}")
    print(f"default match:   {default_id}")
    print(f"  map={default['map']} date={default['date']} humans={default['humans']} bots={default['bots']} n={default['n']}")
    print(f"UV in [0,1]:     {uv_ok}")
    print(f"JSON size:       {data_bytes / 1_048_576:.2f} MB")
    print(f"minimap size:    {map_bytes / 1_048_576:.2f} MB")
    print(f"out:             {OUT}")


if __name__ == "__main__":
    main()
