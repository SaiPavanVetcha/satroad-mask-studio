from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from .aoi import AOIRequest, BoundingBox

class JobStatus(str, Enum):
    PENDING = "PENDING"
    SEARCHING_BHOONIDHI = "SEARCHING_BHOONIDHI"
    FETCHING_OSM = "FETCHING_OSM"
    PROCESSING_ROADS = "PROCESSING_ROADS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class RoadClassInfo(BaseModel):
    key: str
    label: str
    count: int = 0
    total_length_km: float = 0.0
    color: str
    width: float

class SatelliteItem(BaseModel):
    id: str
    collection: str
    datetime: str
    cloud_cover: Optional[float] = None
    thumbnail_url: Optional[str] = None
    visual_url: Optional[str] = None
    bbox: Optional[List[float]] = None
    properties: Dict[str, Any] = Field(default_factory=dict)

class BhoonidhiResult(BaseModel):
    authenticated: bool
    status_message: str
    total_found: int = 0
    items: List[SatelliteItem] = Field(default_factory=list)

class JobResult(BaseModel):
    job_id: str
    status: JobStatus
    progress_message: str
    aoi_bbox: List[float]  # [min_lon, min_lat, max_lon, max_lat]
    aoi_geometry: Dict[str, Any]
    area_km2: float = 0.0
    area_warning: Optional[str] = None
    
    # Road extraction results
    total_roads: int = 0
    total_road_length_km: float = 0.0
    road_classes: Dict[str, RoadClassInfo] = Field(default_factory=dict)
    roads_geojson: Optional[Dict[str, Any]] = None  # GeoJSON FeatureCollection
    
    # Satellite results
    satellite_info: Optional[BhoonidhiResult] = None
    
    # Timing and cache info
    created_at: str
    completed_at: Optional[str] = None
    execution_time_seconds: Optional[float] = None
    from_cache: bool = False
    error: Optional[str] = None

class JobCreateResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress_message: str
    from_cache: bool = False
