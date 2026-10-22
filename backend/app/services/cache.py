import hashlib
import json
from pathlib import Path
from typing import Optional, Dict, Any
from ..config import settings

class CacheManager:
    def __init__(self, cache_dir: Optional[Path] = None):
        self.cache_dir = cache_dir or (settings.STORAGE_DIR / "cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._memory_cache: Dict[str, Dict[str, Any]] = {}

    def generate_key(self, aoi_geometry: Dict[str, Any], start_date: str, end_date: str, sensors: list, road_classes: list) -> str:
        """Generate a deterministic hash key for the job parameters."""
        raw_dict = {
            "geom": aoi_geometry,
            "start": start_date,
            "end": end_date,
            "sensors": sorted(sensors),
            "roads": sorted(road_classes or [])
        }
        serialized = json.dumps(raw_dict, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached job result from memory or disk."""
        if key in self._memory_cache:
            return self._memory_cache[key]

        file_path = self.cache_dir / f"{key}.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._memory_cache[key] = data
                    return data
            except Exception:
                return None
        return None

    def set(self, key: str, data: Dict[str, Any]) -> None:
        """Store job result in memory and disk."""
        self._memory_cache[key] = data
        file_path = self.cache_dir / f"{key}.json"
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f)
        except Exception as e:
            print(f"[CacheManager] Failed to write disk cache: {e}")

cache_manager = CacheManager()
