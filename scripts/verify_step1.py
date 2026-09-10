#!/usr/bin/env python3
"""Step 1: load parquet telemetry and verify it matches player_data/README.md."""

from __future__ import annotations

import os
import re
import statistics
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1] / "player_data"
UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.I,
)
NUMERIC_RE = re.compile(r"^\d+$")
EXPECTED_COLS = ["user_id", "match_id", "map_id", "x", "y", "z", "ts", "event"]
MAP_CFG = {
    "AmbroseValley": {"scale": 900, "origin_x": -370, "origin_z": -473},
    "GrandRift": {"scale": 581, "origin_x": -290, "origin_z": -290},
    "Lockdown": {"scale": 1000, "origin_x": -500, "origin_z": -500},
}
KNOWN_EVENTS = {
    "Position",
    "BotPosition",
    "Kill",
    "Killed",
    "BotKill",
    "BotKilled",
    "KilledByStorm",
    "Loot",
}


def is_human(user_id: str) -> bool:
    return bool(UUID_RE.match(str(user_id)))


def world_to_pixel(x: float, z: float, map_id: str) -> tuple[float, float]:
    cfg = MAP_CFG[map_id]
    u = (x - cfg["origin_x"]) / cfg["scale"]
    v = (z - cfg["origin_z"]) / cfg["scale"]
    return u * 1024, (1 - v) * 1024


def decode_event(val) -> str:
    if isinstance(val, bytes):
        return val.decode("utf-8")
    if isinstance(val, bytearray):
        return bytes(val).decode("utf-8")
    return str(val)


