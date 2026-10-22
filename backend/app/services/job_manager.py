import asyncio
import uuid
import time
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from shapely.geometry import shape, box, mapping
from shapely.ops import transform
import pyproj

from ..config import settings
from ..models.aoi import AOIRequest
from ..models.job import JobResult, JobStatus, BhoonidhiResult
from .osm import OSMService
from .bhoonidhi import bhoonidhi_service
from .cache import cache_manager

def calculate_polygon_area_km2(geom_dict: Dict[str, Any]) -> float:
    """Calculate geographic area of a GeoJSON polygon in square kilometers."""
    try:
        geom = shape(geom_dict)
        # Geodesic area using pyproj
        geod = pyproj.Geod(ellps="WGS84")
        area_m2, _ = geod.geometry_area_perimeter(geom)
        return round(abs(area_m2) / 1_000_000.0, 3)
    except Exception:
        # Fallback approximation
        bounds = shape(geom_dict).bounds
        deg_w = bounds[2] - bounds[0]
        deg_h = bounds[3] - bounds[1]
        # ~111 km per degree
        return round(deg_w * 111.0 * deg_h * 111.0 * 0.8, 3)

class JobManager:
    def __init__(self):
        self._jobs: Dict[str, JobResult] = {}

    def get_job(self, job_id: str) -> Optional[JobResult]:
        # Check in memory
        if job_id in self._jobs:
            return self._jobs[job_id]

        # Check disk
        job_file = settings.STORAGE_DIR / "jobs" / f"{job_id}.json"
        if job_file.exists():
            try:
                with open(job_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    job = JobResult(**data)
                    self._jobs[job_id] = job
                    return job
            except Exception as e:
                print(f"[JobManager] Error reading job {job_id} from disk: {e}")
                return None
        return None

    def save_job(self, job: JobResult):
        self._jobs[job.job_id] = job
        jobs_dir = settings.STORAGE_DIR / "jobs"
        jobs_dir.mkdir(parents=True, exist_ok=True)
        job_file = jobs_dir / f"{job.job_id}.json"
        try:
            with open(job_file, "w", encoding="utf-8") as f:
                f.write(job.model_dump_json())
        except Exception as e:
            print(f"[JobManager] Failed to persist job {job.job_id}: {e}")

    async def create_and_start_job(self, req: AOIRequest) -> JobResult:
        """Create job, check cache, or schedule background worker."""
        # 1. Resolve geometry and bbox
        if req.geometry:
            geom_dict = req.geometry if isinstance(req.geometry, dict) else req.geometry.model_dump()
            if "geometry" in geom_dict:
                geom_dict = geom_dict["geometry"]
            s = shape(geom_dict)
            bbox = list(s.bounds)  # [min_lon, min_lat, max_lon, max_lat]
        elif req.bbox and len(req.bbox) == 4:
            bbox = req.bbox
            geom_dict = mapping(box(*bbox))
        else:
            raise ValueError("Must provide either 'geometry' or 'bbox' for the AOI.")

        # Area validation and warning
        width_deg = bbox[2] - bbox[0]
        height_deg = bbox[3] - bbox[1]
        area_deg2 = width_deg * height_deg
        area_warning = None
        if area_deg2 > settings.MAX_AOI_AREA_DEG2:
            area_warning = (
                f"AOI is relatively large ({round(area_deg2, 3)} deg² > {settings.MAX_AOI_AREA_DEG2} threshold). "
                "Fetching high-density road networks may take longer. Consider a smaller bounding box if queries time out."
            )

        area_km2 = calculate_polygon_area_km2(geom_dict)

        # 2. Check cache
        cache_key = cache_manager.generate_key(
            geom_dict, req.start_date, req.end_date, req.sensors, req.road_classes or []
        )
        cached_data = cache_manager.get(cache_key)
        if cached_data:
            cached_job = JobResult(**cached_data)
            cached_job.from_cache = True
            # Store also under new query job ID if needed or return cached
            self._jobs[cached_job.job_id] = cached_job
            return cached_job

        # 3. Create fresh job
        job_id = str(uuid.uuid4())[:8]
        now_str = datetime.now(timezone.utc).isoformat()
        job = JobResult(
            job_id=job_id,
            status=JobStatus.PENDING,
            progress_message="Job initialized. Starting background workers...",
            aoi_bbox=bbox,
            aoi_geometry=geom_dict,
            area_km2=area_km2,
            area_warning=area_warning,
            created_at=now_str
        )
        self.save_job(job)

        # 4. Fire background execution
        asyncio.create_task(self._run_job_pipeline(job_id, req, geom_dict, bbox, cache_key))

        return job

    async def _run_job_pipeline(
        self,
        job_id: str,
        req: AOIRequest,
        geom_dict: Dict[str, Any],
        bbox: List[float],
        cache_key: str
    ):
        start_time = time.time()
        job = self.get_job(job_id)
        if not job:
            return

        try:
            # Stage 1: Searching Bhoonidhi & Fetching OSM in PARALLEL
            job.status = JobStatus.FETCHING_OSM
            job.progress_message = "Searching Bhoonidhi STAC and querying OSM road network concurrently..."
            self.save_job(job)

            bhoonidhi_task = asyncio.create_task(
                bhoonidhi_service.search(
                    bbox=bbox,
                    start_date=req.start_date,
                    end_date=req.end_date,
                    sensors=req.sensors,
                    max_cloud_cover=req.max_cloud_cover
                )
            )

            osm_task = asyncio.create_task(
                OSMService.fetch_roads(
                    bbox=bbox,
                    aoi_polygon=geom_dict,
                    road_classes=req.road_classes
                )
            )

            # Wait for both tasks concurrently
            bhoonidhi_res, osm_res = await asyncio.gather(
                bhoonidhi_task, osm_task, return_exceptions=True
            )

            # Process Bhoonidhi results
            if isinstance(bhoonidhi_res, Exception):
                print(f"[Pipeline] Bhoonidhi error: {bhoonidhi_res}")
                job.satellite_info = BhoonidhiResult(
                    authenticated=False,
                    status_message=f"Bhoonidhi API issue: {str(bhoonidhi_res)}",
                    total_found=0,
                    items=[]
                )
            else:
                job.satellite_info = bhoonidhi_res

            # Process OSM results
            if isinstance(osm_res, Exception):
                raise RuntimeError(f"OSM Road query failed: {str(osm_res)}")

            geojson_collection, class_stats, total_roads, total_length_km = osm_res

            # Stage 2: Processing and Road Classification
            job.status = JobStatus.PROCESSING_ROADS
            job.progress_message = f"Processing {total_roads} road segments and classifying by hierarchy..."
            self.save_job(job)

            # Assign results
            job.total_roads = total_roads
            job.total_road_length_km = total_length_km
            job.road_classes = class_stats
            job.roads_geojson = geojson_collection

            # Complete job
            elapsed = round(time.time() - start_time, 2)
            job.status = JobStatus.COMPLETED
            job.progress_message = f"Ready! Successfully classified {total_roads} roads ({total_length_km} km) in {elapsed}s."
            job.completed_at = datetime.now(timezone.utc).isoformat()
            job.execution_time_seconds = elapsed

            self.save_job(job)

            # Cache the completed result
            cache_manager.set(cache_key, job.model_dump())

        except Exception as e:
            elapsed = round(time.time() - start_time, 2)
            job.status = JobStatus.FAILED
            job.progress_message = f"Failed: {str(e)}"
            job.error = str(e)
            job.completed_at = datetime.now(timezone.utc).isoformat()
            job.execution_time_seconds = elapsed
            self.save_job(job)

job_manager = JobManager()
