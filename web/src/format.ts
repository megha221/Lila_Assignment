import type { CatalogMatch, EventKind, MatchCounts } from "./types";

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtDate(iso: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, month, day] = iso.split("-");
  return `${months[Number(month) - 1]} ${Number(day)}`;
}

export function combatCount(n: MatchCounts): number {
  return (n.kill ?? 0) + (n.death ?? 0) + (n.botKill ?? 0) + (n.botDeath ?? 0) + (n.storm ?? 0);
}

export function matchLabel(m: CatalogMatch): string {
  return `${fmtDate(m.date)} · ${m.humans}H ${m.bots}B · ${fmtTime(m.t1)} · ${combatCount(m.n)} fights`;
}

export function eventLabel(kind: EventKind): string {
  switch (kind) {
    case "loot":
      return "Loot";
    case "kill":
      return "Player kill";
    case "death":
      return "Player death";
    case "botKill":
      return "Bot kill";
    case "botDeath":
      return "Killed by bot";
    case "storm":
      return "Storm death";
  }
}
