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

// CARTO's dark basemap style. Note: maplibre-gl 6.18 silently ignores a style
// object passed to the constructor (verified in the browser: getStyle() stays
// undefined while a URL style loads), so the basemap comes as a URL.
const BASEMAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type Props = {
  /** Called once the map has loaded, so the caller can add layers (C1). */
  onReady?: (map: Map) => void;
  className?: string;
};

/** The MapLibre map, centred on Vouzela. Layers are added by the caller (C1). */
export default function MapView({ onReady, className }: Props) {
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
  }, []);

  return <div ref={container} className={className ?? "map"} />;
}
