export type EventKind = "loot" | "kill" | "death" | "botKill" | "botDeath" | "storm";

export type Point = [t: number, u: number, v: number];
export type Marker = [t: number, u: number, v: number, kind: EventKind];

export type Player = {
  id: string;
  bot: boolean;
  path: Point[];
  events: Marker[];
};

export type Match = {
  id: string;
  map: string;
  date: string;
  t0: number;
  t1: number;
  players: Player[];
};

export type MatchCounts = Partial<Record<"path" | EventKind, number>>;

export type CatalogMatch = {
  id: string;
  map: string;
  date: string;
  humans: number;
  bots: number;
  t1: number;
  n: MatchCounts;
};

export type Catalog = {
  defaultMatch: string;
  maps: Record<string, { label: string; image: string }>;
  dates: string[];
  matches: CatalogMatch[];
};

export type HeatLayer = "traffic" | "kills" | "deaths";

export type Heatmaps = {
  size: number;
  maps: Record<string, Record<HeatLayer, number[]>>;
};

export type Overlay = "off" | HeatLayer;
