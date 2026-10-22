from typing import List, Literal, Optional, Union, Dict, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

class GeoJSONPolygonGeometry(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[List[float]]]

class GeoJSONFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: GeoJSONPolygonGeometry
    properties: Optional[Dict[str, Any]] = None

class AOIRequest(BaseModel):
    # AOI can be supplied as a GeoJSON Feature, Polygon geometry, or bbox [min_lon, min_lat, max_lon, max_lat]
    geometry: Optional[Union[GeoJSONPolygonGeometry, GeoJSONFeature, Dict[str, Any]]] = None
    bbox: Optional[List[float]] = None  # [min_lon, min_lat, max_lon, max_lat]
    
    # Date range for satellite imagery
    start_date: str = Field(..., description="Start date in YYYY-MM-DD")
    end_date: str = Field(..., description="End date in YYYY-MM-DD")
    
    # Optical sensors selection
    sensors: List[str] = Field(
        default=["Sentinel-2", "Landsat-8/9"],
        description="Sensors to query from Bhoonidhi STAC"
    )
    
    # Cloud cover limit
    max_cloud_cover: float = Field(default=20.0, ge=0.0, le=100.0)
    
    # Optional road classes to filter
    road_classes: Optional[List[str]] = Field(
        default=[
            "motorway",
            "trunk",
            "primary",
            "secondary",
            "tertiary",
            "residential",
            "service"
        ]
    )
