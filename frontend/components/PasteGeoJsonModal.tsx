"use client";

import React, { useState } from "react";
import { X, Check, MapPin, Code2, AlertCircle } from "lucide-react";
import { PRESET_AOIS } from "../lib/constants";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectAoi: (bbox: number[], polygonGeoJson?: GeoJSON.Polygon | null) => void;
}

export const PasteGeoJsonModal: React.FC<Props> = ({ isOpen, onClose, onSelectAoi }) => {
  const [inputVal, setInputVal] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPasted = () => {
    setError(null);
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setError("Please paste a GeoJSON string or bounding box array.");
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);

      // Check if it's an array of 4 numbers [min_lon, min_lat, max_lon, max_lat]
      if (Array.isArray(parsed) && parsed.length === 4 && parsed.every((n) => typeof n === "number")) {
        onSelectAoi(parsed as number[]);
        onClose();
        return;
      }

      // Check if it's a GeoJSON Feature
      if (parsed.type === "Feature" && parsed.geometry && parsed.geometry.type === "Polygon") {
        const coords = parsed.geometry.coordinates[0];
        const lons = coords.map((c: number[]) => c[0]);
        const lats = coords.map((c: number[]) => c[1]);
        const bbox = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
        onSelectAoi(bbox, parsed.geometry);
        onClose();
        return;
      }

      // Check if it's a GeoJSON Polygon
      if (parsed.type === "Polygon" && Array.isArray(parsed.coordinates)) {
        const coords = parsed.coordinates[0];
        const lons = coords.map((c: number[]) => c[0]);
        const lats = coords.map((c: number[]) => c[1]);
        const bbox = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
        onSelectAoi(bbox, parsed);
        onClose();
        return;
      }

      setError("Input must be a valid GeoJSON Polygon/Feature or bbox array [min_lon, min_lat, max_lon, max_lat].");
    } catch (e: unknown) {
      setError(`JSON Parse Error: ${e instanceof Error ? e.message : "Invalid JSON"}`);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_AOIS[0]) => {
    onSelectAoi(preset.bbox);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-700 shadow-2xl p-6 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Define Area of Interest (AOI)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            1-Click Sample Corridors
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_AOIS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleSelectPreset(preset)}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 font-semibold text-white text-xs group-hover:text-cyan-300">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{preset.name}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Raw Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Or Paste Custom GeoJSON / Bounding Box
          </label>
          <textarea
            rows={5}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={`Paste GeoJSON Feature, Polygon or bbox, e.g.:\n[77.705, 12.965, 77.745, 12.995]\n\nor {"type": "Polygon", "coordinates": [[[77.7, 12.9], ...]]}`}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
          />

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyPasted}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Apply AOI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
