import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.features import rasterize
from shapely.geometry import shape
from pathlib import Path
from typing import Dict, Any, List
from ..config import settings

ROAD_CLASS_VALUES = {
    "motorway": 1,
    "trunk": 2,
    "primary": 3,
    "secondary": 4,
    "tertiary": 5,
    "residential": 6,
    "service": 7
}

class RasterMaskService:
    @staticmethod
    def generate_geotiff(
        job_id: str,
        bbox: List[float],
        roads_geojson: Dict[str, Any],
        width: int = 1024,
        height: int = 1024,
        binary: bool = False
    ) -> Path:
        """
        Generate a georeferenced GeoTIFF mask for the AOI roads.
        bbox: [min_lon, min_lat, max_lon, max_lat]
        """
        output_dir = settings.STORAGE_DIR / "masks"
        output_dir.mkdir(parents=True, exist_ok=True)
        filename = f"mask_{job_id}{'_binary' if binary else '_multiclass'}.tif"
        output_path = output_dir / filename

        min_lon, min_lat, max_lon, max_lat = bbox
        
        # Calculate affine transform from bounds to pixel grid (EPSG:4326)
        transform = from_bounds(min_lon, min_lat, max_lon, max_lat, width, height)

        # Buffer lines slightly so they show up clearly as raster pixels
        shapes_and_values = []
        features = roads_geojson.get("features", [])
        
        # Approximate pixel width in degrees
        pixel_size_deg = (max_lon - min_lon) / width

        for feat in features:
            geom = feat.get("geometry")
            if not geom:
                continue
            try:
                geom_shape = shape(geom)
                road_class = feat.get("properties", {}).get("road_class", "residential")
                pixel_val = 1 if binary else ROAD_CLASS_VALUES.get(road_class, 6)
                
                # Buffer width according to road importance
                buffer_factor = {
                    "motorway": 2.5,
                    "trunk": 2.0,
                    "primary": 1.8,
                    "secondary": 1.4,
                    "tertiary": 1.2,
                    "residential": 1.0,
                    "service": 0.8
                }.get(road_class, 1.0)
                
                buffered = geom_shape.buffer(pixel_size_deg * buffer_factor)
                shapes_and_values.append((buffered, pixel_val))
            except Exception as e:
                continue

        if shapes_and_values:
            mask_array = rasterize(
                shapes=shapes_and_values,
                out_shape=(height, width),
                transform=transform,
                fill=0,
                dtype=np.uint8
            )
        else:
            mask_array = np.zeros((height, width), dtype=np.uint8)

        # Write georeferenced TIFF
        with rasterio.open(
            output_path,
            "w",
            driver="GTiff",
            height=height,
            width=width,
            count=1,
            dtype=np.uint8,
            crs="EPSG:4326",
            transform=transform,
            compress="lzw"
        ) as dst:
            dst.write(mask_array, 1)

        return output_path

raster_mask_service = RasterMaskService()
