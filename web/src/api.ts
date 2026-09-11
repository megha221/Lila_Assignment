import type { Catalog, Heatmaps, Match } from "./types";

export function asset(path: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}${path.replace(/^\//, "")}`;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(asset(path));
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const loadCatalog = () => getJson<Catalog>("data/catalog.json");
export const loadHeatmaps = () => getJson<Heatmaps>("data/heatmaps.json");
export const loadMatch = (id: string) => getJson<Match>(`data/matches/${id}.json`);
