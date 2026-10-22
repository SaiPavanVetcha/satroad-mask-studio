export type RoadClassKey =
  | "motorway"
  | "trunk"
  | "primary"
  | "secondary"
  | "tertiary"
  | "residential"
  | "service";

export interface RoadClassMetadata {
  key: RoadClassKey;
  label: string;
  color: string;
  width: number;
  visible: boolean;
  count: number;
  total_length_km: number;
}

export interface BoundingBox {
  min_lon: float;
  min_lat: float;
  max_lon: float;
  max_lat: float;
}

export type float = number;

export interface SatelliteItem {
  id: string;
  collection: string;
  datetime: string;
  cloud_cover: number | null;
  thumbnail_url: string | null;
  visual_url: string | null;
  bbox?: number[];
  properties: Record<string, unknown>;
}

export interface BhoonidhiResult {
  authenticated: boolean;
  status_message: string;
  total_found: number;
  items: SatelliteItem[];
}

export type JobStatus =
  | "PENDING"
  | "SEARCHING_BHOONIDHI"
  | "FETCHING_OSM"
  | "PROCESSING_ROADS"
  | "COMPLETED"
  | "FAILED";

export interface JobResult {
  job_id: string;
  status: JobStatus;
  progress_message: string;
  aoi_bbox: [number, number, number, number];
  aoi_geometry: GeoJSON.Polygon | GeoJSON.Geometry;
  area_km2: number;
  area_warning: string | null;
  total_roads: number;
  total_road_length_km: number;
  road_classes: Record<string, {
    key: string;
    label: string;
    count: number;
    total_length_km: number;
    color: string;
    width: number;
  }>;
  roads_geojson: GeoJSON.FeatureCollection | null;
  satellite_info: BhoonidhiResult | null;
  created_at: string;
  completed_at: string | null;
  execution_time_seconds: number | null;
  from_cache: boolean;
  error: string | null;
}

export interface HoveredRoadProperties {
  osm_id: string;
  name: string;
  highway: string;
  road_class: RoadClassKey;
  road_class_label: string;
  color: string;
  width: number;
  lanes: string;
  surface: string;
  maxspeed: string;
  oneway: string;
  bridge: string;
  tunnel: string;
  length_m: number;
  length_km: number;
  osm_url: string;
}

export interface HoveredRoadState {
  properties: HoveredRoadProperties;
  x: number;
  y: number;
}
