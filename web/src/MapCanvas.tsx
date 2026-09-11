import { useEffect, useRef, useState } from "react";
import { asset } from "./api";
import { drawMatch, hitTest, type DrawState, type HoverInfo } from "./draw";
import { eventLabel, fmtTime } from "./format";
import type { Catalog, Heatmaps, Match, Overlay } from "./types";

const images = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = images.get(src);
  if (hit && hit.complete) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      images.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`image ${src}`));
    img.src = src;
  });
}

type Props = {
  catalog: Catalog;
  match: Match;
  heatmaps: Heatmaps | null;
  overlay: Overlay;
  time: number;
  playing: boolean;
  showPaths: boolean;
  showBots: boolean;
  showEvents: boolean;
};

export function MapCanvas({
  catalog,
  match,
  heatmaps,
  overlay,
  time,
  playing,
  showPaths,
  showBots,
  showEvents,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [cssSize, setCssSize] = useState(0);

  useEffect(() => {
    const src = asset(catalog.maps[match.map].image);
    let cancelled = false;
    loadImage(src).then((img) => {
      if (!cancelled) setMapImage(img);
    });
    return () => {
      cancelled = true;
    };
  }, [catalog, match.map]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      setCssSize(Math.max(120, Math.floor(Math.min(r.width, r.height))));
    };
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(wrap);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapImage || cssSize <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(cssSize * dpr);
    canvas.height = Math.floor(cssSize * dpr);
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const state: DrawState = {
      match,
      mapImage,
      heatmaps,
      overlay,
      time,
      showPaths,
      showBots,
      showEvents,
      playing,
    };
    drawMatch(ctx, cssSize, dpr, state);
  }, [mapImage, cssSize, match, heatmaps, overlay, time, showPaths, showBots, showEvents, playing]);

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const map = mapImage;
    if (!canvas || !map) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const state: DrawState = {
      match,
      mapImage: map,
      heatmaps,
      overlay,
      time,
      showPaths,
      showBots,
      showEvents,
      playing,
    };
    setHover(hitTest(state, cssSize, mx, my));
  }

  return (
    <div className="map-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      />
      {hover && (
        <div className="tooltip" style={{ left: hover.x + 14, top: hover.y - 10 }}>
          <strong>{eventLabel(hover.kind)}</strong>
          <span>
            {fmtTime(hover.t)}
            {hover.bot ? " · bot" : " · human"}
          </span>
        </div>
      )}
    </div>
  );
}