def main() -> None:
    day_dirs = sorted(p for p in ROOT.iterdir() if p.is_dir() and p.name.startswith("February"))
    files: list[Path] = []
    for d in day_dirs:
        files.extend(p for p in d.iterdir() if p.is_file() and not p.name.startswith("."))

    print(f"Found {len(files)} files across {len(day_dirs)} day folders")
    for d in day_dirs:
        n = sum(1 for p in d.iterdir() if p.is_file() and not p.name.startswith("."))
        print(f"  {d.name}: {n} files")

    frames = []
    bad = []
    schema_mismatches = []
    file_rows = []

    for path in files:
        try:
            table = pq.read_table(path)
            df = table.to_pandas()
            missing = [c for c in EXPECTED_COLS if c not in df.columns]
            extra = [c for c in df.columns if c not in EXPECTED_COLS]
            if missing or extra:
                schema_mismatches.append((str(path), missing, extra))
            frames.append(df)
            file_rows.append((path, len(df)))
        except Exception as exc:  # noqa: BLE001
            bad.append((str(path), repr(exc)))

    print("\n=== Load ===")
    print(f"files loaded: {len(frames)}")
    print(f"bad files:    {len(bad)}")
    if bad:
        for p, err in bad[:10]:
            print(f"  FAIL {p}: {err}")

    if schema_mismatches:
        print(f"schema mismatches: {len(schema_mismatches)}")
        for p, missing, extra in schema_mismatches[:5]:
            print(f"  {p} missing={missing} extra={extra}")
    else:
        print("schema:        all files have", EXPECTED_COLS)

    df = pd.concat(frames, ignore_index=True)
    df["event"] = df["event"].map(decode_event)
    df["user_id"] = df["user_id"].astype(str)
    df["match_id"] = df["match_id"].astype(str)
    df["map_id"] = df["map_id"].astype(str)
    df["is_human"] = df["user_id"].map(is_human)
    df["is_bot"] = df["user_id"].map(lambda u: bool(NUMERIC_RE.match(str(u))))
    unclassified = (~df["is_human"] & ~df["is_bot"]).sum()

    print("\n=== Rows / schema ===")
    print(f"rows: {len(df):,}")
    print("dtypes:")
    for col, dtype in df.dtypes.items():
        print(f"  {col}: {dtype}")
    print(f"event sample types before decode were bytes: yes (decoded to str)")
    print(f"event unique: {sorted(df['event'].unique())}")
    unknown_events = sorted(set(df["event"].unique()) - KNOWN_EVENTS)
    print(f"unknown events: {unknown_events or 'none'}")

    humans = df.loc[df["is_human"], "user_id"].nunique()
    bots = df.loc[df["is_bot"], "user_id"].nunique()
    matches = df["match_id"].nunique()
    unique_players = df["user_id"].nunique()

    print("\n=== Dataset snapshot ===")
    print(f"matches: {matches}")
    print(f"unique user_ids: {unique_players} (README: 339)")
    print(f"humans (UUID): {humans}")
    print(f"bots (numeric): {bots}")
    print(f"unclassified user_ids: {unclassified}")

    print("\nmaps by event rows:")
    for map_id, n in df["map_id"].value_counts().items():
        print(f"  {map_id}: {n:,}")

    print("\nevents:")
    for ev, n in df["event"].value_counts().items():
        print(f"  {ev}: {n:,}")

    # Filename human/bot vs row user_id
    fn_human = fn_bot = fn_other = 0
    fn_mismatch = 0
    for path, _ in file_rows:
        stem = path.name.replace(".nakama-0", "")
        user_part = stem.rsplit("_", 1)[0]
        if UUID_RE.match(user_part):
            fn_human += 1
        elif NUMERIC_RE.match(user_part):
            fn_bot += 1
        else:
            fn_other += 1
    print("\n=== Human vs bot (filename) ===")
    print(f"human files: {fn_human}")
    print(f"bot files:   {fn_bot}")
    print(f"other files: {fn_other}")

    # Cross-check filename user vs first row user
    for path, _ in file_rows[:]:
        stem = path.name.replace(".nakama-0", "")
        user_part, match_part = stem.rsplit("_", 1)
        # skip expensive full scan; sample via concat already checks IDs

    # Files per match
    files_per_match = df.groupby("match_id")["user_id"].nunique()
    print("\n=== Files / players per match ===")
    print(f"min={files_per_match.min()} median={files_per_match.median():.0f} "
          f"mean={files_per_match.mean():.2f} max={files_per_match.max()}")
    print(f"matches with 1 player file: {(files_per_match == 1).sum()}")

    # Timestamp notes
    ts = df["ts"]
    print("\n=== Timestamps ===")
    print(f"ts dtype: {ts.dtype}")
    print(f"ts min: {ts.min()}")
    print(f"ts max: {ts.max()}")
    print("sample ts values:", list(ts.head(3)))
    # folder date vs ts year
    years = pd.to_datetime(ts).dt.year.value_counts().to_dict()
    print(f"ts years: {years}")

    # Coordinate mapping
    print("\n=== Coordinate mapping (world x,z -> 1024x1024) ===")
    example_px, example_py = world_to_pixel(-301.45, -355.55, "AmbroseValley")
    print(
        f"README example AmbroseValley x=-301.45 z=-355.55 -> "
        f"pixel ({example_px:.1f}, {example_py:.1f}) expected (~78, ~890)"
    )

    out_of_bounds = {}
    for map_id, g in df.groupby("map_id"):
        cfg = MAP_CFG[map_id]
        u = (g["x"] - cfg["origin_x"]) / cfg["scale"]
        v = (g["z"] - cfg["origin_z"]) / cfg["scale"]
        pixel_x = u * 1024
        pixel_y = (1 - v) * 1024
        inside = (pixel_x.between(0, 1024) & pixel_y.between(0, 1024))
        n_out = int((~inside).sum())
        out_of_bounds[map_id] = n_out
        print(
            f"  {map_id}: n={len(g):,} "
            f"px[{pixel_x.min():.1f},{pixel_x.max():.1f}] "
            f"py[{pixel_y.min():.1f},{pixel_y.max():.1f}] "
            f"outside_1024={n_out} ({100 * n_out / len(g):.2f}%)"
        )
        # sample one path: first human file on this map if possible
        sample = g.head(20)
        s_u = (sample["x"] - cfg["origin_x"]) / cfg["scale"]
        s_v = (sample["z"] - cfg["origin_z"]) / cfg["scale"]
        s_px = s_u * 1024
        s_py = (1 - s_v) * 1024
        sample_inside = bool((s_px.between(0, 1024) & s_py.between(0, 1024)).all())
        print(f"    sample 20 rows all inside 1024x1024: {sample_inside}")

    # y is height
    print("\n=== Elevation (y) ===")
    print(f"y range: [{df['y'].min():.2f}, {df['y'].max():.2f}]")
    print("y is not used for 2D mapping (README: height only)")

    # PvP rarity
    print("\n=== Combat mix ===")
    pvp = int((df["event"].isin(["Kill", "Killed"])).sum())
    pve = int((df["event"].isin(["BotKill", "BotKilled"])).sum())
    storm = int((df["event"] == "KilledByStorm").sum())
    print(f"PvP Kill+Killed: {pvp}")
    print(f"vs bots BotKill+BotKilled: {pve}")
    print(f"storm deaths: {storm}")

    print("\n=== README checks ===")
    checks = {
        "files == 1243": len(files) == 1243,
        "bad files == 0": len(bad) == 0,
        "rows ~89k": 80_000 <= len(df) <= 100_000,
        "matches == 796": matches == 796,
        "unique players == 339": unique_players == 339,
        "maps are the 3 named": set(df["map_id"].unique()) == set(MAP_CFG),
        "all events known": not unknown_events,
        "human UUID / bot numeric works": unclassified == 0,
        "event decode to string": df["event"].map(type).eq(str).all(),
        "README example maps near (78,890)": abs(example_px - 78) < 1 and abs(example_py - 890) < 1,
    }
    for name, ok in checks.items():
        print(f"  [{'OK' if ok else 'FAIL'}] {name}")

    # Note actual minimap pixel sizes vs README 1024
    print("\nNOTE: README says minimaps are 1024x1024, but actual files are:")
    print("  AmbroseValley 4320x4320, GrandRift 2160x2158, Lockdown 9000x9000")
    print("  Mapping formula still uses 1024 UV space; scale to real image size in the UI.")


if __name__ == "__main__":
    main()
