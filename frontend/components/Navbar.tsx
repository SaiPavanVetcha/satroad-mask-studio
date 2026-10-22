"use client";

import React, { useState } from "react";
import {
  Satellite,
  Square,
  Pentagon,
  FileCode,
  Trash2,
  Download,
  Share2,
  Check,
  Server,
  ChevronDown
} from "lucide-react";
import { getGeoJsonDownloadUrl, getMaskDownloadUrl } from "../lib/api";
import { JobResult } from "../lib/types";

interface Props {
  activeJob: JobResult | null;
  drawMode: "none" | "rectangle" | "polygon";
  setDrawMode: (mode: "none" | "rectangle" | "polygon") => void;
  onClearAoi: () => void;
  onOpenPasteModal: () => void;
  onOpenStatusModal: () => void;
  isBackendHealthy: boolean;
}

export const Navbar: React.FC<Props> = ({
  activeJob,
  drawMode,
  setDrawMode,
  onClearAoi,
  onOpenPasteModal,
  onOpenStatusModal,
  isBackendHealthy,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const handleCopyShareLink = () => {
    if (!activeJob) return;
    const url = new URL(window.location.href);
    url.searchParams.set("job_id", activeJob.job_id);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const hasRoads = activeJob && activeJob.status === "COMPLETED" && (activeJob.total_roads || 0) > 0;

  return (
    <header className="h-16 px-4 glass-panel border-b border-slate-800/80 flex items-center justify-between z-30 shrink-0">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
          <Satellite className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight">
              SatRoad Mask Studio
            </h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Optical Satellite Imagery &bull; OSM Road Masks &bull; Bhoonidhi STAC
          </p>
        </div>
      </div>

      {/* AOI Quick Tools */}
      <div className="hidden md:flex items-center gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
        <button
          onClick={() => setDrawMode(drawMode === "rectangle" ? "none" : "rectangle")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            drawMode === "rectangle"
              ? "bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/30"
              : "text-slate-300 hover:text-white hover:bg-slate-800/80"
          }`}
          title="Draw Rectangle BBox on Map"
        >
          <Square className="w-3.5 h-3.5" />
          <span>Draw Box</span>
        </button>

        <button
          onClick={() => setDrawMode(drawMode === "polygon" ? "none" : "polygon")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            drawMode === "polygon"
              ? "bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/30"
              : "text-slate-300 hover:text-white hover:bg-slate-800/80"
          }`}
          title="Draw Freeform Polygon on Map"
        >
          <Pentagon className="w-3.5 h-3.5" />
          <span>Draw Polygon</span>
        </button>

        <button
          onClick={onOpenPasteModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all"
          title="Paste GeoJSON or Bounding Box Coordinates"
        >
          <FileCode className="w-3.5 h-3.5 text-indigo-400" />
          <span>Paste AOI</span>
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        <button
          onClick={onClearAoi}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
          title="Clear current Area of Interest"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* Right Controls & Outputs */}
      <div className="flex items-center gap-2.5">
        {/* Active Job Stats Pill */}
        {activeJob && activeJob.status === "COMPLETED" && (
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Roads:</span>
              <span className="font-bold text-white">{activeJob.total_roads}</span>
            </div>
            <div className="w-px h-3 bg-slate-800" />
            <div>
              <span className="text-slate-400">Network:</span>{" "}
              <span className="font-bold text-cyan-400">{activeJob.total_road_length_km} km</span>
            </div>
            {activeJob.from_cache && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                CACHED
              </span>
            )}
          </div>
        )}

        {/* Share Link */}
        {activeJob && (
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            title="Copy Shareable Job URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copied ? "Copied!" : "Share Job"}</span>
          </button>
        )}

        {/* Export / Download Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDownloadOpen(!downloadOpen)}
            disabled={!hasRoads}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              hasRoads
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:brightness-110 cursor-pointer"
                : "bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {downloadOpen && hasRoads && (
            <div
              className="absolute right-0 mt-2 w-64 glass-panel rounded-xl p-1.5 shadow-2xl border border-slate-700 text-xs z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setDownloadOpen(false)}
            >
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Download Formats
              </div>
              <a
                href={getGeoJsonDownloadUrl(activeJob.job_id)}
                download
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                onClick={() => setDownloadOpen(false)}
              >
                <div>
                  <div className="font-semibold text-cyan-300">Vector GeoJSON</div>
                  <div className="text-[10px] text-slate-400">Road lines & attributes</div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">.geojson</span>
              </a>

              <a
                href={getMaskDownloadUrl(activeJob.job_id, false)}
                download
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                onClick={() => setDownloadOpen(false)}
              >
                <div>
                  <div className="font-semibold text-emerald-300">GeoTIFF Mask (Multi-class)</div>
                  <div className="text-[10px] text-slate-400">Values 1-7 by road class</div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">.tif</span>
              </a>

              <a
                href={getMaskDownloadUrl(activeJob.job_id, true)}
                download
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                onClick={() => setDownloadOpen(false)}
              >
                <div>
                  <div className="font-semibold text-teal-300">GeoTIFF Mask (Binary)</div>
                  <div className="text-[10px] text-slate-400">Roads = 1, Background = 0</div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">.tif</span>
              </a>
            </div>
          )}
        </div>

        {/* Server & Bhoonidhi Status */}
        <button
          onClick={onOpenStatusModal}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white transition-all relative"
          title="System Status & Bhoonidhi Settings"
        >
          <Server className="w-4 h-4 text-cyan-400" />
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
              isBackendHealthy ? "bg-emerald-400" : "bg-rose-500 animate-ping"
            }`}
          />
        </button>
      </div>
    </header>
  );
};
