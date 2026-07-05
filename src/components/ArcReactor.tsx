import React from 'react';

interface ArcReactorProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing';
  onClick?: () => void;
}

export default function ArcReactor({ state, onClick }: ArcReactorProps) {
  const getColors = () => {
    switch (state) {
      case 'listening':
        return {
          glow: 'rgba(239, 68, 68, 0.4)', // Pulsing active red
          border: 'border-red-500',
          text: 'text-red-400',
          bg: 'bg-red-500/10',
          animateSpeed: 'animate-[spin_2s_linear_infinite]',
          coreColor: '#ef4444'
        };
      case 'thinking':
        return {
          glow: 'rgba(234, 179, 8, 0.4)', // Amber yellow
          border: 'border-yellow-500',
          text: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          animateSpeed: 'animate-[spin_1.2s_linear_infinite]',
          coreColor: '#eab308'
        };
      case 'speaking':
        return {
          glow: 'rgba(16, 185, 129, 0.4)', // Pulsing speaking emerald green
          border: 'border-emerald-500',
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          animateSpeed: 'animate-[spin_3s_linear_infinite]',
          coreColor: '#10b981'
        };
      case 'processing':
        return {
          glow: 'rgba(168, 85, 247, 0.4)', // Magical purple for scripts running
          border: 'border-purple-500',
          text: 'text-purple-400',
          bg: 'bg-purple-500/10',
          animateSpeed: 'animate-[spin_0.8s_linear_infinite]',
          coreColor: '#a855f7'
        };
      case 'idle':
      default:
        return {
          glow: 'rgba(6, 182, 212, 0.4)', // Cyan
          border: 'border-cyan-500',
          text: 'text-cyan-400',
          bg: 'bg-cyan-500/5',
          animateSpeed: 'animate-[spin_6s_linear_infinite]',
          coreColor: '#06b6d4'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="flex flex-col items-center justify-center p-6 select-none">
      <div 
        id="arc-reactor-touchpoint"
        onClick={onClick}
        className={`relative w-48 h-48 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500 ${colors.bg}`}
        style={{
          boxShadow: `0 0 40px 10px ${colors.glow}, inset 0 0 30px 5px ${colors.glow}`,
        }}
      >
        {/* Outer Tech Ring 1 */}
        <div className={`absolute inset-0 border-2 border-dashed rounded-full opacity-60 ${colors.border} ${colors.animateSpeed}`}></div>
        
        {/* Outer Tech Ring 2 (Counter-rotated) */}
        <div className={`absolute inset-2 border border-dotted rounded-full opacity-40 ${colors.border} animate-[spin_12s_linear_infinite_reverse]`}></div>

        {/* Triangle Shard Mask Core */}
        <div className="absolute inset-4 rounded-full border border-cyan-500/20 flex items-center justify-center">
          <svg className="w-full h-full transform rotate-90" viewBox="0 0 100 100">
            {/* Triangular segmentation of Arc Reactor */}
            {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg) => (
              <line
                key={deg}
                x1="50"
                y1="10"
                x2="50"
                y2="20"
                stroke={colors.coreColor}
                strokeWidth="2"
                strokeOpacity="0.8"
                transform={`rotate(${deg} 50 50)`}
                className="transition-all duration-500"
              />
            ))}
            
            {/* Center Outer Hexagon/Circle */}
            <circle cx="50" cy="50" r="28" fill="none" stroke={colors.coreColor} strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="3,3" />
            <circle cx="50" cy="50" r="22" fill="none" stroke={colors.coreColor} strokeWidth="1" strokeOpacity="0.6" />
          </svg>
        </div>

        {/* Pulsing Central Power Node */}
        <div 
          className={`w-12 h-12 rounded-full flex items-center justify-center bg-black/40 border-2 transition-all duration-500 ${
            state === 'listening' ? 'border-red-500 scale-110 animate-ping' :
            state === 'thinking' ? 'border-yellow-500 animate-pulse' :
            state === 'speaking' ? 'border-emerald-500 animate-bounce' :
            'border-cyan-400'
          }`}
          style={{
            boxShadow: `0 0 25px 5px ${colors.coreColor}`,
          }}
        >
          {/* Internal core bulb */}
          <div 
            className="w-6 h-6 rounded-full transition-all duration-500"
            style={{
              backgroundColor: colors.coreColor,
              boxShadow: `0 0 15px 3px ${colors.coreColor}`,
            }}
          />
        </div>

        {/* Ambient Hologram Grid lines overlay */}
        <div className="absolute inset-0 rounded-full overflow-hidden bg-radial-gradient pointer-events-none opacity-20"></div>
      </div>

      {/* Sub-status Indicator text */}
      <div className="mt-4 text-center">
        <p className={`font-mono text-xs tracking-[0.25em] font-semibold uppercase ${colors.text}`}>
          {state === 'idle' && '● CORE_NOMINAL_ON'}
          {state === 'listening' && '🎤 LISTENING_ACTIVE'}
          {state === 'thinking' && '⚙️ COGNITIVE_PROCESS_ON'}
          {state === 'speaking' && '🗣️ VOCAL_PROTOCOL_ACTIVE'}
          {state === 'processing' && '⚡ VIRTUAL_SANDBOX_BUSY'}
        </p>
        <span className="font-mono text-[10px] text-gray-500 block mt-1 tracking-wider">
          {state === 'idle' && 'PRESIONE EL NÚCLEO PARA HABLAR'}
          {state === 'listening' && 'ESCUCHANDO COMANDO DE VOZ...'}
          {state === 'thinking' && 'CALCULANDO COGNICIÓN RED...'}
          {state === 'speaking' && 'JARVIS RETROALIMENTANDO...'}
          {state === 'processing' && 'SINTETIZANDO CÓDIGO FUENTE...'}
        </span>
      </div>
    </div>
  );
}
