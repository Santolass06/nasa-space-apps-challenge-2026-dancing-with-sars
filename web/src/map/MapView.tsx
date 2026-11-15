import {
  AttributionControl,
  Map,
  NavigationControl,
} from "maplibre-gl";
import { useEffect, useRef } from "react";

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
