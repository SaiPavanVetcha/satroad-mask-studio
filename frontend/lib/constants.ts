import { RoadClassKey, RoadClassMetadata } from "./types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const DEFAULT_ROAD_CLASSES: Record<RoadClassKey, RoadClassMetadata> = {
  motorway: {
    key: "motorway",
    label: "Motorway / Highway",
    color: "#f43f5e", // Rose Red
    width: 4.5,
    visible: true,
    count: 0,
    total_length_km: 0
  },
  trunk: {
    key: "trunk",
    label: "Trunk Roads",
    color: "#f97316", // Orange
    width: 4.0,
    visible: true,
    count: 0,
    total_length_km: 0
  },
  primary: {
    key: "primary",
    label: "Primary Roads",
    color: "#eab308", // Yellow
    width: 3.4,
    visible: true,
    count: 0,
    total_length_km: 0
  },
  secondary: {
    key: "secondary",
    label: "Secondary Roads",
    color: "#10b981", // Emerald Green
    width: 2.8,
    visible: true,
    count: 0,
    total_length_km: 0
  },
  tertiary: {
    key: "tertiary",
    label: "Tertiary Roads",
    color: "#06b6d4", // Cyan
    width: 2.2,
    visible: true,
    count: 0,
    total_length_km: 0
  },
  residential: {
    key: "residential",
    label: "Residential / Local",
    color: "#818cf8", // Indigo
    width: 1.8,
    visible: true,
    count: 0,
    total_length_km: 0
  },
  service: {
    key: "service",
    label: "Service / Track / Path",
    color: "#94a3b8", // Slate
    width: 1.2,
    visible: true,
    count: 0,
    total_length_km: 0
  }
};

export const STYLE_PRESETS: Record<string, Record<RoadClassKey, { color: string; width: number }>> = {
  "Vibrant Neon": {
    motorway: { color: "#ff007f", width: 4.5 },
    trunk: { color: "#ff7700", width: 4.0 },
    primary: { color: "#ffee00", width: 3.5 },
    secondary: { color: "#00ff99", width: 2.8 },
    tertiary: { color: "#00d4ff", width: 2.2 },
    residential: { color: "#b05bff", width: 1.8 },
    service: { color: "#64748b", width: 1.2 }
  },
  "Satellite GIS": {
    motorway: { color: "#e11d48", width: 4.0 },
    trunk: { color: "#ea580c", width: 3.6 },
    primary: { color: "#facc15", width: 3.0 },
    secondary: { color: "#4ade80", width: 2.5 },
    tertiary: { color: "#38bdf8", width: 2.0 },
    residential: { color: "#ffffff", width: 1.5 },
    service: { color: "#94a3b8", width: 1.0 }
  },
  "Night Vision (Matrix)": {
    motorway: { color: "#00ff66", width: 4.5 },
    trunk: { color: "#10b981", width: 4.0 },
    primary: { color: "#34d399", width: 3.5 },
    secondary: { color: "#6ee7b7", width: 2.8 },
    tertiary: { color: "#a7f3d0", width: 2.2 },
    residential: { color: "#059669", width: 1.6 },
    service: { color: "#047857", width: 1.0 }
  },
  "Blueprint": {
    motorway: { color: "#ffffff", width: 4.5 },
    trunk: { color: "#93c5fd", width: 3.8 },
    primary: { color: "#60a5fa", width: 3.2 },
    secondary: { color: "#3b82f6", width: 2.6 },
    tertiary: { color: "#2563eb", width: 2.0 },
    residential: { color: "#1d4ed8", width: 1.6 },
    service: { color: "#1e3a8a", width: 1.0 }
  }
};

export const SENSORS_LIST = [
  { id: "Sentinel-2", name: "Sentinel-2 (MSI)", resolution: "10m", band: "Optical / NIR", badge: "Open Access" },
  { id: "Landsat-8/9", name: "Landsat-8/9 (OLI)", resolution: "30m", band: "Optical / SWIR", badge: "Open Access" },
  { id: "ResourceSat LISS-III", name: "ResourceSat-2A (LISS-III)", resolution: "23.5m", band: "Multi-Spectral", badge: "Bhoonidhi" },
  { id: "ResourceSat LISS-IV", name: "ResourceSat-2A (LISS-IV)", resolution: "5.8m", band: "High-Resolution", badge: "Bhoonidhi" }
];

export const PRESET_AOIS = [
  {
    name: "Bengaluru Tech Hub (Whitefield)",
    description: "Dense road grid with arterial corridors and tech parks",
    center: [77.72, 12.98],
    zoom: 14,
    bbox: [77.705, 12.965, 77.745, 12.995]
  },
  {
    name: "New Delhi Central (Connaught Place)",
    description: "Radial concentric urban highway network",
    center: [77.219, 28.632],
    zoom: 14,
    bbox: [77.205, 28.620, 77.235, 28.645]
  },
  {
    name: "Mumbai Bandra-Kurla Complex",
    description: "Coastal highways, sea links and arterial flyovers",
    center: [72.868, 19.065],
    zoom: 14,
    bbox: [72.845, 19.050, 72.885, 19.080]
  },
  {
    name: "Hyderabad HITEC City",
    description: "Outer ring road interchange & modern IT corridor",
    center: [78.375, 17.445],
    zoom: 14,
    bbox: [78.355, 17.430, 78.395, 17.460]
  },
  {
    name: "Paris Arc de Triomphe (France)",
    description: "Famous star roundabout with 12 radiating avenues",
    center: [2.295, 48.873],
    zoom: 15,
    bbox: [2.285, 48.865, 2.305, 48.882]
  }
];

export const MAP_STYLES = [
  {
    id: "carto-dark",
    name: "Dark Matter",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    previewColor: "#111827"
  },
  {
    id: "carto-positron",
    name: "Positron Light",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    previewColor: "#f3f4f6"
  },
  {
    id: "carto-voyager",
    name: "Voyager Detailed",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    previewColor: "#0284c7"
  }
];

export const SATELLITE_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
