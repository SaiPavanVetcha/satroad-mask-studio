"use client";

import React from "react";
import { HoveredRoadState } from "../lib/types";
import { ExternalLink, Compass, Gauge, Layers, Milestone, Info } from "lucide-react";

interface Props {
  hoverData: HoveredRoadState | null;
}

export const RoadHoverCard: React.FC<Props> = ({ hoverData }) => {
  if (!hoverData) return null;

  const { properties: road, x, y } = hoverData;

  // Clamp popup within viewport
  const cardWidth = 280;
  const cardHeight = 260;
  const posX = Math.min(x + 16, window.innerWidth - cardWidth - 20);
  const posY = Math.min(y + 16, window.innerHeight - cardHeight - 20);

  return (
    <div
      style={{
        position: "fixed",
        left: `${posX}px`,
        top: `${posY}px`,
        pointerEvents: "none",
        zIndex: 50,
      }}
      className="glass-panel w-[280px] rounded-xl p-3.5 shadow-2xl transition-all duration-75 border border-cyan-500/30 text-xs backdrop-blur-md"
    >
      {/* Header with Road Name and Class Badge */}
      <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2 mb-2.5">
        <div className="min-w-0">
          <h4 className="font-bold text-white text-sm truncate flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: road.color }}
            />
            {road.name || "Unnamed Way"}
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            OSM #{road.osm_id}
          </span>
        </div>
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase shrink-0 border"
          style={{
            borderColor: `${road.color}66`,
            backgroundColor: `${road.color}22`,
            color: road.color,
          }}
        >
          {road.road_class}
        </span>
      </div>

      {/* Grid of Road Details */}
      <div className="grid grid-cols-2 gap-2 text-slate-300">
        <div className="bg-slate-800/50 rounded-lg p-2 border border-white/5">
          <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase">
            <Milestone className="w-3 h-3 text-cyan-400" />
            <span>Length</span>
          </div>
          <div className="font-medium text-white text-xs mt-0.5">
            {road.length_km >= 1 ? `${road.length_km} km` : `${road.length_m} m`}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2 border border-white/5">
          <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase">
            <Layers className="w-3 h-3 text-emerald-400" />
            <span>Lanes</span>
          </div>
          <div className="font-medium text-white text-xs mt-0.5">
            {road.lanes !== "Not specified" ? road.lanes : "1 lane (est.)"}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2 border border-white/5">
          <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase">
            <Gauge className="w-3 h-3 text-amber-400" />
            <span>Maxspeed</span>
          </div>
          <div className="font-medium text-white text-xs mt-0.5">
            {road.maxspeed !== "Not specified" ? `${road.maxspeed}` : "Default"}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2 border border-white/5">
          <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase">
            <Compass className="w-3 h-3 text-indigo-400" />
            <span>Surface</span>
          </div>
          <div className="font-medium text-white text-xs mt-0.5 capitalize truncate">
            {road.surface !== "Not specified" ? road.surface : "Paved"}
          </div>
        </div>
      </div>

      {/* Flags: One-way, Bridge, Tunnel */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          {road.oneway === "yes" && (
            <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
              One-way
            </span>
          )}
          {road.bridge === "yes" && (
            <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">
              Bridge
            </span>
          )}
          {road.tunnel === "yes" && (
            <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
              Tunnel
            </span>
          )}
          {road.oneway !== "yes" && road.bridge !== "yes" && road.tunnel !== "yes" && (
            <span className="text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3" /> Two-way ground
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-cyan-400 underline decoration-cyan-500/50">
          <span>OSM View</span>
          <ExternalLink className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};
