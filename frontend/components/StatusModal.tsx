"use client";

import React, { useEffect, useState } from "react";
import { X, Server, AlertCircle, KeyRound, Globe2, ShieldCheck, Database, Loader2 } from "lucide-react";
import { checkBackendHealth } from "../lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const StatusModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [healthData, setHealthData] = useState<{
    status: string;
    bhoonidhi_configured: boolean;
    overpass_url: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      checkBackendHealth()
        .then((data) => setHealthData(data))
        .catch(() => setHealthData(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-700 shadow-2xl p-6 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">System Status & Bhoonidhi Settings</h3>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400 ml-1" />}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Backend & Services Health Cards */}
        <div className="space-y-3">
          {/* FastAPI Backend */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">FastAPI Local Engine</div>
                <div className="text-[10px] text-slate-400">http://127.0.0.1:8000 &bull; Asyncio Job Queue</div>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                healthData?.status === "online"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {healthData?.status === "online" ? "CONNECTED" : "OFFLINE"}
            </span>
          </div>

          {/* Bhoonidhi Auth Status */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white text-xs">ISRO Bhoonidhi STAC Authentication</div>
                  <div className="text-[10px] text-slate-400">
                    {healthData?.bhoonidhi_configured
                      ? "User credentials configured in backend/.env"
                      : "No credentials entered (using open STAC fallback)"}
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                  healthData?.bhoonidhi_configured
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                {healthData?.bhoonidhi_configured ? "AUTHENTICATED" : "OPEN FALLBACK"}
              </span>
            </div>

            {!healthData?.bhoonidhi_configured && (
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-[11px] space-y-1.5 text-slate-300">
                <p className="font-medium text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  How to enable direct Bhoonidhi IRS downloads:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                  <li>Open <code className="text-cyan-300">backend/.env</code> in your editor.</li>
                  <li>Set your Bhoonidhi credentials:
                    <pre className="mt-1 p-2 bg-slate-900 rounded font-mono text-[10px] text-cyan-300 border border-slate-800">
BHOONIDHI_USER_ID=your_username{"\n"}
BHOONIDHI_PASSWORD=your_password
                    </pre>
                  </li>
                  <li>Restart the backend service to activate token retrieval.</li>
                </ol>
              </div>
            )}
          </div>

          {/* OSM Overpass */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Globe2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">OpenStreetMap Overpass Engine</div>
                <div className="text-[10px] text-slate-400 truncate max-w-[280px]">
                  {healthData?.overpass_url || "https://overpass-api.de/api/interpreter"}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              ACTIVE
            </span>
          </div>

          {/* Cache & Local GeoTIFF generator */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">Rasterio GeoTIFF Mask Generator</div>
                <div className="text-[10px] text-slate-400">Burn road classes into training masks on demand</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
              READY
            </span>
          </div>
        </div>

        <div className="mt-5 flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
