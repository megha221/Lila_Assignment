import type { EventKind, HeatLayer, Heatmaps, Match, Player, Point } from "./types";

const HUMAN = ["#3EE0FF", "#7CFFB2", "#F5C542"];
const BOT = "rgba(214, 208, 190, 0.72)";

export type HoverInfo = {
  x: number;
  y: number;
  kind: EventKind;
  t: number;
  bot: boolean;
};

export type DrawState = {
  match: Match;
  mapImage: HTMLImageElement;
  heatmaps: Heatmaps | null;
  overlay: "off" | HeatLayer;
  time: number;
  showPaths: boolean;
  showBots: boolean;
  showEvents: boolean;
  playing: boolean;
};

export function positionAt(path: Point[], t: number): [number, number] | null {
  if (path.length === 0) return null;
  if (t <= path[0][0]) return [path[0][1], path[0][2]];
  const last = path[path.length - 1];
  if (t >= last[0]) return [last[1], last[2]];
  for (let i = 1; i < path.length; i++) {
    const b = path[i];
    if (t <= b[0]) {
      const a = path[i - 1];
      const span = Math.max(1, b[0] - a[0]);
      const k = (t - a[0]) / span;
      return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    }
  }
  return [last[1], last[2]];
}

function humanColor(index: number): string {
  return HUMAN[index % HUMAN.length];
}

function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, kind: EventKind, s: number) {
  ctx.beginPath();
  if (kind === "loot") {
    ctx.fillStyle = "#F0D44C";
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    return;
  }
  if (kind === "kill" || kind === "botKill") {
    ctx.fillStyle = kind === "kill" ? "#FF3B2F" : "#FF7A3A";
    ctx.moveTo(x, y - s * 1.25);
    ctx.lineTo(x + s * 1.05, y + s);
    ctx.lineTo(x - s * 1.05, y + s);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (kind === "death" || kind === "botDeath") {
    ctx.fillStyle = kind === "death" ? "#FF4D8D" : "#E07070";
    ctx.arc(x, y, s * 1.05, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = "#B57BFF";
  ctx.moveTo(x, y - s * 1.3);
  ctx.lineTo(x + s * 1.05, y);
  ctx.lineTo(x, y + s * 1.3);
  ctx.lineTo(x - s * 1.05, y);
  ctx.closePath();
  ctx.fill();
}

function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  sizeCss: number,
  layer: number[],
  grid: number,
  kind: HeatLayer,
) {
  const max = Math.max(1, ...layer);
  const cell = sizeCss / grid;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const v = layer[gy * grid + gx];
      if (!v) continue;
      const t = Math.pow(v / max, 0.5);
      const a = 0.12 + 0.72 * t;
      if (kind === "traffic") ctx.fillStyle = `rgba(255, 168, 36, ${a})`;
      else if (kind === "kills") ctx.fillStyle = `rgba(255, 56, 40, ${a})`;
      else ctx.fillStyle = `rgba(176, 82, 255, ${a})`;
      ctx.fillRect(gx * cell, gy * cell, cell + 0.5, cell + 0.5);
    }
  }
}

function visiblePlayers(match: Match, showBots: boolean): Player[] {
  return showBots ? match.players : match.players.filter((p) => !p.bot);
}

export function drawMatch(
  ctx: CanvasRenderingContext2D,
  sizeCss: number,
  dpr: number,
  state: DrawState,
) {
  const { match, mapImage, time } = state;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, sizeCss, sizeCss);
  ctx.drawImage(mapImage, 0, 0, sizeCss, sizeCss);

  if (state.overlay !== "off" && state.heatmaps) {
    const grid = state.heatmaps.maps[match.map];
    if (grid) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      drawHeatmap(ctx, sizeCss, grid[state.overlay], state.heatmaps.size, state.overlay);
      ctx.restore();
    }
  }

  const players = visiblePlayers(match, state.showBots);
  let humanIdx = 0;

  if (state.showPaths) {
    for (const player of players) {
      const color = player.bot ? BOT : humanColor(humanIdx);
      if (!player.bot) humanIdx += 1;
      const pts = player.path.filter((p) => p[0] <= time);
      const live = positionAt(player.path, time);
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = player.bot ? 1.6 : 2.8;
      ctx.setLineDash(player.bot ? [5, 4] : []);
      if (!player.bot) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      let started = false;
      for (const p of pts) {
        const x = p[1] * sizeCss;
        const y = p[2] * sizeCss;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      }
      if (live && pts.length) {
        ctx.lineTo(live[0] * sizeCss, live[1] * sizeCss);
      }
      ctx.stroke();
      ctx.restore();

      if (live) {
        const x = live[0] * sizeCss;
        const y = live[1] * sizeCss;
        ctx.beginPath();
        ctx.fillStyle = state.playing && time < match.t1 ? "#9CFF6A" : "#FF9A3A";
        ctx.arc(x, y, player.bot ? 3 : 4.2, 0, Math.PI * 2);
        ctx.fill();
        if (!player.bot) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = 1;
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  if (state.showEvents) {
    humanIdx = 0;
    for (const player of players) {
      if (!player.bot) humanIdx += 1;
      for (const ev of player.events) {
        if (ev[0] > time) continue;
        drawMarker(ctx, ev[1] * sizeCss, ev[2] * sizeCss, ev[3], 5);
      }
    }
  }
}

export function hitTest(state: DrawState, sizeCss: number, mx: number, my: number): HoverInfo | null {
  const players = visiblePlayers(state.match, state.showBots);
  if (!state.showEvents) return null;
  const r = 9;
  let best: HoverInfo | null = null;
  let bestD = r * r;
  for (const player of players) {
    for (const ev of player.events) {
      if (ev[0] > state.time) continue;
      const x = ev[1] * sizeCss;
      const y = ev[2] * sizeCss;
      const d = (x - mx) ** 2 + (y - my) ** 2;
      if (d <= bestD) {
        bestD = d;
        best = { x, y, kind: ev[3], t: ev[0], bot: player.bot };
      }
    }
  }
  return best;
}
