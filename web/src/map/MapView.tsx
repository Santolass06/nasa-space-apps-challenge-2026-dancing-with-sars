import {
  AttributionControl,
  Map,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import { useEffect, useRef } from "react";

// The worker is copied to public/maplibre/ by scripts/copy-maplibre-worker.mjs
// (see the note there: Vite cannot see maplibre's runtime worker URL).
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`);

// Vouzela, the fire's starting point (the grid bounds come from the manifest in C1).
export const VOUZELA: [number, number] = [-8.1117, 40.7237];

// OpenFreeMap's dark style: free, no API key, no request limit (openfreemap.org),
// and its attribution travels in the tile JSON, so MapLibre shows it by itself.
// (CARTO's basemaps now need an API key for the free tier — their 2026 terms.)
// Note: maplibre-gl 6.18 silently ignores a style object passed to the
// constructor (getStyle() stays undefined while a URL style loads), so the
// basemap comes as a URL.
const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

type Props = {
  /** Called once the map has loaded, so the caller can add layers (C1). */
  onReady?: (map: Map) => void;
  className?: string;
  /**
   * Cooperative gestures (#82): the wheel scrolls the page and Ctrl/⌘ + wheel
   * zooms; on touch, one finger scrolls the page and two fingers move the map.
   * Off only for the expanded explorer, where the map owns the viewport and a
   * plain wheel is expected to zoom.
   */
  cooperativeGestures?: boolean;
};

/** The MapLibre map, centred on Vouzela. Layers are added by the caller (C1). */
export default function MapView({ onReady, className, cooperativeGestures = true }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    if (!container.current || mapRef.current) {
      return;
    }
    const map = new Map({
      container: container.current,
      style: BASEMAP_STYLE,
      center: VOUZELA,
      zoom: 10.5,
      attributionControl: false,
      // Render at least at 2x and let the browser scale down: labels and edges
      // come out smoother on ordinary (1x) screens.
      pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
      cooperativeGestures,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");
    // "style.load" fires when the style is parsed — before the first tiles are
    // drawn — which is when our own layers can be added.
    map.once("style.load", () => readyRef.current?.(map));
    mapRef.current = map;
    // Handy in the browser console and in the smoke checks (C1 uses the API, not this).
    (window as unknown as { __map?: Map }).__map = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Rebuilt when the gesture mode changes (the expanded explorer). Recreating is
    // the honest way: MapLibre takes cooperativeGestures at construction only, and
    // each caller re-adds its layers in onReady.
  }, [cooperativeGestures]);

  return <div ref={container} className={className ?? "map"} />;
}
