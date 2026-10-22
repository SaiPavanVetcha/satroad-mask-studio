import { API_BASE_URL } from "./constants";
import { JobResult } from "./types";

export interface SubmitJobPayload {
  geometry?: GeoJSON.Polygon | GeoJSON.Geometry | Record<string, unknown> | null;
  bbox?: number[] | null;
  start_date: string;
  end_date: string;
  sensors: string[];
  max_cloud_cover: number;
  road_classes?: string[];
}

export interface JobCreateResponse {
  job_id: string;
  status: string;
  progress_message: string;
  from_cache: boolean;
}

export async function submitJob(payload: SubmitJobPayload): Promise<JobCreateResponse> {
  const res = await fetch(`${API_BASE_URL}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown submission error" }));
    throw new Error(err.detail || `Server responded with ${res.status}`);
  }

  return res.json();
}

export async function fetchJob(jobId: string): Promise<JobResult> {
  const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Job fetch error" }));
    throw new Error(err.detail || `Failed to fetch job ${jobId}`);
  }
  return res.json();
}

export async function checkBackendHealth(): Promise<{
  status: string;
  bhoonidhi_configured: boolean;
  overpass_url: string;
}> {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  if (!res.ok) {
    throw new Error("Backend not responding");
  }
  return res.json();
}

export function getGeoJsonDownloadUrl(jobId: string): string {
  return `${API_BASE_URL}/api/jobs/${jobId}/roads.geojson`;
}

export function getMaskDownloadUrl(jobId: string, binary: boolean = false): string {
  return `${API_BASE_URL}/api/jobs/${jobId}/mask.tif?binary=${binary}`;
}
