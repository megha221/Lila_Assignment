import { useEffect, useMemo, useRef, useState } from "react";
import { loadCatalog, loadHeatmaps, loadMatch } from "./api";
import { combatCount, fmtDate, fmtTime, matchLabel } from "./format";
import { MapCanvas } from "./MapCanvas";
import type { Catalog, CatalogMatch, Heatmaps, Match, Overlay } from "./types";

const SPEEDS = [1, 2, 4, 8, 16];

function filterMatches(catalog: Catalog, map: string, date: string): CatalogMatch[] {
  return catalog.matches.filter((m) => m.map === map && (date === "" || m.date === date));
}

export function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [heatmaps, setHeatmaps] = useState<Heatmaps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapId, setMapId] = useState("");
  const [date, setDate] = useState("");
  const [matchId, setMatchId] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(8);
  const [overlay, setOverlay] = useState<Overlay>("off");
  const [showPaths, setShowPaths] = useState(true);
  const [showBots, setShowBots] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);

  useEffect(() => {
    Promise.all([loadCatalog(), loadHeatmaps()])
      .then(([cat, heat]) => {
        setCatalog(cat);
        setHeatmaps(heat);
        const def = cat.matches.find((m) => m.id === cat.defaultMatch) ?? cat.matches[0];
        setMapId(def.map);
        setMatchId(def.id);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(
    () => (catalog && mapId ? filterMatches(catalog, mapId, date) : []),
    [catalog, mapId, date],
  );
  const meta = filtered.find((m) => m.id === matchId) ?? catalog?.matches.find((m) => m.id === matchId);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    loadMatch(matchId)
      .then((m) => {
        if (cancelled) return;
        setMatch(m);
        setTime(m.t1);
        setPlaying(false);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  useEffect(() => {
    if (!filtered.length) return;
    if (!filtered.some((m) => m.id === matchId)) setMatchId(filtered[0].id);
  }, [filtered, matchId]);

  const speedRef = useRef(speed);
  speedRef.current = speed;
  const timeRef = useRef(time);
  timeRef.current = time;
  const matchRef = useRef(match);
  matchRef.current = match;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const t1 = match?.t1 ?? 0;

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) * speedRef.current;
      last = now;
      const cap = matchRef.current?.t1 ?? 0;
      const next = Math.min(cap, timeRef.current + dt);
      timeRef.current = next;
      setTime(next);
      if (next >= cap) setPlaying(false);
    }, 50);
    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      e.preventDefault();
      const m = matchRef.current;
      if (!m) return;
      if (playingRef.current) {
        setPlaying(false);
        return;
      }
      if (timeRef.current >= m.t1) {
        timeRef.current = 0;
        setTime(0);
      }
      setPlaying(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function togglePlay() {
    if (!match) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    if (time >= match.t1) {
      timeRef.current = 0;
      setTime(0);
    }
    setPlaying(true);
  }

  function pickMap(next: string) {
    if (!catalog) return;
    setMapId(next);
    setOverlay("off");
    const nextList = filterMatches(catalog, next, date);
    if (nextList[0]) setMatchId(nextList[0].id);
  }

  function pickDate(next: string) {
    if (!catalog) return;
    setDate(next);
    const nextList = filterMatches(catalog, mapId, next);
    if (nextList[0] && !nextList.some((m) => m.id === matchId)) setMatchId(nextList[0].id);
  }

  function stepMatch(dir: number) {
    const i = filtered.findIndex((m) => m.id === matchId);
    const next = filtered[i + dir];
    if (next) setMatchId(next.id);
  }

  if (error) {
    return (
      <div className="boot">
        <p>Could not load data.</p>
        <p className="muted">{error}</p>
      </div>
    );
  }
  if (!catalog || !match || !meta) {
    return (
      <div className="boot">
        <p>Loading journeys…</p>
      </div>
    );
  }

  const n = meta.n;

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="kicker">LILA BLACK · Level design</p>
          <h1>Player Journeys</h1>
        </div>
        <p className="top-map">{catalog.maps[mapId].label}</p>
      </header>

      <main className="stage">
        <MapCanvas
          catalog={catalog}
          match={match}
          heatmaps={heatmaps}
          overlay={overlay}
          time={time}
          playing={playing}
          showPaths={showPaths}
          showBots={showBots}
          showEvents={showEvents}
        />
      </main>

      <aside className="side">
        <section>
          <h2>Filter</h2>
          <label>
            Map
            <select value={mapId} onChange={(e) => pickMap(e.target.value)}>
              {Object.entries(catalog.maps).map(([id, m]) => (
                <option key={id} value={id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <select value={date} onChange={(e) => pickDate(e.target.value)}>
              <option value="">All days</option>
              {catalog.dates.map((d) => (
                <option key={d} value={d}>
                  {fmtDate(d)} 2026
                </option>
              ))}
            </select>
          </label>
          <label>
            Match
            <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
              {filtered.map((m) => (
                <option key={m.id} value={m.id}>
                  {matchLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <div className="row-btns">
            <button type="button" onClick={() => stepMatch(-1)} disabled={filtered[0]?.id === matchId}>
              Prev
            </button>
            <button
              type="button"
              onClick={() => stepMatch(1)}
              disabled={filtered[filtered.length - 1]?.id === matchId}
            >
              Next
            </button>
            <span className="muted">
              {filtered.findIndex((m) => m.id === matchId) + 1} / {filtered.length}
            </span>
          </div>
        </section>

        <section>
          <h2>This match</h2>
          <ul className="stats">
            <li>
              <b>{meta.humans}</b> {meta.humans === 1 ? "human" : "humans"} · <b>{meta.bots}</b>{" "}
              {meta.bots === 1 ? "bot" : "bots"}
            </li>
            <li>
              {fmtDate(meta.date)} · {fmtTime(meta.t1)} recorded
            </li>
            <li>
              Loot <b>{n.loot ?? 0}</b>
            </li>
            <li>
              Bot kills <b>{n.botKill ?? 0}</b> · killed by bots <b>{n.botDeath ?? 0}</b>
            </li>
            <li>
              PvP kills <b>{n.kill ?? 0}</b> · deaths <b>{n.death ?? 0}</b>
            </li>
            <li>
              Storm deaths <b>{n.storm ?? 0}</b>
            </li>
          </ul>
          {combatCount(n) === 0 && <p className="note">No combat in this recording — mostly movement and loot.</p>}
          {meta.humans + meta.bots === 1 && (
            <p className="note">Only one player file exists for this match, so the timeline will look sparse.</p>
          )}
        </section>

        <section>
          <h2>Overlays</h2>
          <div className="seg">
            {(["off", "traffic", "kills", "deaths"] as Overlay[]).map((key) => (
              <button
                key={key}
                type="button"
                className={overlay === key ? "on" : ""}
                onClick={() => setOverlay(key)}
              >
                {key === "off" ? "Off" : key === "traffic" ? "Traffic" : key === "kills" ? "Kill zones" : "Death zones"}
              </button>
            ))}
          </div>
          <p className="note">Heatmaps use all days on this map, not only the selected match.</p>
        </section>

        <section>
          <h2>Layers</h2>
          <label className="check">
            <input type="checkbox" checked={showPaths} onChange={(e) => setShowPaths(e.target.checked)} />
            Paths
          </label>
          <label className="check">
            <input type="checkbox" checked={showBots} onChange={(e) => setShowBots(e.target.checked)} />
            Bots
          </label>
          <label className="check">
            <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} />
            Events
          </label>
        </section>

        <section className="legend">
          <button type="button" className="legend-toggle" onClick={() => setLegendOpen((v) => !v)}>
            Legend {legendOpen ? "–" : "+"}
          </button>
          {legendOpen && (
            <ul>
              <li>
                <i className="swatch path-h" /> Human path
              </li>
              <li>
                <i className="swatch path-b" /> Bot path
              </li>
              <li>
                <i className="swatch loot" /> Loot
              </li>
              <li>
                <i className="swatch kill" /> Kill / bot kill
              </li>
              <li>
                <i className="swatch death" /> Death / killed by bot
              </li>
              <li>
                <i className="swatch storm" /> Storm death
              </li>
              <li>
                <i className="swatch live" /> Live position
              </li>
              <li>
                <i className="swatch end" /> Last position
              </li>
            </ul>
          )}
        </section>
      </aside>

      <footer className="transport">
        <button type="button" className="play" onClick={togglePlay}>
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(1, t1)}
          step={1}
          value={Math.min(Math.round(time), t1)}
          onChange={(e) => {
            setPlaying(false);
            setTime(Number(e.target.value));
          }}
        />
        <span className="clock">
          {fmtTime(time)} / {fmtTime(t1)}
        </span>
        <label className="speed">
          Speed
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setTime(0);
          }}
        >
          Reset
        </button>
      </footer>
    </div>
  );
}
