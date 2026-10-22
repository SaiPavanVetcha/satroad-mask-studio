import math
import httpx
from typing import Dict, Any, List, Tuple, Optional
from shapely.geometry import shape, LineString, Polygon, mapping
from shapely.ops import clip_by_rect
from ..config import settings
from ..models.job import RoadClassInfo

# Mapping from highway tag values to class categories
ROAD_CLASS_MAPPING = {
    "motorway": "motorway",
    "motorway_link": "motorway",
    "trunk": "trunk",
    "trunk_link": "trunk",
    "primary": "primary",
    "primary_link": "primary",
    "secondary": "secondary",
    "secondary_link": "secondary",
    "tertiary": "tertiary",
    "tertiary_link": "tertiary",
    "residential": "residential",
    "unclassified": "residential",
    "living_street": "residential",
    "service": "service",
    "track": "service",
    "path": "service",
    "footway": "service",
    "cycleway": "service",
    "pedestrian": "service"
}

CLASS_METADATA = {
    "motorway": {"label": "Motorway / Highway", "color": "#f43f5e", "width": 4.5},
    "trunk": {"label": "Trunk Roads", "color": "#f97316", "width": 4.0},
    "primary": {"label": "Primary Roads", "color": "#eab308", "width": 3.4},
    "secondary": {"label": "Secondary Roads", "color": "#10b981", "width": 2.8},
    "tertiary": {"label": "Tertiary Roads", "color": "#06b6d4", "width": 2.2},
    "residential": {"label": "Residential / Local", "color": "#818cf8", "width": 1.8},
    "service": {"label": "Service / Track / Path", "color": "#94a3b8", "width": 1.2},
}

def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculate distance in meters between two (lon, lat) points."""
    lon1, lat1 = coord1
    lon2, lat2 = coord2
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def compute_linestring_length_m(coords: List[Tuple[float, float]]) -> float:
    """Compute total length of a coordinate list in meters."""
    if len(coords) < 2:
        return 0.0
    total = 0.0
    for i in range(len(coords) - 1):
        total += haversine_distance(coords[i], coords[i + 1])
    return total

class OSMService:
    @staticmethod
    def build_overpass_query(bbox: List[float], road_classes: Optional[List[str]] = None) -> str:
        """
        Build an Overpass QL query.
        bbox is [min_lon, min_lat, max_lon, max_lat] -> Overpass expects (south, west, north, east)
        """
        min_lon, min_lat, max_lon, max_lat = bbox
        
        # Determine highway filters
        highway_values = []
        target_classes = set(road_classes) if road_classes else set(CLASS_METADATA.keys())
        for hw_tag, class_name in ROAD_CLASS_MAPPING.items():
            if class_name in target_classes:
                highway_values.append(hw_tag)
                
        regex_filter = "|".join(highway_values) if highway_values else "motorway|trunk|primary|secondary|tertiary|residential|service"
        
        query = f"""
        [out:json][timeout:35];
        (
          way["highway"~"^({regex_filter})$"]({min_lat},{min_lon},{max_lat},{max_lon});
        );
        out body;
        >;
        out skel qt;
        """
        return query.strip()

    @classmethod
    async def fetch_roads(
        cls,
        bbox: List[float],
        aoi_polygon: Optional[Dict[str, Any]] = None,
        road_classes: Optional[List[str]] = None
    ) -> Tuple[Dict[str, Any], Dict[str, RoadClassInfo], int, float]:
        """
        Fetch roads from Overpass API, parse into GeoJSON, calculate stats.
        Returns: (geojson_feature_collection, road_classes_summary, total_roads, total_length_km)
        """
        query = cls.build_overpass_query(bbox, road_classes)
        endpoints = [settings.OVERPASS_URL] + [m for m in settings.OVERPASS_MIRRORS if m != settings.OVERPASS_URL]
        
        osm_data = None
        last_error = None
        
        # Try primary and mirrors with graceful fallback
        async with httpx.AsyncClient(timeout=40.0) as client:
            for url in endpoints:
                try:
                    response = await client.post(url, data={"data": query}, headers={"User-Agent": "SatRoadMaskStudio/1.0"})
                    if response.status_code == 200:
                        osm_data = response.json()
                        break
                    else:
                        last_error = f"HTTP {response.status_code} from {url}"
                except Exception as e:
                    last_error = str(e)
                    continue

        if not osm_data or "elements" not in osm_data:
            raise RuntimeError(f"Overpass API request failed on all endpoints. Details: {last_error or 'No data returned'}")

        # Parse nodes and ways
        nodes: Dict[int, Tuple[float, float]] = {}
        ways: List[Dict[str, Any]] = []

        for elem in osm_data.get("elements", []):
            elem_type = elem.get("type")
            if elem_type == "node":
                nodes[elem["id"]] = (elem["lon"], elem["lat"])
            elif elem_type == "way":
                ways.append(elem)

        features = []
        class_stats: Dict[str, RoadClassInfo] = {
            k: RoadClassInfo(
                key=k,
                label=CLASS_METADATA[k]["label"],
                color=CLASS_METADATA[k]["color"],
                width=CLASS_METADATA[k]["width"],
                count=0,
                total_length_km=0.0
            )
            for k in CLASS_METADATA.keys()
        }

        poly_geom = shape(aoi_polygon) if aoi_polygon else None
        total_road_length_km = 0.0

        for way in ways:
            node_ids = way.get("nodes", [])
            coords = [nodes[nid] for nid in node_ids if nid in nodes]
            if len(coords) < 2:
                continue

            line = LineString(coords)
            
            # Clip by AOI polygon if provided
            if poly_geom and not poly_geom.intersects(line):
                continue

            tags = way.get("tags", {})
            highway_tag = tags.get("highway", "residential")
            road_class = ROAD_CLASS_MAPPING.get(highway_tag, "residential")

            # Check if this road class was filtered out
            if road_classes and road_class not in road_classes:
                continue

            length_m = compute_linestring_length_m(coords)
            length_km = round(length_m / 1000.0, 3)

            # Update class stats
            if road_class in class_stats:
                class_stats[road_class].count += 1
                class_stats[road_class].total_length_km = round(class_stats[road_class].total_length_km + length_km, 3)
            total_road_length_km += length_km

            way_id = way.get("id")
            feature = {
                "type": "Feature",
                "id": str(way_id),
                "geometry": mapping(line),
                "properties": {
                    "osm_id": str(way_id),
                    "name": tags.get("name") or tags.get("ref") or "Unnamed Road",
                    "highway": highway_tag,
                    "road_class": road_class,
                    "road_class_label": CLASS_METADATA.get(road_class, {}).get("label", road_class),
                    "color": CLASS_METADATA.get(road_class, {}).get("color", "#818cf8"),
                    "width": CLASS_METADATA.get(road_class, {}).get("width", 2.0),
                    "lanes": tags.get("lanes", "Not specified"),
                    "surface": tags.get("surface", "Not specified"),
                    "maxspeed": tags.get("maxspeed", "Not specified"),
                    "oneway": tags.get("oneway", "no"),
                    "bridge": tags.get("bridge", "no"),
                    "tunnel": tags.get("tunnel", "no"),
                    "length_m": round(length_m, 1),
                    "length_km": length_km,
                    "osm_url": f"https://www.openstreetmap.org/way/{way_id}"
                }
            }
            features.append(feature)

        geojson_collection = {
            "type": "FeatureCollection",
            "features": features
        }

        total_roads = len(features)
        total_road_length_km = round(total_road_length_km, 2)

        return geojson_collection, class_stats, total_roads, total_road_length_km
