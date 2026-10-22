# SatRoad Mask Studio v1.0 🛰️🛣️

> **Next-Generation Geospatial Pipeline & Web Studio for Satellite Road Mask Generation & Overlay Visualization**  
> Integrates **ISRO Bhoonidhi STAC / Open Sentinel-2 & Landsat-8 Imagery**, **OpenStreetMap Overpass Road Networks**, and **Rasterio GeoTIFF Semantic Mask Synthesis** with a high-performance **MapLibre GL** frontend.

---

## 🌟 Key Capabilities

1. **Dual Satellite Ingestion Pipeline**:
   - **ISRO Bhoonidhi STAC API**: Connect directly to Bhoonidhi Open Data collections (Resourcesat-2/2A LISS-IV, LISS-III, Cartosat, Sentinel-2, Landsat-8) using Bhoonidhi credentials or token.
   - **Sentinel-2 L2A Fallback**: Resilient cloud-optimized true-color visual imagery fallback whenever Bhoonidhi credentials are not configured or undergoing maintenance.
2. **Dynamic OpenStreetMap Overpass Road Vector Engine**:
   - Fetches motorways, trunk roads, primary, secondary, tertiary, residential, and service ways in real-time.
   - Computes network metrics: road count, total network length (km), road hierarchies, lane configurations, and speeds.
3. **GeoTIFF Semantic Road Mask Synthesizer (Rasterio)**:
   - High-performance rasterization using `rasterio.features.rasterize`.
   - Generates **Multi-class Road Masks** (encoded with road classes: motorway=1, primary=2, secondary=3, tertiary=4, residential=5, unclassified=6).
   - Generates **Binary Road Masks** (0 = background, 255 = road corridor).
   - Dynamic buffer radii scaled according to road hierarchy and lane counts.
   - Aligned with the exact spatial extent and native resolution of the satellite frame.
4. **Interactive Map Studio**:
   - Built with **Next.js 15** and **MapLibre GL**.
   - Custom styled road vectors with configurable color hierarchy and width sliders.
   - 4 Theme Presets: *Vibrant Neon*, *Satellite GIS*, *Night Vision (Matrix)*, and *Blueprint*.
   - Interactive Road Inspector: Hover and click over any road segment to view real-time OSM tags (name, class, surface, maxspeed, lanes, length).
   - Cartographic Base Map switchers: CartoDB Dark Matter, Positron Light, Voyager Detailed.
   - Semantic Mask Burn Mode: Invert to a high-contrast segmentation view.
   - 1-Click AOI presets: Bengaluru Tech Hub, New Delhi Central, Mumbai Bandra-Kurla, Hyderabad HITEC City, Paris Arc de Triomphe.
   - Export directly to **Vector GeoJSON**, **Multi-class GeoTIFF**, and **Binary GeoTIFF**.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    Client[Next.js + MapLibre GL UI] -->|POST /api/pipeline/run| FastAPI[FastAPI Backend Engine]
    FastAPI -->|Bhoonidhi STAC / Sentinel-2| SatModule[Satellite Engine (Bhoonidhi / S2)]
    FastAPI -->|Overpass API (OSM)| OSMModule[Road Vector Extractor]
    SatModule --> GeoTIFF[GeoTIFF Satellite Raster]
    OSMModule --> GeoJSON[Road Network GeoJSON]
    GeoTIFF & GeoJSON --> Rasterio[Rasterio Mask Synthesizer]
    Rasterio --> MulticlassMask[Multi-Class GeoTIFF Mask]
    Rasterio --> BinaryMask[Binary GeoTIFF Mask]
    FastAPI -->|Job Results & Metrics| Client
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ (tested with 3.12)
- Node.js 18+ & npm
- GDAL / Rasterio native libraries (auto-bundled in pip wheels)

### 2. Backend Setup
From the project root:
```bash
# Create virtual environment (if not already created)
python -m venv .venv

# Activate on Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Or on Linux / macOS:
# source .venv/bin/activate

# Install dependencies and start server
pip install -r backend/requirements.txt
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The FastAPI backend will start at `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Health check and Bhoonidhi / Overpass connection status |
| `/api/pipeline/run` | `POST` | Execute end-to-end satellite & road pipeline for an AOI |
| `/api/pipeline/jobs/{job_id}` | `GET` | Retrieve cached job result, road vectors, and metadata |
| `/api/pipeline/jobs/{job_id}/geojson` | `GET` | Download raw road network as GeoJSON |
| `/api/pipeline/jobs/{job_id}/mask` | `GET` | Download synthesized GeoTIFF road mask (`?binary=false` or `?binary=true`) |
| `/api/pipeline/jobs/{job_id}/satellite` | `GET` | Download raw satellite GeoTIFF raster |
| `/api/bhoonidhi/settings` | `GET`/`POST` | Query or update Bhoonidhi credentials & STAC endpoint |

---

## 🛡️ License
MIT License. Built for satellite geospatial AI, road network extraction, and earth observation workflows.
