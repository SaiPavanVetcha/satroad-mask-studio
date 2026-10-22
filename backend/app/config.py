import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend folder or current directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME: str = "SatRoad Mask Studio API"
    VERSION: str = "1.0.0"
    
    # Bhoonidhi Credentials
    BHOONIDHI_USER_ID: str = os.getenv("BHOONIDHI_USER_ID", "")
    BHOONIDHI_PASSWORD: str = os.getenv("BHOONIDHI_PASSWORD", "")
    BHOONIDHI_BASE_URL: str = os.getenv("BHOONIDHI_BASE_URL", "https://bhoonidhi-api.nrsc.gov.in").rstrip("/")
    
    # Overpass API
    OVERPASS_URL: str = os.getenv("OVERPASS_URL", "https://overpass-api.de/api/interpreter")
    OVERPASS_MIRRORS: list[str] = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
    ]
    
    # Server & CORS
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
        if origin.strip()
    ]
    
    # Storage & Limits
    STORAGE_DIR: Path = Path(os.getenv("STORAGE_DIR", "./data")).resolve()
    MAX_AOI_AREA_DEG2: float = float(os.getenv("MAX_AOI_AREA_DEG2", "0.09"))  # ~0.3 x 0.3 deg warning

settings = Settings()
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
