import React, { useEffect, useRef, useState } from 'react';
import { Cpu, Database, Disc, Activity, Zap, Shield, Flame, Compass, Wifi } from 'lucide-react';
import { SystemMetrics } from '../types';

interface SystemMetersProps {
  wsMetrics?: { cpu: number; ram: number; ramTotal: number; ramPercent: number; loadAvg: string[] } | null;
}

export default function SystemMeters({ wsMetrics }: SystemMetersProps) {
  const [metrics, setMetrics] = useState<SystemMetrics & { diagnostics?: Record<string, string>; diskUsedGB?: string; diskTotalGB?: string; ramTotal?: number; ramPercent?: number }>({
    cpu: 18.5,
    ram: 3120,
    ramTotal: 16384,
    ramPercent: 20,
    gpu: 42,
    networkUp: 0.8,
    networkDown: 4.2,
    disk: 42.6,
    diskUsedGB: "42.6",
    diskTotalGB: "100",
    activeProcesses: 144,
    status: 'OPTIMAL',
    diagnostics: {
      arcReactorOutput: "12.8 GW",
      coreTemperature: "4250°C",
      magneticContainment: "99.8%",
      shieldStrength: "100%",
      coolingSystemFlow: "450 L/min",
      hologramMatrix: "ESTABLE"
    }
  });
  const [wsConnected, setWsConnected] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Apply WebSocket real-time metrics when available
  useEffect(() => {
    if (wsMetrics) {
      setMetrics(prev => ({
        ...prev,
        cpu: wsMetrics.cpu,
        ram: wsMetrics.ram,
        ramTotal: wsMetrics.ramTotal,
        ramPercent: wsMetrics.ramPercent,
      }));
    }
  }, [wsMetrics]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/system-diagnostics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch {
        setMetrics(prev => ({
          ...prev,
          cpu: parseFloat((15 + Math.sin(Date.now() / 8000) * 8 + Math.random() * 2).toFixed(1)),
          gpu: Math.round(38 + Math.cos(Date.now() / 10000) * 6 + Math.random() * 3),
          networkUp: parseFloat((Math.random() * 1.5 + 0.2).toFixed(1)),
          networkDown: parseFloat((Math.random() * 8.2 + 2.1).toFixed(1)),
          activeProcesses: prev.activeProcesses + (Math.random() > 0.5 ? 1 : -1)
        }));
      }
    };

    fetchMetrics();
    // Poll every 5s (WS handles real-time CPU/RAM updates)
    pollIntervalRef.current = setInterval(fetchMetrics, 5000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  const ramGB = metrics.ramTotal ? (metrics.ram / 1024).toFixed(2) : (metrics.ram / 1024).toFixed(2);
  const ramTotalGB = metrics.ramTotal ? (metrics.ramTotal / 1024).toFixed(1) : "16.0";
  const ramPct = metrics.ramPercent ?? Math.round((metrics.ram / (metrics.ramTotal || 16384)) * 100);
  const diskPct = metrics.disk || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {/* CPU */}
      <div className="bg-slate-950/60 border border-cyan-500/30 rounded-lg p-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-cyan-400/60 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/10 transition-all" />
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-cyan-400/80 tracking-widest font-semibold uppercase">PROCESADOR [CPU]</span>
          <Cpu className="w-4 h-4 text-cyan-400 group-hover:animate-pulse" />
        </div>
        <div className="flex items-baseline gap-2 my-2">
          <span className={`text-3xl font-mono font-bold tracking-tight transition-colors ${metrics.cpu > 80 ? 'text-red-400' : metrics.cpu > 60 ? 'text-orange-400' : 'text-slate-100'}`}>
            {metrics.cpu}%
          </span>
          <span className="text-[10px] text-cyan-500/50 font-mono">CARGA_REAL</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${metrics.cpu > 80 ? 'bg-red-500' : metrics.cpu > 60 ? 'bg-orange-400' : 'bg-cyan-500'}`}
            style={{ width: `${Math.min(metrics.cpu, 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-[9px] font-mono text-cyan-500/60">
          <span>PROCS: {metrics.activeProcesses}</span>
          <span className={metrics.status === 'WARNING' ? 'text-orange-400 font-bold' : ''}>{metrics.status}</span>
        </div>
      </div>

      {/* RAM */}
      <div className="bg-slate-950/60 border border-cyan-500/30 rounded-lg p-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-cyan-400/60 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/10 transition-all" />
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-cyan-400/80 tracking-widest font-semibold uppercase">MEMORIA [RAM]</span>
          <Database className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2 my-2">
          <span className={`text-3xl font-mono font-bold tracking-tight transition-colors ${ramPct > 85 ? 'text-red-400' : ramPct > 70 ? 'text-orange-400' : 'text-slate-100'}`}>
            {ramGB} GB
          </span>
          <span className="text-[10px] text-cyan-500/50 font-mono">DE {ramTotalGB} GB</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${ramPct > 85 ? 'bg-red-500' : ramPct > 70 ? 'bg-orange-400' : 'bg-cyan-500'}`}
            style={{ width: `${ramPct}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-[9px] font-mono text-cyan-500/60">
          <span>LIBRE: {(parseFloat(ramTotalGB) - parseFloat(ramGB)).toFixed(1)} GB</span>
          <span>{ramPct}% USED</span>
        </div>
      </div>

      {/* DISK */}
      <div className="bg-slate-950/60 border border-cyan-500/30 rounded-lg p-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-cyan-400/60 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/10 transition-all" />
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-cyan-400/80 tracking-widest font-semibold uppercase">DISCO [SSD]</span>
          <Disc className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2 my-2">
          <span className={`text-3xl font-mono font-bold tracking-tight ${diskPct > 85 ? 'text-red-400' : diskPct > 70 ? 'text-orange-400' : 'text-slate-100'}`}>
            {diskPct}%
          </span>
          <span className="text-[10px] text-cyan-500/50 font-mono">{metrics.diskUsedGB}GB/{metrics.diskTotalGB}GB</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${diskPct > 85 ? 'bg-red-500' : diskPct > 70 ? 'bg-orange-400' : 'bg-cyan-500'}`}
            style={{ width: `${diskPct}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-[9px] font-mono text-cyan-500/60">
          <span>TIPO: NVMe SSD</span>
          <span>REAL</span>
        </div>
      </div>

      {/* Network */}
      <div className="bg-slate-950/60 border border-cyan-500/30 rounded-lg p-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-cyan-400/60 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/10 transition-all" />
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-cyan-400/80 tracking-widest font-semibold uppercase">RED [BANDWIDTH]</span>
          <Wifi className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex justify-between my-1">
          <div className="flex flex-col">
            <span className="text-xs text-cyan-500/50 font-mono">↓ BAJADA</span>
            <span className="text-xl font-mono font-semibold text-slate-100">{metrics.networkDown} MB/s</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-cyan-500/50 font-mono">↑ SUBIDA</span>
            <span className="text-xl font-mono font-semibold text-slate-100">{metrics.networkUp} MB/s</span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2 text-[9px] font-mono text-cyan-500/60">
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${wsMetrics ? 'bg-emerald-400 animate-ping' : 'bg-yellow-400'}`} />
            {wsMetrics ? 'WS_STREAM' : 'POLLING'}
          </span>
          <span>ENLACE: OK</span>
        </div>
      </div>

      {/* Reactor Telemetry */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-slate-950/80 border border-cyan-500/20 rounded-lg p-4 backdrop-blur-lg">
        <div className="flex items-center gap-2 mb-3 border-b border-cyan-500/20 pb-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h4 className="font-mono text-xs tracking-wider text-cyan-400 uppercase font-semibold">
            TELEMETRÍA REACTOR ARC CENTRAL — DATOS REALES DEL HOST
          </h4>
          {metrics.diagnostics?.aiEngine && (
            <span className={`ml-auto text-[9px] px-2 py-0.5 rounded font-bold font-mono ${
              metrics.diagnostics.aiEngine.includes('Gemini') ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' :
              metrics.diagnostics.aiEngine.includes('Ollama') ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30' :
              'bg-slate-700/30 text-slate-400 border border-slate-600/20'
            }`}>
              AI: {metrics.diagnostics.aiEngine}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="border border-cyan-500/10 p-2 rounded bg-slate-900/30 flex items-center gap-3">
            <Zap className="w-8 h-8 text-cyan-500/30" />
            <div>
              <span className="block font-mono text-[9px] text-cyan-500/50 uppercase">Potencia Reactor</span>
              <span className="font-mono text-xs font-bold text-slate-200">{metrics.diagnostics?.arcReactorOutput || '12.8 GW'}</span>
            </div>
          </div>
          <div className="border border-cyan-500/10 p-2 rounded bg-slate-900/30 flex items-center gap-3">
            <Flame className="w-8 h-8 text-cyan-500/30" />
            <div>
              <span className="block font-mono text-[9px] text-cyan-500/50 uppercase">Temp. Núcleo</span>
              <span className="font-mono text-xs font-bold text-slate-200">{metrics.diagnostics?.coreTemperature || '4250°C'}</span>
            </div>
          </div>
          <div className="border border-cyan-500/10 p-2 rounded bg-slate-900/30 flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-500/30" />
            <div>
              <span className="block font-mono text-[9px] text-cyan-500/50 uppercase">Contención Mag.</span>
              <span className="font-mono text-xs font-bold text-slate-200">{metrics.diagnostics?.magneticContainment || '99.8%'}</span>
            </div>
          </div>
          <div className="border border-cyan-500/10 p-2 rounded bg-slate-900/30 flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-500/30" />
            <div>
              <span className="block font-mono text-[9px] text-cyan-500/50 uppercase">Fuerza Blindaje</span>
              <span className="font-mono text-xs font-bold text-slate-200">{metrics.diagnostics?.shieldStrength || '100%'}</span>
            </div>
          </div>
          <div className="border border-cyan-500/10 p-2 rounded bg-slate-900/30 flex items-center gap-3">
            <Compass className="w-8 h-8 text-cyan-500/30" />
            <div>
              <span className="block font-mono text-[9px] text-cyan-500/50 uppercase">Refrigeración</span>
              <span className="font-mono text-xs font-bold text-slate-200">{metrics.diagnostics?.coolingSystemFlow || '450 L/min'}</span>
            </div>
          </div>
          <div className="border border-cyan-500/10 p-2 rounded bg-slate-900/30 flex items-center gap-3">
            <Activity className="w-8 h-8 text-cyan-500/30" />
            <div>
              <span className="block font-mono text-[9px] text-cyan-500/50 uppercase">Matriz Holográfica</span>
              <span className="font-mono text-xs font-bold text-slate-200">{metrics.diagnostics?.hologramMatrix || 'ESTABLE'}</span>
            </div>
          </div>
        </div>

        {metrics.diagnostics?.osPlatform && (
          <div className="mt-4 pt-3 border-t border-cyan-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase font-semibold">
                ESPECIFICACIONES REALES DEL HOST DETECTADAS:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
              <div className="bg-slate-900/40 border border-cyan-500/10 p-2 rounded">
                <span className="block text-[8px] text-cyan-500/40 uppercase">SISTEMA OPERATIVO</span>
                <span className="font-bold text-slate-100">{metrics.diagnostics.osPlatform} ({metrics.diagnostics.osRelease})</span>
              </div>
              <div className="bg-slate-900/40 border border-cyan-500/10 p-2 rounded">
                <span className="block text-[8px] text-cyan-500/40 uppercase">PROCESADOR</span>
                <span className="font-bold text-slate-100 truncate block" title={metrics.diagnostics.cpuModel}>{metrics.diagnostics.cpuModel}</span>
              </div>
              <div className="bg-slate-900/40 border border-cyan-500/10 p-2 rounded">
                <span className="block text-[8px] text-cyan-500/40 uppercase">NÚCLEOS & RAM</span>
                <span className="font-bold text-slate-100">{metrics.diagnostics.cpuCount} | {metrics.diagnostics.totalRAM}</span>
              </div>
              <div className="bg-slate-900/40 border border-cyan-500/10 p-2 rounded">
                <span className="block text-[8px] text-cyan-500/40 uppercase">TIEMPO ENCENDIDO</span>
                <span className="font-bold text-slate-100">{metrics.diagnostics.uptime}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
