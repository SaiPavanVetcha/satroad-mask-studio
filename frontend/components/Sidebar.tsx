"use client";

import React, { useState } from "react";
import {
  Layers,
  Palette,
  Sliders,
  Calendar,
  Cloud,
  Satellite,
  Compass,
  AlertTriangle,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Database
} from "lucide-react";
import {
  RoadClassKey,
  RoadClassMetadata,
  JobResult,
  JobStatus
} from "../lib/types";
import {
  SENSORS_LIST,
  STYLE_PRESETS,
  MAP_STYLES,
  DEFAULT_ROAD_CLASSES
} from "../lib/constants";

interface Props {
  aoiBbox: number[] | null;
  aoiAreaKm2: number;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  selectedSensors: string[];
  setSelectedSensors: React.Dispatch<React.SetStateAction<string[]>>;
  maxCloudCover: number;
  setMaxCloudCover: (c: number) => void;
  roadClasses: Record<RoadClassKey, RoadClassMetadata>;
  setRoadClasses: React.Dispatch<React.SetStateAction<Record<RoadClassKey, RoadClassMetadata>>>;
  activeJob: JobResult | null;
  jobStatus: JobStatus | null;
  progressMessage: string;
  onSubmitJob: () => void;
  isLoading: boolean;
  baseMapStyle: string;
  setBaseMapStyle: (s: string) => void;
  satelliteOpacity: number;
  setSatelliteOpacity: (o: number) => void;
  showSatellite: boolean;
  setShowSatellite: (v: boolean) => void;
  roadsOpacity: number;
  setRoadsOpacity: (o: number) => void;
  showRoads: boolean;
  setShowRoads: (v: boolean) => void;
  showMaskPreview: boolean;
  setShowMaskPreview: (v: boolean) => void;
}

