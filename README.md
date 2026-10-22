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
    FastAPI -->|Bhoonidhi STAC / Sentinel-2| SatModule[Satellite Engine Bhoonidhi / S2]
    FastAPI -->|Overpass API OSM| OSMModule[Road Vector Extractor]
    SatModule --> GeoTIFF[GeoTIFF Satellite Raster]
    OSMModule --> GeoJSON[Road Network GeoJSON]
    GeoTIFF --> Rasterio[Rasterio Mask Synthesizer]
    GeoJSON --> Rasterio
    Rasterio --> MulticlassMask[Multi-Class GeoTIFF Mask]
    Rasterio --> BinaryMask[Binary GeoTIFF Mask]
    FastAPI -->|Job Results & Metrics| Client
```

---

## 🚀 Getting Started
 
### 1. Prerequisites
- **Python 3.10+** (tested with Python 3.12)
- **Node.js 18+ & npm**
- Fully functional out of the box with **free open services** (OpenStreetMap Overpass API + Carto / OpenFreeMap basemaps). Bhoonidhi credentials are optional.
 
### 2. Backend Setup
From the repository root:
```bash
# 1. Create and activate a Python virtual environment
python -m venv .venv

# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux / macOS:
# source .venv/bin/activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Start the FastAPI backend server
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The FastAPI backend runs at `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.

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
| `/api/health` | `GET` | Health check, Bhoonidhi configuration status, and Overpass endpoint |
| `/api/jobs` | `POST` | Submit an Area of Interest (AOI bbox or polygon) for background extraction |
| `/api/jobs/{job_id}` | `GET` | Poll progress & status; returns classified road GeoJSON upon completion |
| `/api/jobs/{job_id}/roads.geojson` | `GET` | Download extracted road network as GeoJSON |
| `/api/jobs/{job_id}/mask.tif` | `GET` | Generate & download georeferenced GeoTIFF mask (`?binary=false` or `?binary=true`) |

---

## 🛡️ License
MIT License. Built for satellite geospatial AI, road network extraction, and earth observation workflows.
