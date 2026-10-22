"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Map,
  GeoJSONSource,
  MapMouseEvent,
  MapGeoJSONFeature,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";
import {
  RoadClassKey,
  RoadClassMetadata,
  HoveredRoadState,
  HoveredRoadProperties,
  JobResult,
} from "../lib/types";
import { SATELLITE_TILE_URL } from "../lib/constants";
import { Maximize2, Crosshair, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";

// Configure MapLibre Web Worker explicitly for Next.js bundler compatibility
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

interface Props {
  aoiBbox: number[] | null;
  aoiPolygon: GeoJSON.Polygon | null;
  onAoiChange: (bbox: number[], polygon?: GeoJSON.Polygon | null) => void;
  drawMode: "none" | "rectangle" | "polygon";
  setDrawMode: (mode: "none" | "rectangle" | "polygon") => void;
  roadClasses: Record<RoadClassKey, RoadClassMetadata>;
  activeJob: JobResult | null;
  baseMapStyle: string;
  showSatellite: boolean;
  satelliteOpacity: number;
  showRoads: boolean;
  roadsOpacity: number;
  showMaskPreview: boolean;
  setHoverData: (data: HoveredRoadState | null) => void;
}

export const MapComponent: React.FC<Props> = ({
  aoiBbox,
  aoiPolygon,
  onAoiChange,
  drawMode,
  setDrawMode,
  roadClasses,
  activeJob,
  baseMapStyle,
  showSatellite,
  satelliteOpacity,
  showRoads,
  roadsOpacity,
  showMaskPreview,
  setHoverData,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isStyleLoading, setIsStyleLoading] = useState(true);

  // Drawing state
  const isDrawingRectRef = useRef(false);
  const rectStartCoordRef = useRef<[number, number] | null>(null);
  const polygonPointsRef = useRef<[number, number][]>([]);

  // Build MapLibre match expressions for road colors
  const buildColorExpression = useCallback(
    (classes: Record<RoadClassKey, RoadClassMetadata>) => {
      const expr: any[] = ["match", ["get", "road_class"]];
      (Object.keys(classes) as RoadClassKey[]).forEach((key) => {
        expr.push(key, classes[key].color);
      });
      expr.push("#818cf8"); // fallback color
      return expr;
    },
    []
  );

  // Build MapLibre match expressions for road widths
  const buildWidthExpression = useCallback(
    (classes: Record<RoadClassKey, RoadClassMetadata>) => {
      const expr: any[] = ["match", ["get", "road_class"]];
      (Object.keys(classes) as RoadClassKey[]).forEach((key) => {
        expr.push(key, classes[key].width);
      });
      expr.push(2.0); // fallback width
      return expr;
    },
    []
  );

  // Handle Road Hover Event
  const handleRoadMouseMove = useCallback(
    (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      if (e.features && e.features.length > 0) {
        map.getCanvas().style.cursor = "pointer";
        const feat = e.features[0];
        const props = feat.properties as HoveredRoadProperties;

        // Update hover highlight filter
        if (props.osm_id && map.getLayer("roads-hover-highlight")) {
          map.setFilter("roads-hover-highlight", ["==", "osm_id", props.osm_id]);
        }

        setHoverData({
          properties: props,
          x: e.point.x,
          y: e.point.y,
        });
      }
    },
    [setHoverData]
  );

  const handleRoadMouseLeave = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.getCanvas().style.cursor = "";
    if (mapRef.current.getLayer("roads-hover-highlight")) {
      mapRef.current.setFilter("roads-hover-highlight", ["==", "osm_id", ""]);
    }
    setHoverData(null);
  }, [setHoverData]);

  // Setup studio layers
  const setupLayers = useCallback(
    (map: Map) => {
      try {
        // 1. Satellite Raster Layer
        if (!map.getSource("satellite-source")) {
          map.addSource("satellite-source", {
            type: "raster",
            tiles: [SATELLITE_TILE_URL],
            tileSize: 256,
            attribution: "Esri World Imagery",
          });
        }

        if (!map.getLayer("satellite-layer")) {
          map.addLayer({
            id: "satellite-layer",
            type: "raster",
            source: "satellite-source",
            paint: {
              "raster-opacity": showSatellite ? satelliteOpacity : 0,
              "raster-fade-duration": 150,
            },
          });
        }

        // 2. AOI Source & Layers
        if (!map.getSource("aoi-source")) {
          map.addSource("aoi-source", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        if (!map.getLayer("aoi-fill")) {
          map.addLayer({
            id: "aoi-fill",
            type: "fill",
            source: "aoi-source",
            paint: {
              "fill-color": "#38bdf8",
              "fill-opacity": 0.12,
            },
          });
        }

        if (!map.getLayer("aoi-line")) {
          map.addLayer({
            id: "aoi-line",
            type: "line",
            source: "aoi-source",
            paint: {
              "line-color": "#38bdf8",
              "line-width": 2.5,
              "line-dasharray": [2, 1],
            },
          });
        }

        // 3. Roads GeoJSON Source & Layers
        if (!map.getSource("roads-source")) {
          map.addSource("roads-source", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        // Halo/casing layer
        if (!map.getLayer("roads-halo")) {
          map.addLayer({
            id: "roads-halo",
            type: "line",
            source: "roads-source",
            paint: {
              "line-color": "#000000",
              "line-width": 6,
              "line-opacity": 0.4,
              "line-blur": 2,
            },
          });
        }

        // Main roads line layer
        if (!map.getLayer("roads-layer")) {
          map.addLayer({
            id: "roads-layer",
            type: "line",
            source: "roads-source",
            paint: {
              "line-color": buildColorExpression(roadClasses) as any,
              "line-width": buildWidthExpression(roadClasses) as any,
              "line-opacity": showRoads ? roadsOpacity : 0,
            },
          });

          // Attach hover events
          map.on("mousemove", "roads-layer", handleRoadMouseMove);
          map.on("mouseleave", "roads-layer", handleRoadMouseLeave);
        }

        // Hover highlight layer
        if (!map.getLayer("roads-hover-highlight")) {
          map.addLayer({
            id: "roads-hover-highlight",
            type: "line",
            source: "roads-source",
            filter: ["==", "osm_id", ""],
            paint: {
              "line-color": "#ffffff",
              "line-width": 6,
              "line-opacity": 0.85,
              "line-blur": 1.5,
            },
          });
        }
      } catch (err) {
        console.error("Failed to setup map layers:", err);
      }
    },
    [
      buildColorExpression,
      buildWidthExpression,
      handleRoadMouseMove,
      handleRoadMouseLeave,
      roadClasses,
      roadsOpacity,
      satelliteOpacity,
      showRoads,
      showSatellite,
    ]
  );

  // Update AOI Display
  const updateAoiDisplay = useCallback(
    (map: Map, bbox: number[] | null, poly: GeoJSON.Polygon | null) => {
      const src = map.getSource("aoi-source") as GeoJSONSource | undefined;
      if (!src) return;

      if (poly) {
        src.setData({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: poly, properties: {} }],
        });
      } else if (bbox && bbox.length === 4) {
        const rectPoly: GeoJSON.Polygon = {
          type: "Polygon",
          coordinates: [
            [
              [bbox[0], bbox[1]],
              [bbox[2], bbox[1]],
              [bbox[2], bbox[3]],
              [bbox[0], bbox[3]],
              [bbox[0], bbox[1]],
            ],
          ],
        };
        src.setData({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: rectPoly, properties: {} }],
        });
      } else {
        src.setData({ type: "FeatureCollection", features: [] });
      }
    },
    []
  );

  // Update Roads Data from activeJob
  const updateRoadsData = useCallback((map: Map, job: JobResult | null) => {
    const src = map.getSource("roads-source") as GeoJSONSource | undefined;
    if (!src) return;

    if (job && job.roads_geojson && job.status === "COMPLETED") {
      src.setData(job.roads_geojson);
      if (job.aoi_bbox && job.aoi_bbox.length === 4) {
        map.fitBounds(
          [
            [job.aoi_bbox[0], job.aoi_bbox[1]],
            [job.aoi_bbox[2], job.aoi_bbox[3]],
          ],
          { padding: 80, duration: 1200 }
        );
      }
    } else {
      src.setData({ type: "FeatureCollection", features: [] });
    }
  }, []);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    setMapError(null);
    setIsStyleLoading(true);

    let mapInstance: Map | null = null;

    try {
      mapInstance = new Map({
        container: mapContainerRef.current,
        style: baseMapStyle,
        center: [77.72, 12.98], // Default to Bengaluru corridor
        zoom: 13,
        pitch: 0,
        bearing: 0,
      });

      mapRef.current = mapInstance;

      mapInstance.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
      mapInstance.addControl(new ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-right");

      mapInstance.on("load", () => {
        if (!mapInstance) return;
        setMapLoaded(true);
        setIsStyleLoading(false);
        setupLayers(mapInstance);
        updateAoiDisplay(mapInstance, aoiBbox, aoiPolygon);
        updateRoadsData(mapInstance, activeJob);
        mapInstance.resize();
      });

      mapInstance.on("error", (e) => {
        console.warn("MapLibre event error:", e);
        // Only treat fatal errors as fatal
        if (e.error && (e.error.message?.includes("WebGL") || e.error.message?.includes("Worker"))) {
          setMapError(e.error.message);
        }
      });
    } catch (err: unknown) {
      console.error("MapLibre initialization failed:", err);
      setMapError(err instanceof Error ? err.message : "Failed to initialize WebGL map.");
    }

    // Auto-resize on container dimensions change
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
        setMapLoaded(false);
      }
    };
  }, []); // Run once on mount

  // Update Base Map Style if changed
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    setIsStyleLoading(true);
    map.setStyle(baseMapStyle);

    const onStyleLoad = () => {
      setIsStyleLoading(false);
      setupLayers(map);
      updateAoiDisplay(map, aoiBbox, aoiPolygon);
      updateRoadsData(map, activeJob);
    };

    map.once("style.load", onStyleLoad);

    return () => {
      map.off("style.load", onStyleLoad);
    };
  }, [baseMapStyle, mapLoaded, setupLayers, updateAoiDisplay, updateRoadsData, aoiBbox, aoiPolygon, activeJob]);

  // Update Road Styles Live (colors, widths, visibility)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (map.getLayer("roads-layer")) {
      map.setPaintProperty("roads-layer", "line-color", buildColorExpression(roadClasses) as any);
      map.setPaintProperty("roads-layer", "line-width", buildWidthExpression(roadClasses) as any);
      map.setPaintProperty("roads-layer", "line-opacity", showRoads ? roadsOpacity : 0);

      // Build visibility filter for toggled classes
      const visibleClasses = (Object.keys(roadClasses) as RoadClassKey[]).filter(
        (k) => roadClasses[k].visible
      );
      map.setFilter("roads-layer", ["in", "road_class", ...visibleClasses] as any);
      if (map.getLayer("roads-halo")) {
        map.setFilter("roads-halo", ["in", "road_class", ...visibleClasses] as any);
      }
    }
  }, [roadClasses, showRoads, roadsOpacity, mapLoaded, buildColorExpression, buildWidthExpression]);

  // Update Satellite Opacity and Mask Preview
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (map.getLayer("satellite-layer")) {
      const targetOpacity = showMaskPreview ? 0.15 : showSatellite ? satelliteOpacity : 0;
      map.setPaintProperty("satellite-layer", "raster-opacity", targetOpacity);
    }

    if (map.getLayer("roads-layer")) {
      if (showMaskPreview) {
        map.setPaintProperty("roads-layer", "line-width", 5.0);
        if (map.getLayer("roads-halo")) {
          map.setPaintProperty("roads-halo", "line-opacity", 0);
        }
      } else {
        map.setPaintProperty("roads-layer", "line-width", buildWidthExpression(roadClasses) as any);
        if (map.getLayer("roads-halo")) {
          map.setPaintProperty("roads-halo", "line-opacity", 0.4);
        }
      }
    }
  }, [showSatellite, satelliteOpacity, showMaskPreview, roadClasses, mapLoaded, buildWidthExpression]);

  // Update Roads Data from activeJob
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    updateRoadsData(mapRef.current, activeJob);
  }, [activeJob, mapLoaded, updateRoadsData]);

  // Update AOI Display
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    updateAoiDisplay(mapRef.current, aoiBbox, aoiPolygon);
  }, [aoiBbox, aoiPolygon, mapLoaded, updateAoiDisplay]);

  // Interactive Drawing Handlers (Rectangle & Polygon)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (drawMode === "none") {
      map.getCanvas().style.cursor = "";
      map.doubleClickZoom.enable();
      isDrawingRectRef.current = false;
      rectStartCoordRef.current = null;
      polygonPointsRef.current = [];
      return;
    }

    // Disable double click zoom while actively drawing polygon vertices
    map.doubleClickZoom.disable();
    map.getCanvas().style.cursor = "crosshair";

    const handleMouseDown = (e: MapMouseEvent) => {
      const [lon, lat] = [e.lngLat.lng, e.lngLat.lat];

      if (drawMode === "rectangle") {
        if (!isDrawingRectRef.current) {
          isDrawingRectRef.current = true;
          rectStartCoordRef.current = [lon, lat];
        } else {
          // Finish rectangle
          isDrawingRectRef.current = false;
          if (rectStartCoordRef.current) {
            const [lon1, lat1] = rectStartCoordRef.current;
            const bbox = [
              Math.min(lon1, lon),
              Math.min(lat1, lat),
              Math.max(lon1, lon),
              Math.max(lat1, lat),
            ];
            onAoiChange(bbox);
            setDrawMode("none");
          }
        }
      } else if (drawMode === "polygon") {
        polygonPointsRef.current.push([lon, lat]);
        // Update live polygon display
        if (polygonPointsRef.current.length >= 2) {
          const polyCoords = [...polygonPointsRef.current, polygonPointsRef.current[0]];
          const poly: GeoJSON.Polygon = {
            type: "Polygon",
            coordinates: [polyCoords],
          };
          const src = map.getSource("aoi-source") as GeoJSONSource | undefined;
          if (src) {
            src.setData({
              type: "FeatureCollection",
              features: [{ type: "Feature", geometry: poly, properties: {} }],
            });
          }
        }
      }
    };

    const handleMouseMove = (e: MapMouseEvent) => {
      const [lon, lat] = [e.lngLat.lng, e.lngLat.lat];

      if (drawMode === "rectangle" && isDrawingRectRef.current && rectStartCoordRef.current) {
        const [lon1, lat1] = rectStartCoordRef.current;
        const bbox = [
          Math.min(lon1, lon),
          Math.min(lat1, lat),
          Math.max(lon1, lon),
          Math.max(lat1, lat),
        ];
        const rectPoly: GeoJSON.Polygon = {
          type: "Polygon",
          coordinates: [
            [
              [bbox[0], bbox[1]],
              [bbox[2], bbox[1]],
              [bbox[2], bbox[3]],
              [bbox[0], bbox[3]],
              [bbox[0], bbox[1]],
            ],
          ],
        };
        const src = map.getSource("aoi-source") as GeoJSONSource | undefined;
        if (src) {
          src.setData({
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: rectPoly, properties: {} }],
          });
        }
      }
    };

    const handleDblClick = () => {
      if (drawMode === "polygon" && polygonPointsRef.current.length >= 3) {
        const pts = polygonPointsRef.current;
        const polyCoords = [...pts, pts[0]];
        const poly: GeoJSON.Polygon = {
          type: "Polygon",
          coordinates: [polyCoords],
        };
        const lons = pts.map((p) => p[0]);
        const lats = pts.map((p) => p[1]);
        const bbox = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
        onAoiChange(bbox, poly);
        setDrawMode("none");
        polygonPointsRef.current = [];
      }
    };

    map.on("click", handleMouseDown);
    map.on("mousemove", handleMouseMove);
    map.on("dblclick", handleDblClick);

    return () => {
      map.off("click", handleMouseDown);
      map.off("mousemove", handleMouseMove);
      map.off("dblclick", handleDblClick);
    };
  }, [drawMode, onAoiChange, setDrawMode, mapLoaded]);

  // Fit bounds to AOI button
  const handleFitToAoi = () => {
    if (!mapRef.current || !aoiBbox) return;
    mapRef.current.fitBounds(
      [
        [aoiBbox[0], aoiBbox[1]],
        [aoiBbox[2], aoiBbox[3]],
      ],
      { padding: 80, duration: 1000 }
    );
  };

  return (
    <div className="relative w-full h-full flex-1 min-h-0 min-w-0 bg-slate-950 overflow-hidden">
      {/* MapLibre DOM container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full absolute inset-0 bg-slate-950"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Style Loading Spinner */}
      {isStyleLoading && !mapError && (
        <div className="absolute top-4 right-16 z-20 glass-panel px-3 py-1.5 rounded-full border border-slate-700/80 shadow-lg flex items-center gap-2 text-xs text-slate-300">
          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span>Loading basemap style...</span>
        </div>
      )}

      {/* Map Error Banner */}
      {mapError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-6 text-center">
          <div className="glass-panel max-w-md p-6 rounded-2xl border border-rose-500/40 shadow-2xl space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Map Engine Initialization Error</h3>
              <p className="text-xs text-rose-300 mt-1.5">{mapError}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Studio</span>
            </button>
          </div>
        </div>
      )}

      {/* Drawing mode hint indicator */}
      {drawMode !== "none" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 rounded-full border border-cyan-400 shadow-xl flex items-center gap-2 text-xs font-semibold text-white animate-bounce">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <span>
            {drawMode === "rectangle"
              ? "Click two opposite corners on the map to create bounding box"
              : "Click vertices to draw polygon; double-click to finish"}
          </span>
          <button
            onClick={() => setDrawMode("none")}
            className="ml-2 text-rose-400 hover:text-white underline text-[11px]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Floating Center on AOI Button */}
      {aoiBbox && (
        <button
          onClick={handleFitToAoi}
          className="absolute bottom-6 right-16 z-10 glass-panel p-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-700/80 shadow-xl transition-all"
          title="Zoom to AOI"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