export const Sidebar: React.FC<Props> = ({
  aoiBbox,
  aoiAreaKm2,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedSensors,
  setSelectedSensors,
  maxCloudCover,
  setMaxCloudCover,
  roadClasses,
  setRoadClasses,
  activeJob,
  jobStatus,
  progressMessage,
  onSubmitJob,
  isLoading,
  baseMapStyle,
  setBaseMapStyle,
  satelliteOpacity,
  setSatelliteOpacity,
  showSatellite,
  setShowSatellite,
  roadsOpacity,
  setRoadsOpacity,
  showRoads,
  setShowRoads,
  showMaskPreview,
  setShowMaskPreview,
}) => {
  const [activeTab, setActiveTab] = useState<"query" | "styling" | "layers" | "scenes">("query");
  const [collapsed, setCollapsed] = useState(false);

  // Toggle sensor selection
  const toggleSensor = (id: string) => {
    setSelectedSensors((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((s) => s !== id) : prev) : [...prev, id]
    );
  };

  // Road styling updates
  const updateRoadColor = (key: RoadClassKey, color: string) => {
    setRoadClasses((prev) => ({
      ...prev,
      [key]: { ...prev[key], color },
    }));
  };

  const updateRoadWidth = (key: RoadClassKey, width: number) => {
    setRoadClasses((prev) => ({
      ...prev,
      [key]: { ...prev[key], width },
    }));
  };

  const toggleRoadVisibility = (key: RoadClassKey) => {
    setRoadClasses((prev) => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible },
    }));
  };

  const applyPreset = (presetName: string) => {
    const preset = STYLE_PRESETS[presetName];
    if (!preset) return;
    setRoadClasses((prev) => {
      const updated = { ...prev };
      (Object.keys(preset) as RoadClassKey[]).forEach((k) => {
        if (updated[k]) {
          updated[k] = { ...updated[k], color: preset[k].color, width: preset[k].width };
        }
      });
      return updated;
    });
  };

  const resetStyles = () => {
    setRoadClasses(DEFAULT_ROAD_CLASSES);
  };

  // Warning for large AOI
  const isLargeAoi = aoiBbox && (aoiBbox[2] - aoiBbox[0]) * (aoiBbox[3] - aoiBbox[1]) > 0.09;

  return (
    <aside
      className={`fixed top-20 left-4 bottom-6 z-20 transition-all duration-300 flex flex-col ${
        collapsed ? "w-14" : "w-96"
      }`}
    >
      <div className="glass-panel rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl border border-slate-800">
        {/* Sidebar Header & Tab Bar */}
        <div className="border-b border-slate-800/80 bg-slate-900/60 p-2 shrink-0 flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center gap-1 overflow-x-auto w-full">
              <button
                onClick={() => setActiveTab("query")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "query"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>AOI & Sensors</span>
              </button>

              <button
                onClick={() => setActiveTab("styling")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "styling"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Road Styles</span>
              </button>

              <button
                onClick={() => setActiveTab("layers")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "layers"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Layers</span>
              </button>

              <button
                onClick={() => setActiveTab("scenes")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "scenes"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Scenes</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 items-center py-2 w-full">
              <button
                onClick={() => { setCollapsed(false); setActiveTab("query"); }}
                className="p-2 rounded-lg text-cyan-400 hover:bg-slate-800"
                title="AOI & Sensors"
              >
                <Sliders className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setCollapsed(false); setActiveTab("styling"); }}
                className="p-2 rounded-lg text-amber-400 hover:bg-slate-800"
                title="Road Styles"
              >
                <Palette className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setCollapsed(false); setActiveTab("layers"); }}
                className="p-2 rounded-lg text-emerald-400 hover:bg-slate-800"
                title="Map Layers"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Tab Contents */}
        {!collapsed && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-200">
            {/* TAB 1: QUERY & AOI */}
            {activeTab === "query" && (
              <div className="space-y-4">
                {/* AOI Status Box */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                      Area of Interest (AOI)
                    </span>
                    {aoiBbox ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {aoiAreaKm2} km²
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400">Not drawn</span>
                    )}
                  </div>

                  {aoiBbox ? (
                    <div className="mt-2 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                      <div>W: {aoiBbox[0].toFixed(4)}°, S: {aoiBbox[1].toFixed(4)}°</div>
                      <div>E: {aoiBbox[2].toFixed(4)}°, N: {aoiBbox[3].toFixed(4)}°</div>
                    </div>
                  ) : (
                    <div className="mt-2 text-slate-400 text-[11px] leading-relaxed">
                      Use the top toolbar to draw a box, polygon, or load a preset city corridor.
                    </div>
                  )}

                  {isLargeAoi && (
                    <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div className="text-[10px] leading-snug">
                        AOI is large (&gt;0.09 deg²). Querying dense urban roads may take longer.
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Range */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Acquisition Date Range</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Start Date</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">End Date</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Sensors Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Optical Sensors (Bhoonidhi STAC)</span>
                  </label>
                  <div className="space-y-1.5">
                    {SENSORS_LIST.map((sensor) => {
                      const isSelected = selectedSensors.includes(sensor.id);
                      return (
                        <div
                          key={sensor.id}
                          onClick={() => toggleSensor(sensor.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? "bg-cyan-950/40 border-cyan-500/50 shadow-sm"
                              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-200 flex items-center gap-2">
                              <span>{sensor.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                {sensor.resolution}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">{sensor.band}</div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isSelected
                                ? "bg-cyan-500 border-cyan-400 text-slate-950"
                                : "border-slate-600 bg-slate-800"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cloud Cover Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Max Cloud Cover</span>
                    </label>
                    <span className="font-mono text-cyan-300 font-semibold">{maxCloudCover}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={maxCloudCover}
                    onChange={(e) => setMaxCloudCover(Number(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0% Clear</span>
                    <span>50%</span>
                    <span>100% Any</span>
                  </div>
                </div>

                {/* Submit Background Job */}
                <button
                  onClick={onSubmitJob}
                  disabled={isLoading || !aoiBbox}
                  className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                    isLoading
                      ? "bg-cyan-600/50 text-cyan-200 cursor-wait animate-pulse"
                      : !aoiBbox
                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25 hover:scale-[1.01]"
                  }`}
                >
                  <Play className={`w-4 h-4 ${isLoading ? "animate-spin" : "fill-current"}`} />
                  <span>{isLoading ? "Querying Bhoonidhi & OSM..." : "Fetch Satellite & Roads"}</span>
                </button>

                {/* Progress Status Message */}
                {isLoading && (
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                      <span className="font-semibold text-cyan-300 text-xs">
                        Pipeline: {jobStatus || "PROCESSING"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">{progressMessage}</p>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 animate-pulse w-3/4 rounded-full" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ROAD STYLING */}
            {activeTab === "styling" && (
              <div className="space-y-4">
                {/* Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Theme Presets</span>
                    </span>
                    <button
                      onClick={resetStyles}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> Reset
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.keys(STYLE_PRESETS).map((pName) => (
                      <button
                        key={pName}
                        onClick={() => applyPreset(pName)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-[11px] font-medium text-slate-300 hover:text-white transition-all text-left truncate"
                      >
                        {pName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Road Class Color Pickers & Stroke Width */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                    Road Hierarchy & Colors
                  </div>

                  {(Object.keys(roadClasses) as RoadClassKey[]).map((key) => {
                    const road = roadClasses[key];
                    return (
                      <div
                        key={key}
                        className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* Color Picker input */}
                            <input
                              type="color"
                              value={road.color}
                              onChange={(e) => updateRoadColor(key, e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                              title={`Change color for ${road.label}`}
                            />
                            <div>
                              <span className="font-semibold text-slate-200 block text-xs">
                                {road.label}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {road.color.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleRoadVisibility(key)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              road.visible
                                ? "text-cyan-400 hover:bg-slate-800"
                                : "text-slate-600 hover:bg-slate-800"
                            }`}
                            title={road.visible ? "Hide class" : "Show class"}
                          >
                            {road.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Stroke Width Slider */}
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/50">
                          <span className="text-[10px] text-slate-400 shrink-0">Width</span>
                          <input
                            type="range"
                            min="1.0"
                            max="8.0"
                            step="0.2"
                            value={road.width}
                            onChange={(e) => updateRoadWidth(key, parseFloat(e.target.value))}
                            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                          />
                          <span className="font-mono text-[10px] text-slate-300 w-8 text-right">
                            {road.width.toFixed(1)}px
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: LAYERS & CONTROLS */}
            {activeTab === "layers" && (
              <div className="space-y-4">
                {/* Base Map Styles */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cartographic Base Map</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {MAP_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setBaseMapStyle(style.url)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                          baseMapStyle === style.url
                            ? "bg-cyan-950/40 border-cyan-500/60 shadow-sm"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{ backgroundColor: style.previewColor }}
                          />
                          <span className="font-medium text-slate-200">{style.name}</span>
                        </div>
                        {baseMapStyle === style.url && (
                          <Check className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Satellite Imagery Layer Controls */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Satellite className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Satellite Overlay</div>
                        <div className="text-[10px] text-slate-400">High-res Earth observation</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSatellite(!showSatellite)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                        showSatellite
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          : "bg-slate-800 text-slate-500 border-slate-700"
                      }`}
                    >
                      {showSatellite ? "ENABLED" : "OFF"}
                    </button>
                  </div>

                  {showSatellite && (
                    <div className="space-y-1 pt-2 border-t border-slate-800">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Opacity</span>
                        <span className="font-mono text-cyan-300">{Math.round(satelliteOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={satelliteOpacity}
                        onChange={(e) => setSatelliteOpacity(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Road Vectors Layer Controls */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Road Network (Vector)</div>
                        <div className="text-[10px] text-slate-400">Classified line geometries</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRoads(!showRoads)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                        showRoads
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-slate-800 text-slate-500 border-slate-700"
                      }`}
                    >
                      {showRoads ? "VISIBLE" : "HIDDEN"}
                    </button>
                  </div>

                  {showRoads && (
                    <div className="space-y-1 pt-2 border-t border-slate-800">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Opacity</span>
                        <span className="font-mono text-emerald-300">{Math.round(roadsOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={roadsOpacity}
                        onChange={(e) => setRoadsOpacity(parseFloat(e.target.value))}
                        className="w-full accent-emerald-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Mask Preview Toggle */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200 text-xs">Semantic Mask Burn Mode</div>
                    <div className="text-[10px] text-slate-400">Preview high-contrast segmentation mask</div>
                  </div>
                  <button
                    onClick={() => setShowMaskPreview(!showMaskPreview)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                      showMaskPreview
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        : "bg-slate-800 text-slate-500 border-slate-700"
                    }`}
                  >
                    {showMaskPreview ? "ACTIVE" : "OFF"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: SCENES & CATALOG */}
            {activeTab === "scenes" && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="font-semibold text-slate-200 text-xs">Bhoonidhi STAC Catalog</div>
                  <p className="text-[11px] text-slate-400">
                    {activeJob?.satellite_info?.status_message ||
                      "Submit an AOI job to query optical satellite scenes from Bhoonidhi."}
                  </p>
                </div>

                {activeJob?.satellite_info?.items && activeJob.satellite_info.items.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Matching Scenes ({activeJob.satellite_info.items.length})
                    </div>
                    {activeJob.satellite_info.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300 text-xs truncate max-w-[200px]">
                            {item.id}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {item.collection}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono">
                          <div>Date: {item.datetime?.split("T")[0] || "N/A"}</div>
                          <div>Cloud: {item.cloud_cover !== null ? `${item.cloud_cover.toFixed(1)}%` : "0%"}</div>
                        </div>
                        {item.thumbnail_url && (
                          <img
                            src={item.thumbnail_url}
                            alt="scene thumbnail"
                            className="w-full h-24 object-cover rounded-lg border border-slate-800 mt-1"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No satellite scenes loaded yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
