from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional

from ..models.aoi import AOIRequest
from ..models.job import JobResult, JobCreateResponse, JobStatus
from ..services.job_manager import job_manager
from ..services.raster_mask import raster_mask_service
from ..config import settings

router = APIRouter(prefix="/api", tags=["Jobs & Mask Studio"])

@router.get("/health")
async def health_check():
    """Health check and configuration inspection."""
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "bhoonidhi_configured": bool(settings.BHOONIDHI_USER_ID and settings.BHOONIDHI_PASSWORD),
        "overpass_url": settings.OVERPASS_URL,
        "storage_dir": str(settings.STORAGE_DIR)
    }

@router.post("/jobs", response_model=JobCreateResponse)
async def submit_aoi_job(request: AOIRequest):
    """
    Submit an Area of Interest (AOI) job.
    Returns immediately with job_id and initial progress status.
    """
    try:
        job = await job_manager.create_and_start_job(request)
        return JobCreateResponse(
            job_id=job.job_id,
            status=job.status,
            progress_message=job.progress_message,
            from_cache=job.from_cache
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit job: {str(e)}")

@router.get("/jobs/{job_id}", response_model=JobResult)
async def get_job_status(job_id: str):
    """
    Poll the status and progress of a submitted job.
    Once status is COMPLETED, contains road GeoJSON and satellite metadata.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return job

@router.get("/jobs/{job_id}/roads.geojson")
async def download_roads_geojson(job_id: str):
    """
    Download the extracted OSM road network as GeoJSON.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.COMPLETED or not job.roads_geojson:
        raise HTTPException(status_code=400, detail=f"Job not ready or no road data. Status: {job.status}")

    return JSONResponse(
        content=job.roads_geojson,
        headers={"Content-Disposition": f'attachment; filename="roads_{job_id}.geojson"'}
    )

@router.get("/jobs/{job_id}/mask.tif")
async def download_raster_mask(
    job_id: str,
    binary: bool = Query(False, description="If true, 1 for all roads. If false, multiclass values 1-7"),
    width: int = Query(1024, ge=256, le=4096),
    height: int = Query(1024, ge=256, le=4096)
):
    """
    Generate and download a georeferenced GeoTIFF road raster mask for model training.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.COMPLETED or not job.roads_geojson:
        raise HTTPException(status_code=400, detail="Job is not completed yet.")

    try:
        mask_path = raster_mask_service.generate_geotiff(
            job_id=job_id,
            bbox=job.aoi_bbox,
            roads_geojson=job.roads_geojson,
            width=width,
            height=height,
            binary=binary
        )
        return FileResponse(
            path=str(mask_path),
            filename=f"road_mask_{job_id}{'_binary' if binary else '_multiclass'}.tif",
            media_type="image/tiff"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate GeoTIFF mask: {str(e)}")
