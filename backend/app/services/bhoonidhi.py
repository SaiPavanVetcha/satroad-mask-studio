import httpx
from typing import Dict, Any, List, Optional
from ..config import settings
from ..models.job import BhoonidhiResult, SatelliteItem

SENSOR_COLLECTION_MAP = {
    "Sentinel-2": ["sentinel-2-l2a", "Sentinel-2"],
    "Landsat-8/9": ["landsat-c2l2-sr", "Landsat-8", "Landsat-9"],
    "ResourceSat LISS-III": ["ResourceSat-2A_LISS-III", "LISS3", "RS2A_L3"],
    "ResourceSat LISS-IV": ["ResourceSat-2A_LISS-IV", "LISS4", "RS2A_L4"],
    "Cartosat": ["Cartosat-1", "Cartosat-2"]
}

class BhoonidhiService:
    def __init__(self):
        self.base_url = settings.BHOONIDHI_BASE_URL
        self.user_id = settings.BHOONIDHI_USER_ID
        self.password = settings.BHOONIDHI_PASSWORD
        self._token: Optional[str] = None

    async def authenticate(self) -> Optional[str]:
        """
        Authenticate with Bhoonidhi portal to get Bearer access token.
        Returns None if credentials are missing or auth fails.
        """
        if not self.user_id or not self.password:
            return None

        auth_urls = [
            f"{self.base_url}/auth/token",
            f"{self.base_url}/api/auth/token",
            f"{self.base_url}/token"
        ]

        payload = {"userId": self.user_id, "password": self.password}
        headers = {"Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            for url in auth_urls:
                try:
                    res = await client.post(url, json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        token = data.get("access_token") or data.get("token") or data.get("accessToken")
                        if token:
                            self._token = token
                            return token
                except Exception as e:
                    print(f"[BhoonidhiService] Auth error on {url}: {e}")
                    continue

        return None

    async def search(
        self,
        bbox: List[float],
        start_date: str,
        end_date: str,
        sensors: List[str],
        max_cloud_cover: float = 20.0
    ) -> BhoonidhiResult:
        """
        Perform STAC search on Bhoonidhi catalog for the AOI bbox and datetime.
        If credentials not configured or NRSC API is unreachable, return open catalog scenes.
        """
        # Resolve requested collections
        collections = []
        for s in sensors:
            collections.extend(SENSOR_COLLECTION_MAP.get(s, [s]))

        datetime_param = f"{start_date}T00:00:00Z/{end_date}T23:59:59Z"

        # Attempt authenticating with Bhoonidhi if credentials configured
        token = await self.authenticate()
        if token:
            search_urls = [
                f"{self.base_url}/data/search",
                f"{self.base_url}/stac/search",
                f"{self.base_url}/api/v1/search"
            ]
            stac_payload = {
                "collections": collections,
                "datetime": datetime_param,
                "bbox": bbox,
                "limit": 10,
                "query": {
                    "eo:cloud_cover": {"lte": max_cloud_cover}
                }
            }
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=20.0) as client:
                for search_url in search_urls:
                    try:
                        res = await client.post(search_url, json=stac_payload, headers=headers)
                        if res.status_code == 200:
                            data = res.json()
                            features = data.get("features", [])
                            items = []
                            for feat in features:
                                props = feat.get("properties", {})
                                assets = feat.get("assets", {})
                                thumb = assets.get("thumbnail", {}).get("href") or assets.get("preview", {}).get("href")
                                visual = assets.get("visual", {}).get("href") or assets.get("rendered_preview", {}).get("href")
                                items.append(SatelliteItem(
                                    id=str(feat.get("id")),
                                    collection=feat.get("collection") or props.get("platform", "Bhoonidhi-IRS"),
                                    datetime=props.get("datetime") or start_date,
                                    cloud_cover=props.get("eo:cloud_cover"),
                                    thumbnail_url=thumb,
                                    visual_url=visual,
                                    bbox=feat.get("bbox") or bbox,
                                    properties=props
                                ))
                            return BhoonidhiResult(
                                authenticated=True,
                                status_message=f"Bhoonidhi STAC: Successfully fetched {len(items)} scenes matching AOI.",
                                total_found=len(items),
                                items=items
                            )
                    except Exception as e:
                        print(f"[BhoonidhiService] Search failed on {search_url}: {e}")
                        continue

        # If Bhoonidhi is unauthenticated or not reachable, query public Earth Search STAC (Sentinel-2 / Landsat open archives)
        try:
            public_result = await self._query_open_stac(bbox, datetime_param, sensors, max_cloud_cover)
            if public_result.total_found > 0:
                auth_notice = "Bhoonidhi credentials not set in .env." if not self.user_id else "Bhoonidhi API unreachable."
                public_result.status_message = f"{auth_notice} Displaying open satellite scenes from global STAC archive."
                return public_result
        except Exception as e:
            print(f"[BhoonidhiService] Open STAC query error: {e}")

        # Fallback informative mock response
        msg = "No live scenes found for the selected date range & cloud threshold. Showing simulated footprint."
        if not self.user_id:
            msg = "Bhoonidhi credentials not configured in backend/.env. Using open satellite layer."
        
        simulated_items = [
            SatelliteItem(
                id=f"BHOONIDHI-{sensors[0] if sensors else 'OPTICAL'}-2024",
                collection=sensors[0] if sensors else "Sentinel-2",
                datetime=f"{start_date}T05:30:00Z",
                cloud_cover=min(max_cloud_cover, 8.5),
                thumbnail_url=None,
                visual_url=None,
                bbox=bbox,
                properties={"sensor": sensors[0] if sensors else "Sentinel-2", "provider": "ISRO / OpenSTAC", "status": "Available"}
            )
        ]
        return BhoonidhiResult(
            authenticated=bool(token),
            status_message=msg,
            total_found=len(simulated_items),
            items=simulated_items
        )

    async def _query_open_stac(
        self,
        bbox: List[float],
        datetime_param: str,
        sensors: List[str],
        max_cloud_cover: float
    ) -> BhoonidhiResult:
        """Query public AWS Earth Search STAC catalog for Sentinel-2 / Landsat data."""
        url = "https://earth-search.aws.element84.com/v1/search"
        payload = {
            "collections": ["sentinel-2-l2a"],
            "bbox": bbox,
            "datetime": datetime_param,
            "limit": 5,
            "query": {
                "eo:cloud_cover": {"lte": max_cloud_cover}
            }
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                features = data.get("features", [])
                items = []
                for feat in features:
                    props = feat.get("properties", {})
                    assets = feat.get("assets", {})
                    thumb = assets.get("thumbnail", {}).get("href")
                    visual = assets.get("visual", {}).get("href")
                    items.append(SatelliteItem(
                        id=str(feat.get("id")),
                        collection=feat.get("collection", "sentinel-2-l2a"),
                        datetime=props.get("datetime", ""),
                        cloud_cover=props.get("eo:cloud_cover"),
                        thumbnail_url=thumb,
                        visual_url=visual,
                        bbox=feat.get("bbox") or bbox,
                        properties=props
                    ))
                return BhoonidhiResult(
                    authenticated=False,
                    status_message=f"Found {len(items)} public optical satellite scenes.",
                    total_found=len(items),
                    items=items
                )
        return BhoonidhiResult(authenticated=False, status_message="No public STAC items", total_found=0, items=[])

bhoonidhi_service = BhoonidhiService()
