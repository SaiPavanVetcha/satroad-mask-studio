"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { RoadHoverCard } from "../components/RoadHoverCard";

const MapComponent = dynamic(
  () => import("../components/MapComponent").then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full h-full flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold tracking-wider uppercase text-cyan-300">
          Initializing Map Engine...
        </span>
      </div>
    ),
  }
);
import { PasteGeoJsonModal } from "../components/PasteGeoJsonModal";
import { StatusModal } from "../components/StatusModal";
import {
  RoadClassKey,
  RoadClassMetadata,
  JobResult,
  JobStatus,
  HoveredRoadState
} from "../lib/types";
import {
  DEFAULT_ROAD_CLASSES,
  MAP_STYLES,
  PRESET_AOIS
} from "../lib/constants";
import { submitJob, fetchJob, checkBackendHealth } from "../lib/api";

export default function SatRoadMaskStudioPage() {
  // Pre-load default AOI (Bengaluru Tech Corridor)
  const defaultPreset = PRESET_AOIS[0];
  const [aoiBbox, setAoiBbox] = useState<number[] | null>(defaultPreset.bbox);
  const [aoiPolygon, setAoiPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [aoiAreaKm2, setAoiAreaKm2] = useState<number>(14.5);

  // Date range defaults
  const [startDate, setStartDate] = useState<string>("2024-01-01");
  const [endDate, setEndDate] = useState<string>("2024-03-31");

  // Sensors & Filters
  const [selectedSensors, setSelectedSensors] = useState<string[]>([
    "Sentinel-2",
    "Landsat-8/9"
  ]);
  const [maxCloudCover, setMaxCloudCover] = useState<number>(20);

  // Road styling per class
  const [roadClasses, setRoadClasses] = useState<Record<RoadClassKey, RoadClassMetadata>>(
    DEFAULT_ROAD_CLASSES
  );

  // Active Job & Polling
  const [activeJob, setActiveJob] = useState<JobResult | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Map & Layers State
  const [drawMode, setDrawMode] = useState<"none" | "rectangle" | "polygon">("none");
  const [baseMapStyle, setBaseMapStyle] = useState<string>(MAP_STYLES[0].url);
  const [showSatellite, setShowSatellite] = useState<boolean>(true);
  const [satelliteOpacity, setSatelliteOpacity] = useState<number>(0.85);
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [roadsOpacity, setRoadsOpacity] = useState<number>(1.0);
  const [showMaskPreview, setShowMaskPreview] = useState<boolean>(false);

  // Road Hover Card
  const [hoverData, setHoverData] = useState<HoveredRoadState | null>(null);

  // Modals
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  // Check backend health periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await checkBackendHealth();
        setIsBackendHealthy(true);
      } catch {
        setIsBackendHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 25000);
    return () => clearInterval(interval);
  }, []);

  // Compute approx area km2 when bbox changes
  const updateAoi = useCallback((bbox: number[], polygon?: GeoJSON.Polygon | null) => {
    setAoiBbox(bbox);
    setAoiPolygon(polygon || null);
    const widthDeg = Math.abs(bbox[2] - bbox[0]);
    const heightDeg = Math.abs(bbox[3] - bbox[1]);
    const approxKm2 = Math.round(widthDeg * 111.0 * heightDeg * 111.0 * Math.cos((bbox[1] * Math.PI) / 180));
    setAoiAreaKm2(approxKm2 > 0 ? approxKm2 : 1);
  }, []);

  const clearAoi = () => {
    setAoiBbox(null);
    setAoiPolygon(null);
    setAoiAreaKm2(0);
    setActiveJob(null);
    setJobStatus(null);
    setProgressMessage("");
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  };

  // Job Polling Loop
  const startPolling = useCallback((jobId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const job = await fetchJob(jobId);
        setActiveJob(job);
        setJobStatus(job.status);
        setProgressMessage(job.progress_message);

        if (job.status === "COMPLETED" || job.status === "FAILED") {
          setIsLoading(false);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);

          // If completed, update road class counts and lengths in sidebar
          if (job.status === "COMPLETED" && job.road_classes) {
            setRoadClasses((prev) => {
              const updated = { ...prev };
              Object.keys(job.road_classes).forEach((k) => {
                const key = k as RoadClassKey;
                if (updated[key]) {
                  updated[key] = {
                    ...updated[key],
                    count: job.road_classes[k].count,
                    total_length_km: job.road_classes[k].total_length_km,
                  };
                }
              });
              return updated;
            });
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1500);
  }, []);

  // Submit background job
  const handleSubmitJob = async () => {
    if (!aoiBbox) return;
    setIsLoading(true);
    setProgressMessage("Submitting Area of Interest to background engine...");

    try {
      const activeRoadClassKeys = (Object.keys(roadClasses) as RoadClassKey[]).filter(
        (k) => roadClasses[k].visible
      );

      const res = await submitJob({
        bbox: aoiBbox,
        geometry: aoiPolygon || undefined,
        start_date: startDate,
        end_date: endDate,
        sensors: selectedSensors,
        max_cloud_cover: maxCloudCover,
        road_classes: activeRoadClassKeys,
      });

      // Update URL with shareable job_id
      const url = new URL(window.location.href);
      url.searchParams.set("job_id", res.job_id);
      window.history.replaceState({}, "", url.toString());

      startPolling(res.job_id);
    } catch (err: unknown) {
      setIsLoading(false);
      setProgressMessage(`Submission failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Check URL searchParams on mount for shareable job_id
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const sharedJobId = urlParams.get("job_id");
    if (sharedJobId) {
      setIsLoading(true);
      setProgressMessage("Loading shared job...");
      startPolling(sharedJobId);
    }
  }, [startPolling]);

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-slate-950 font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        activeJob={activeJob}
        drawMode={drawMode}
        setDrawMode={setDrawMode}
        onClearAoi={clearAoi}
        onOpenPasteModal={() => setIsPasteModalOpen(true)}
        onOpenStatusModal={() => setIsStatusModalOpen(true)}
        isBackendHealthy={isBackendHealthy}
      />

      {/* Main Workspace: Left Controls Sidebar & Full-screen Map */}
      <main className="relative flex-1 w-full h-full flex overflow-hidden">
        {/* Left Floating Sidebar */}
        <Sidebar
          aoiBbox={aoiBbox}
          aoiAreaKm2={aoiAreaKm2}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          selectedSensors={selectedSensors}
          setSelectedSensors={setSelectedSensors}
          maxCloudCover={maxCloudCover}
          setMaxCloudCover={setMaxCloudCover}
          roadClasses={roadClasses}
          setRoadClasses={setRoadClasses}
          activeJob={activeJob}
          jobStatus={jobStatus}
          progressMessage={progressMessage}
          onSubmitJob={handleSubmitJob}
          isLoading={isLoading}
          baseMapStyle={baseMapStyle}
          setBaseMapStyle={setBaseMapStyle}
          satelliteOpacity={satelliteOpacity}
          setSatelliteOpacity={setSatelliteOpacity}
          showSatellite={showSatellite}
          setShowSatellite={setShowSatellite}
          roadsOpacity={roadsOpacity}
          setRoadsOpacity={setRoadsOpacity}
          showRoads={showRoads}
          setShowRoads={setShowRoads}
          showMaskPreview={showMaskPreview}
          setShowMaskPreview={setShowMaskPreview}
        />

        {/* MapLibre Main Map */}
        <MapComponent
          aoiBbox={aoiBbox}
          aoiPolygon={aoiPolygon}
          onAoiChange={updateAoi}
          drawMode={drawMode}
          setDrawMode={setDrawMode}
          roadClasses={roadClasses}
          activeJob={activeJob}
          baseMapStyle={baseMapStyle}
          showSatellite={showSatellite}
          satelliteOpacity={satelliteOpacity}
          showRoads={showRoads}
          roadsOpacity={roadsOpacity}
          showMaskPreview={showMaskPreview}
          setHoverData={setHoverData}
        />

        {/* Road Hover Details Card */}
        <RoadHoverCard hoverData={hoverData} />
      </main>

      {/* Modals */}
      <PasteGeoJsonModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onSelectAoi={updateAoi}
      />

      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />
    </div>
  );
}
