import React, { useEffect, useState } from 'react';
import { Cpu, Database, Disc, Activity, Zap, Shield, Flame, Compass } from 'lucide-react';
import { SystemMetrics } from '../types';

export default function SystemMeters() {
  const [metrics, setMetrics] = useState<SystemMetrics & { diagnostics: Record<string, string> }>({
    cpu: 18.5,
    ram: 3120,
    gpu: 42,
    networkUp: 0.8,
    networkDown: 4.2,
    disk: 42.6,
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

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/system-diagnostics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        // Fallback to local simulated updates to save cycles
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
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {/* CPU Usage Meter */}
      <div id="metric-cpu" className="bg-slate-950/60 border border-cyan-500/30 rounded-lg p-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-cyan-400/60 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-cyan-500/10" />
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-cyan-400/80 tracking-widest font-semibold uppercase">PROCESADOR [CPU]</span>
          <Cpu className="w-4 h-4 text-cyan-400 group-hover:animate-pulse" />
        </div>
        <div className="flex items-baseline gap-2 my-2">
          <span className="text-3xl font-mono font-bold text-slate-100 tracking-tight">{metrics.cpu}%</span>
          <span className="text-[10px] text-cyan-500/50 font-mono">CORE_N_VIRT</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div className="bg-cyan-500 h-full transition-all duration-1000" style={{ width: `${metrics.cpu}%` }} />
        </div>
        <div className="flex justify-between items-center mt-2 text-[9px] font-mono text-cyan-500/60">
          <span>HILOS_ACTIVOS: {metrics.activeProcesses}</span>
          <span>ESTADO: {metrics.status}</span>
        </div>
      </div>

      {/* RAM Memory Usage */}
      <div id="metric-ram" className="bg-slate-950/60 border border-cyan-500/30 rounded-lg p-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-cyan-400/60 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-cyan-500/10" />
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-cyan-400/80 tracking-widest font-semibold uppercase">MEMORIA [RAM]</span>
          <Database className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2 my-2">
          <span className="text-3xl font-mono font-bold text-slate-100 tracking-tight">{(metrics.ram / 1024).toFixed(2)} GB</span>
          <span className="text-[10px] text-cyan-500/50 font-mono">DE 16.0 GB</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div className="bg-cyan-500 h-full transition-all duration-1000" style={{ width: `${(metrics.ram / 16384) * 100}%` }} />
        </div>
        <div className="flex justify-between items-center mt-2 text-[9px] font-mono text-cyan-500/60">
          <span>MEM_LIBRE: {(16 - metrics.ram / 1024).toFixed(1)} GB</span>
          <span>PÁGINAS: SWAP_OK</span>
        </div>
      </div>

      {/* GPU Graphic Accelerator */}
      <div id="metric-gpu" className="bg-slate-950/60 border border-cyan-500/30 rounded-lg p-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-cyan-400/60 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-cyan-500/10" />
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-cyan-400/80 tracking-widest font-semibold uppercase">GRAFOS [GPU]</span>
          <Activity className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2 my-2">
          <span className="text-3xl font-mono font-bold text-slate-100 tracking-tight">{metrics.gpu}%</span>
          <span className="text-[10px] text-cyan-500/50 font-mono">ARC_CORE_MAT</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div className="bg-cyan-500 h-full transition-all duration-1000" style={{ width: `${metrics.gpu}%` }} />
        </div>
        <div className="flex justify-between items-center mt-2 text-[9px] font-mono text-cyan-500/60">
          <span>VRAM_USED: 2.1 GB / 8.0 GB</span>
          <span>SOMBREADORES: OPTIMAL</span>
        </div>
      </div>

      {/* Network Bandwidth */}
      <div id="metric-network" className="bg-slate-950/60 border border-cyan-500/30 rounded-lg p-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-cyan-400/60 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-cyan-500/10" />
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-cyan-400/80 tracking-widest font-semibold uppercase">RED [BANDWIDTH]</span>
          <Disc className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex justify-between my-1">
          <div className="flex flex-col">
            <span className="text-xs text-cyan-500/50 font-mono">BAJADA</span>
            <span className="text-xl font-mono font-semibold text-slate-100">{metrics.networkDown} MB/s</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-cyan-500/50 font-mono">SUBIDA</span>
            <span className="text-xl font-mono font-semibold text-slate-100">{metrics.networkUp} MB/s</span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2 text-[9px] font-mono text-cyan-500/60">
          <span>IP: SECURE_CONTAINER</span>
          <span>ENLACE: SAT_LINK_9</span>
        </div>
      </div>

      {/* J.A.R.V.I.S Arc Reactor Core Metrics Grid (Expands to bottom) */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-slate-950/80 border border-cyan-500/20 rounded-lg p-4 backdrop-blur-lg">
        <div className="flex items-center gap-2 mb-3 border-b border-cyan-500/20 pb-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h4 className="font-mono text-xs tracking-wider text-cyan-400 uppercase font-semibold">
            TELEMETRÍA SUPERCOMPUTADOR INTELIGENTE [REACTOR ARC CENTRAL]
          </h4>
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
              <span className="block font-mono text-[9px] text-cyan-500/50 uppercase">Temp. del Núcleo</span>
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
              <span className="block font-mono text-[9px] text-cyan-500/50 uppercase">Refigeración Flow</span>
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
              <span className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase font-semibold">ESPECIFICACIONES DE HARDWARE DETECTADAS EN TU COMPUTADOR REAL:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
              <div className="bg-slate-900/40 border border-cyan-500/10 p-2 rounded">
                <span className="block text-[8px] text-cyan-500/40 uppercase">SISTEMA OPERATIVO</span>
                <span className="font-bold text-slate-100">{metrics.diagnostics.osPlatform} ({metrics.diagnostics.osRelease})</span>
              </div>
              <div className="bg-slate-900/40 border border-cyan-500/10 p-2 rounded">
                <span className="block text-[8px] text-cyan-500/40 uppercase">PROCESADOR REAL DE HOST</span>
                <span className="font-bold text-slate-100 truncate block" title={metrics.diagnostics.cpuModel}>{metrics.diagnostics.cpuModel}</span>
              </div>
              <div className="bg-slate-900/40 border border-cyan-500/10 p-2 rounded">
                <span className="block text-[8px] text-cyan-500/40 uppercase">NÚCLEOS & RAM TOTAL</span>
                <span className="font-bold text-slate-100">{metrics.diagnostics.cpuCount} | {metrics.diagnostics.totalRAM} RAM</span>
              </div>
              <div className="bg-slate-900/40 border border-cyan-500/10 p-2 rounded">
                <span className="block text-[8px] text-cyan-500/40 uppercase">TIEMPO DE ENCENDIDO (UPTIME)</span>
                <span className="font-bold text-slate-100">{metrics.diagnostics.uptime}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
