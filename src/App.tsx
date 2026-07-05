import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Terminal, Cpu, Database, Disc, Activity, Zap, Play, Trash2, Plus, 
  ToggleLeft, ToggleRight, Mic, MicOff, Volume2, VolumeX, Send, 
  FolderOpen, FileText, Code2, Save, Users, Sparkles,
  RefreshCw, AlertTriangle,
  Monitor, Laptop, Sliders,
  Camera, Globe, HardDrive, Network, ChevronRight, ChevronUp, Cpu as CpuIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ArcReactor from './components/ArcReactor';
import SystemMeters from './components/SystemMeters';
import { VirtualFile, Agent, AgentMessage, LogEntry, WorkflowRule, MemoryFact, ChatMessage, ChatReply, RealProcess, FileBrowseResult, NetworkInterface } from './types';

type ActiveTab = 'core' | 'pc_control' | 'agents' | 'workspace' | 'system_real';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('core');

  // System states
  const [reactorState, setReactorState] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'processing'>('idle');
  const [utcTime, setUtcTime] = useState('');
  const [chatPrompt, setChatPrompt] = useState('');
  const [speechActive, setSpeechActive] = useState(true);
  const [micState, setMicState] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Wake word activation
  const [isContinuousActive, setIsContinuousActive] = useState(true);
  const [lastWakeWordTime, setLastWakeWordTime] = useState<string | null>(null);

  // Hands-free continuous conversation mode
  const [isHandsFreeActive, setIsHandsFreeActiveState] = useState(false);
  const isHandsFreeActiveRef = useRef(false);
  const setIsHandsFreeActive = (val: boolean) => {
    setIsHandsFreeActiveState(val);
    isHandsFreeActiveRef.current = val;
  };

  // Conversation history for context
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  // WebSocket for real-time metrics
  const wsRef = useRef<WebSocket | null>(null);
  const [wsMetrics, setWsMetrics] = useState<{ cpu: number; ram: number; ramTotal: number; ramPercent: number; loadAvg: string[] } | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Real system data
  const [realProcesses, setRealProcesses] = useState<RealProcess[]>([]);
  const [networkInterfaces, setNetworkInterfaces] = useState<NetworkInterface[]>([]);
  const [fileBrowse, setFileBrowse] = useState<FileBrowseResult | null>(null);
  const [browsePath, setBrowsePath] = useState('');
  const [execOutput, setExecOutput] = useState('');
  const [execLoading, setExecLoading] = useState(false);

  // PC simulated environment
  const [pcProcesses, setPcProcesses] = useState([
    { pid: 1044, name: 'Spotify.exe', cpu: 1.2, ram: 180, active: true },
    { pid: 3912, name: 'Chrome.exe', cpu: 4.8, ram: 840, active: true },
    { pid: 5541, name: 'VSCode.exe', cpu: 12.4, ram: 1420, active: true },
    { pid: 7210, name: 'Discord.exe', cpu: 2.1, ram: 280, active: true },
    { pid: 8140, name: 'Blender.exe', cpu: 0.0, ram: 0, active: false },
    { pid: 9421, name: 'AutoCAD_Stark.exe', cpu: 0.0, ram: 0, active: false },
    { pid: 9982, name: 'QuantumCoreSim.exe', cpu: 32.5, ram: 4800, active: true }
  ]);
  const [pcPermissions, setPcPermissions] = useState({
    diskAccess: true,
    processControl: true,
    volumeAutomation: true,
    voiceAutomation: true,
    scriptInjections: true
  });
  const [pcConsoleLogs, setPcConsoleLogs] = useState<string[]>([
    'STARK DAEMON LINK v1.8.4 - Conexión de puente de red local establecida.',
    'Directorio raíz de PC enlazado: C:/Users/TonyStark/StarkLabs',
    'Escriba "help" para listar los comandos de diagnóstico de su computador.'
  ]);
  const [pcConsoleInput, setPcConsoleInput] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<boolean>(false);
  const [screenshotAnimation, setScreenshotAnimation] = useState<boolean>(false);

  // Data states
  const [vfs, setVfs] = useState<VirtualFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<VirtualFile | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [memories, setMemories] = useState<MemoryFact[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [newMemoryCat, setNewMemoryCat] = useState('Usuario');
  
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', trigger: '', action: '', category: 'system' as const });
  const [workflowStatus, setWorkflowStatus] = useState<string | null>(null);

  // Chat & Agent logs
  const [mainTerminalLogs, setMainTerminalLogs] = useState<LogEntry[]>([
    {
      id: 'log_init',
      message: 'J.A.R.V.I.S. Sistema Operativo Inteligente v4.2.0 cargado. Todos los subsistemas nominales.',
      type: 'system',
      timestamp: new Date().toLocaleTimeString()
    },
    {
      id: 'log_welcome',
      message: 'Buenos días, Señor. He enlazado su computadora portátil y el reactor arc principal de forma segura. Diga "Escúchame" para activarme por voz en cualquier momento.',
      type: 'success',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [chatReply, setChatReply] = useState<ChatReply | null>({
    text: "He completado la reorganización del panel holográfico. Los subsistemas de su computadora están enlazados. Ahora cuento con acceso completo a sus procesos, captura de pantalla y consola local, Señor.",
    speech: "Buenos días, Señor. Todos los sistemas y su computadora están enlazados."
  });

  // Multi-agent brainstorm arena
  const [agentTopic, setAgentTopic] = useState('Optimizar respuesta de voz activa Jarvis y evitar latencias en CPU local');
  const [agents, setAgents] = useState<Agent[]>([
    { id: 'architect', name: 'Arquitecto', role: 'System Architect', avatar: '📐', status: 'IDLE', color: 'text-cyan-400 border-cyan-400/40', description: 'Clean Architecture y modularidad' },
    { id: 'engineer', name: 'Ingeniero', role: 'Software Engineer', avatar: '💻', status: 'IDLE', color: 'text-blue-400 border-blue-400/40', description: 'Algoritmos y codificación' },
    { id: 'devops', name: 'DevOps', role: 'DevOps Expert', avatar: '🚀', status: 'IDLE', color: 'text-purple-400 border-purple-400/40', description: 'Pipelines y contenedores' },
    { id: 'security', name: 'Seguridad', role: 'Security Analyst', avatar: '🛡️', status: 'IDLE', color: 'text-red-400 border-red-400/40', description: 'OWASP y aislamiento de amenazas' }
  ]);
  const [brainstormMessages, setBrainstormMessages] = useState<AgentMessage[]>([]);
  const [brainstormSummary, setBrainstormSummary] = useState('');
  const [isBrainstorming, setIsBrainstorming] = useState(false);

  // Music Player Simulation
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [currentSong, setCurrentSong] = useState('Back in Black - AC/DC (Live at River Plate)');
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const continuousRecRef = useRef<any>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const pcConsoleEndRef = useRef<HTMLDivElement | null>(null);
  const isMicActiveRef = useRef(false);
  const hasLoggedHandsFreeStartRef = useRef(false);

  // Initial loads
  useEffect(() => {
    fetchVFS();
    fetchMemories();
    fetchWorkflows();
    fetchRealProcesses();
    fetchNetworkInterfaces();

    // Clock
    const timer = setInterval(() => {
      const now = new Date();
      setUtcTime(now.toLocaleTimeString() + ' - ' + now.toLocaleDateString());
    }, 1000);

    return () => {
      clearInterval(timer);
      stopAudioDrone();
    };
  }, []);

  // WebSocket connection for real-time metrics
  useEffect(() => {
    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          addLog('[WS] Stream de métricas en tiempo real conectado.', 'success');
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'metrics') {
              setWsMetrics({ cpu: data.cpu, ram: data.ram, ramTotal: data.ramTotal, ramPercent: data.ramPercent, loadAvg: data.loadAvg });
            }
          } catch {}
        };

        ws.onclose = () => {
          setWsConnected(false);
          wsRef.current = null;
          // Reconnect after 5s
          setTimeout(connectWS, 5000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setTimeout(connectWS, 8000);
      }
    };

    connectWS();
    return () => {
      if (wsRef.current) { wsRef.current.close(); }
    };
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mainTerminalLogs]);

  useEffect(() => {
    if (pcConsoleEndRef.current) {
      pcConsoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [pcConsoleLogs]);

  // Audio synthesis triggers
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15); // Sweep to A6
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1109.73, ctx.currentTime); // C#6
      osc2.frequency.exponentialRampToValueAtTime(2219.46, ctx.currentTime + 0.15); // Sweep to C#7
      
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Failed synth chime:", e);
    }
  };

  const playSystemBeep = (freq = 600, duration = 0.08, type: OscillatorType = 'sine') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  // Background Ambient Music Synth Drone
  const startAudioDrone = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(110, ctx.currentTime); // A2 fundamental
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(165, ctx.currentTime); // E3 perfect fifth

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();

      oscillatorRef.current = osc1; 
      gainNodeRef.current = gainNode;
      setIsPlayingMusic(true);

      addLog('Dispositivo multimedia activado. Reproduciendo sintetizador de fondo a baja frecuencia (110Hz).', 'success');
    } catch (err) {
      console.error("Audio drone error:", err);
    }
  };

  const stopAudioDrone = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {}
      oscillatorRef.current = null;
    }
    setIsPlayingMusic(false);
  };

  const toggleMusic = () => {
    playSystemBeep(520, 0.1);
    if (isPlayingMusic) {
      stopAudioDrone();
    } else {
      startAudioDrone();
    }
  };

  // WAKE WORD ("Jarvis" / "Escúchame") Continuous Speech Recognition loop
  useEffect(() => {
    if (!isContinuousActive) {
      if (continuousRecRef.current) {
        try { continuousRecRef.current.stop(); } catch (e) {}
      }
      return;
    }

    // Do not run background wake-word loop if active chat mic is running, if hands-free is active, or if Jarvis is thinking/speaking
    if (micState || isHandsFreeActive || reactorState === 'thinking' || reactorState === 'speaking' || reactorState === 'listening') {
      if (continuousRecRef.current) {
        try { continuousRecRef.current.stop(); } catch (e) {}
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let active = true;
    let rec: any = null;

    const runContinuousListener = () => {
      if (!active) return;
      try {
        rec = new SpeechRecognition();
        rec.continuous = false; // Using short segment loop is much more robust on browsers
        rec.interimResults = true;
        rec.lang = 'es-ES';

        rec.onresult = (e: any) => {
          const resultText = Array.from(e.results)
            .map((r: any) => r[0].transcript)
            .join('')
            .toLowerCase();

          const hasJarvis = resultText.includes('jarvis') || resultText.includes('yarvis');
          const hasEscuchame = resultText.includes('escúchame') || resultText.includes('escuchame') || resultText.includes('escucha me');

          if (hasJarvis || hasEscuchame) {
            active = false;
            rec.stop();
            
            // Highlight the reactor and trigger visual chime!
            playChime();
            setLastWakeWordTime(new Date().toLocaleTimeString());

            if (hasJarvis) {
              setIsHandsFreeActive(true);
              hasLoggedHandsFreeStartRef.current = false;
              addLog("[WAKE_WORD] Palabra clave 'Jarvis' detectada. Iniciando charla continua interactiva.", 'system');

              // Extract prompt text after the wake word if any
              let commandText = '';
              const regex = /jarvis|yarvis/i;
              const parts = resultText.split(regex);
              if (parts.length > 1 && parts[1].trim().length > 1) {
                commandText = parts[1].trim();
              }

              if (commandText) {
                addLog(`[VOZ DIRECTA CONTINUA]: "${commandText}"`, 'info');
                handleChatSubmit(commandText);
              } else {
                speakText("Modo de charla continua activado, Señor. Adelante, le escucho.");
                setReactorState('listening');
                setMicState(true);
                
                // Launch active microphone after voice synthesis
                setTimeout(() => {
                  startActiveMicrophone();
                }, 1800);
              }
            } else {
              setIsHandsFreeActive(false);
              hasLoggedHandsFreeStartRef.current = false;
              addLog("[WAKE_WORD] Palabra clave 'Escúchame' detectada en segundo plano.", 'system');

              // Extract prompt text after the wake word if any
              let commandText = '';
              const regex = /escúchame|escuchame|escucha me/i;
              const parts = resultText.split(regex);
              if (parts.length > 1 && parts[1].trim().length > 1) {
                commandText = parts[1].trim();
              }

              if (commandText) {
                addLog(`[VOZ DIRECTA]: "${commandText}"`, 'info');
                handleChatSubmit(commandText);
              } else {
                // Only wake word stated, speak acknowledgment and turn on active recording
                speakText("Sí, Señor. Estoy a su escucha.");
                setReactorState('listening');
                setMicState(true);
                
                // Launch active microphone after voice synthesis
                setTimeout(() => {
                  startActiveMicrophone();
                }, 1200);
              }
            }
          }
        };

        rec.onerror = (e: any) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') {
            console.warn("Background mic warning:", e.error);
          }
        };

        rec.onend = () => {
          if (active && isContinuousActive && !micState && reactorState === 'idle') {
            setTimeout(runContinuousListener, 400);
          }
        };

        continuousRecRef.current = rec;
        rec.start();
      } catch (err) {
        console.error("Wake-word error initiation:", err);
      }
    };

    runContinuousListener();

    return () => {
      active = false;
      if (rec) {
        try { rec.stop(); } catch (e) {}
      }
    };
  }, [isContinuousActive, micState, reactorState, isHandsFreeActive]);

  // Active microphone session trigger
  const startActiveMicrophone = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isMicActiveRef.current) {
      console.log("SpeechRecognition already active, skipping start.");
      return;
    }

    try {
      isMicActiveRef.current = true;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'es-ES';

      rec.onstart = () => {
        setMicState(true);
        setReactorState('listening');
        if (!isHandsFreeActiveRef.current || !hasLoggedHandsFreeStartRef.current) {
          addLog("Capturador sintonizado. Escuchando su comando, Señor...", "info");
          hasLoggedHandsFreeStartRef.current = true;
        }
      };

      rec.onresult = (e: any) => {
        const resultText = e.results[0][0].transcript;
        addLog(`Voz procesada: "${resultText}"`, "success");
        handleChatSubmit(resultText);
      };

      rec.onerror = (e: any) => {
        isMicActiveRef.current = false;
        const errStr = String(e.error || '').toLowerCase();
        if (errStr === 'no-speech' || errStr === 'aborted' || errStr.includes('abort')) {
          // Normal background silences/abortions, do not throw explicit error state
        } else {
          setMicError(`Fallo de audio (${e.error}). Compruebe permisos.`);
        }
        setMicState(false);
        setReactorState('idle');
      };

      rec.onend = () => {
        isMicActiveRef.current = false;
        setMicState(false);
        setReactorState('idle');

        // Auto-restart if hands-free mode is on AND Jarvis is not thinking or speaking
        if (isHandsFreeActiveRef.current && !window.speechSynthesis.speaking) {
          setTimeout(() => {
            if (isHandsFreeActiveRef.current && !window.speechSynthesis.speaking && !isMicActiveRef.current) {
              startActiveMicrophone();
            }
          }, 300);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      isMicActiveRef.current = false;
      setMicError("Fallo al inicializar micrófono activo.");
    }
  };

  const toggleSpeechRecognition = () => {
    playSystemBeep(700, 0.08);
    if (micState || isMicActiveRef.current) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      isMicActiveRef.current = false;
      setMicState(false);
      setReactorState('idle');
    } else {
      setMicError(null);
      startActiveMicrophone();
    }
  };

  // Real system data fetchers
  const fetchRealProcesses = async () => {
    try {
      const res = await fetch('/api/processes');
      if (res.ok) setRealProcesses(await res.json());
    } catch {}
  };

  const fetchNetworkInterfaces = async () => {
    try {
      const res = await fetch('/api/network');
      if (res.ok) setNetworkInterfaces(await res.json());
    } catch {}
  };

  const browseFilesystem = async (targetPath: string) => {
    try {
      setBrowsePath(targetPath);
      const res = await fetch(`/api/browse?path=${encodeURIComponent(targetPath)}`);
      if (res.ok) setFileBrowse(await res.json());
    } catch (err: any) {
      addLog(`Error explorando ${targetPath}: ${err.message}`, 'error');
    }
  };

  const execSafeCommand = async (command: string) => {
    setExecLoading(true);
    setExecOutput('');
    try {
      const res = await fetch('/api/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const data = await res.json();
      setExecOutput(data.output || data.error || '(sin salida)');
      addLog(`[EXEC] Comando '${command}' ejecutado.`, data.success ? 'success' : 'warning');
    } catch (err: any) {
      setExecOutput(`Error: ${err.message}`);
    } finally {
      setExecLoading(false);
    }
  };

  // PC local command terminal simulator
  const executePcCommand = (cmd: string = '') => {
    const targetCmd = (cmd || pcConsoleInput).trim();
    if (!targetCmd) return;

    setPcConsoleInput('');
    setPcConsoleLogs(prev => [...prev, `stark@laptop:~$ ${targetCmd}`]);
    playSystemBeep(450, 0.05, 'triangle');

    const lower = targetCmd.toLowerCase();
    const parts = lower.split(' ');
    const command = parts[0];
    const argument = parts.slice(1).join(' ');

    setTimeout(() => {
      let response: string[] = [];
      if (command === 'help') {
        response = [
          'Comandos de control del Computador Jarvis Mk V:',
          '  sysinfo          - Ver especificaciones REALES del hardware del host.',
          '  processes        - Listar procesos REALES activos (top CPU).',
          '  realprocs        - Recargar lista de procesos reales del OS.',
          '  network          - Ver interfaces de red reales del host.',
          '  kill <pid|name>  - Terminar un proceso simulado.',
          '  launch <name>    - Lanzar un proceso simulado.',
          '  screenshot       - Captura de pantalla holográfica.',
          '  disk_scan        - Analizar espacio en disco real.',
          '  cpu_stress       - Test de estrés de CPU.',
          '  clear            - Limpiar consola.'
        ];
      } else if (command === 'sysinfo') {
        // Show REAL system info
        const fetchAndShowSysinfo = async () => {
          try {
            const res = await fetch('/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 'cpu_info' }) });
            const data = await res.json();
            setPcConsoleLogs(prev => [...prev, '[INFO REAL DEL HOST]', ...data.output.split('\n').slice(0, 10).map((l: string) => `  ${l}`)]);
          } catch {}
        };
        fetchAndShowSysinfo();
        response = [
          '[SOLICITANDO INFO REAL DEL HOST...]',
          '[HOST] Plataforma: ' + window.navigator.platform,
          '[HOST] User Agent: ' + window.navigator.userAgent.split('(')[1]?.split(')')[0] || 'N/A',
        ];
      } else if (command === 'realprocs') {
        fetchRealProcesses().then(() => {
          setPcConsoleLogs(prev => [...prev,
            '[PROCESOS REALES DEL HOST]',
            'PID\tNOMBRE\t\t\tCPU\tRAM',
            '─'.repeat(50),
            ...realProcesses.slice(0, 15).map(p => `${p.pid}\t${p.name.substring(0, 20).padEnd(20)}\t${p.cpu.toFixed(1)}%\t${p.ram}MB`)
          ]);
        });
        response = ['[ACTUALIZANDO PROCESOS REALES DEL HOST...]'];
      } else if (command === 'network') {
        fetchNetworkInterfaces().then(() => {
          setPcConsoleLogs(prev => [...prev,
            '[INTERFACES DE RED REALES]',
            ...networkInterfaces.map(ni => `  ${ni.name.padEnd(10)} ${ni.address.padEnd(16)} ${ni.internal ? '(loopback)' : '(externa)'}`)
          ]);
        });
        response = ['[OBTENIENDO INTERFACES DE RED REALES...]'];
      } else if (command === 'processes') {
        // Show real processes if available, else simulated
        if (realProcesses.length > 0) {
          response = [
            '[PROCESOS REALES DEL HOST]',
            'PID\tNOMBRE\t\t\t\tCPU\tRAM(MB)',
            '─'.repeat(60),
            ...realProcesses.slice(0, 15).map(p => `${String(p.pid).padEnd(7)}\t${p.name.substring(0, 22).padEnd(22)}\t${p.cpu.toFixed(1)}%\t${p.ram}MB`)
          ];
        } else {
          response = [
            'PID\tPROCESO\t\tCPU\tRAM (MB)\tESTADO',
            '─'.repeat(55),
            ...pcProcesses.map(p => `${p.pid}\t${p.name.padEnd(16)}\t${p.active ? p.cpu : '0.0'}%\t${p.active ? p.ram : '0'}\t${p.active ? 'EJECUTÁNDOSE' : 'INACTIVO'}`)
          ];
        }
      } else if (command === 'kill') {
        if (!argument) {
          response = ['Error: Especifique el PID o el nombre del proceso a terminar. Ej: kill Chrome.exe'];
        } else {
          let found = false;
          const updated = pcProcesses.map(p => {
            if (p.name.toLowerCase() === argument || p.pid.toString() === argument) {
              found = true;
              return { ...p, active: false, cpu: 0, ram: 0 };
            }
            return p;
          });

          if (found) {
            setPcProcesses(updated);
            response = [`[SUCCESS] Señal SIGKILL enviada. Proceso "${argument}" terminado y liberado de memoria.`];
            addLog(`[PC_CONTROL] Proceso "${argument}" cerrado a petición del Señor.`, 'warning');
          } else {
            response = [`Error: No se encontró el proceso "${argument}" en la tabla de procesos.`];
          }
        }
      } else if (command === 'launch') {
        if (!argument) {
          response = ['Error: Especifique el nombre del programa a iniciar. Ej: launch Blender.exe'];
        } else {
          let found = false;
          const updated = pcProcesses.map(p => {
            if (p.name.toLowerCase().includes(argument)) {
              found = true;
              return { ...p, active: true, cpu: parseFloat((Math.random() * 8 + 2).toFixed(1)), ram: Math.floor(Math.random() * 500) + 150 };
            }
            return p;
          });

          if (found) {
            setPcProcesses(updated);
            response = [`[SUCCESS] Inicializando recursos. Programa "${argument}" lanzado con éxito.`];
            addLog(`[PC_CONTROL] Programa "${argument}" iniciado por comando local.`, 'success');
          } else {
            // Register as new process
            const newPid = Math.floor(Math.random() * 9000) + 1000;
            const newName = argument.endsWith('.exe') ? argument : `${argument}.exe`;
            setPcProcesses(prev => [...prev, { pid: newPid, name: newName, cpu: 5.2, ram: 380, active: true }]);
            response = [`[SUCCESS] Proceso no listado. Creando nueva instancia para "${newName}" con PID [${newPid}].`];
            addLog(`[PC_CONTROL] Nuevo programa "${newName}" registrado y abierto.`, 'success');
          }
        }
      } else if (command === 'screenshot') {
        triggerScreenshotCapture();
        response = [
          'Iniciando captura de pantalla de escritorio...',
          '[CAMERA] Lente holográfico activo. Decodificando búfer de pixeles...',
          '[SUCCESS] Captura de pantalla procesada. Proyectando visualizador de escritorio.'
        ];
      } else if (command === 'disk_scan') {
        response = [
          'Iniciando escaneo de directorios locales...',
          '  Buscando archivos temporales en C:/Users/TonyStark/AppData/Temp...',
          '  Analizando búferes obsoletos de compilación en StarkLabs/cache...',
          '[COMPACT] Encontrados 14,208 archivos de depuración (~8.42 GB recuperables).',
          'Diga "Jarvis, ejecuta limpieza de sistema" para purgar estos recursos.'
        ];
      } else if (command === 'cpu_stress') {
        response = [
          '[WARNING] INICIANDO PRUEBA DE ESFUERZO (CPU STRESS TEST)...',
          '  Cargando subprocesos recursivos de cálculo de matriz en todos los núcleos...',
          '  Carga de procesador aumentada artificialmente al 98%.'
        ];
        addLog('[ALERTA DE SISTEMA] Test de estrés del procesador iniciado. Carga al 98.4%. Calentamiento de núcleos activo.', 'warning');
        
        // Simular pico de CPU en la telemetría local
        setTimeout(() => {
          addLog('[SISTEMA] Test de estrés terminado. Retornando a niveles térmicos nominales.', 'success');
        }, 5000);
      } else if (command === 'clear') {
        setPcConsoleLogs([]);
        return;
      } else {
        response = [`Error: Comando "${command}" no reconocido. Escriba "help" para ver opciones.`];
      }

      setPcConsoleLogs(prev => [...prev, ...response]);
    }, 600);
  };

  // Trigger screenshot flash effect
  const triggerScreenshotCapture = () => {
    setScreenshotAnimation(true);
    playSystemBeep(1200, 0.2, 'sine');
    addLog('[PC_CONTROL] Captura de pantalla tomada con éxito. Cargando render holográfico.', 'success');
    setTimeout(() => {
      setScreenshotAnimation(false);
      setScreenshotPreview(true);
    }, 500);
  };

  // Cognitive core communication submit
  const handleChatSubmit = async (customPrompt?: string) => {
    const promptToSend = customPrompt || chatPrompt;
    if (!promptToSend.trim()) return;

    // Intercept voice-command stop phrases instantly
    const lowerPrompt = promptToSend.toLowerCase().trim();
    const stopWords = ['para', 'stop', 'detente', 'cállate', 'callate', 'silencio', 'apaga el micrófono', 'detener conversación', 'detener', 'parar'];
    const isStopWord = stopWords.some(word => lowerPrompt === word || lowerPrompt.startsWith(word + ' ') || lowerPrompt.endsWith(' ' + word));
    
    if (isStopWord) {
      setIsHandsFreeActive(false);
      window.speechSynthesis.cancel();
      setReactorState('idle');
      setMicState(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      addLog("CONVERSACIÓN DETENIDA: Modo manos libres cancelado por orden verbal.", "warning");
      speakText("Entendido, Señor. Deteniendo conversación activa y apagando el micrófono.");
      return;
    }

    if (!customPrompt) {
      setChatPrompt('');
    }

    addLog(`[SEÑOR]: ${promptToSend}`, 'system');
    setReactorState('thinking');

    // Add to history before request
    const newHistory: ChatMessage[] = [...conversationHistory, { role: 'user', content: promptToSend, timestamp: new Date().toISOString() }];
    setConversationHistory(newHistory);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToSend, history: newHistory.slice(-8) })
      });

      if (res.ok) {
        const reply = await res.json();
        setChatReply({ text: reply.text, speech: reply.speech, acting_agent: reply.acting_agent, aiSource: reply.aiSource });
        // Update history with assistant reply
        setConversationHistory(prev => [...prev, { role: 'assistant', content: reply.text, timestamp: new Date().toISOString() }]);
        
        addLog(`[JARVIS]: ${reply.speech}`, 'success');
        speakText(reply.speech);

        if (reply.acting_agent) {
          // Highlight that specific agent as WORKING
          setAgents(prev => prev.map(a => a.id === reply.acting_agent ? { ...a, status: 'WORKING' } : a));
          setTimeout(() => {
            setAgents(prev => prev.map(a => a.id === reply.acting_agent ? { ...a, status: 'IDLE' } : a));
          }, 4500);
        }

        // Process Jarvis native action items
        if (reply.action) {
          addLog(`[ACCION_JARVIS] Ejecutando orden holográfica: '${reply.action}'`, 'info');
          
          if (reply.action === 'system_diagnostics') {
            // Trigger stress & scan on virtual PC
            executePcCommand('sysinfo');
            setTimeout(() => executePcCommand('disk_scan'), 1000);
          } else if (reply.action === 'screenshot') {
            triggerScreenshotCapture();
            setActiveTab('pc_control'); // Move view to see screenshot
          } else if (reply.action === 'open_program' && reply.params?.program) {
            const prog = reply.params.program;
            executePcCommand(`launch ${prog}`);
            setActiveTab('pc_control'); // Move to computer tab
          } else if (reply.action === 'kill_program' && reply.params?.program) {
            const prog = reply.params.program;
            executePcCommand(`kill ${prog}`);
            setActiveTab('pc_control');
          } else if (reply.action === 'create_file' && reply.params?.path) {
            await fetch('/api/virtual-fs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                path: reply.params.path,
                content: reply.params.content || '# Generado por Jarvis\n',
                type: 'file'
              })
            });
            addLog(`Archivo '${reply.params.path}' inyectado en el sandbox virtual.`, 'success');
            fetchVFS();
            setActiveTab('workspace'); // Move to workspace tab to edit code
          } else if (reply.action === 'delete_file' && reply.params?.path) {
            await fetch('/api/virtual-fs', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: reply.params.path })
            });
            addLog(`Archivo '${reply.params.path}' eliminado por orden de Jarvis.`, 'warning');
            fetchVFS();
            setActiveTab('workspace');
          } else if (reply.action === 'run_code' && reply.params?.path) {
            handleRunCode(reply.params.path);
            setActiveTab('workspace');
          } else if (reply.action === 'add_memory' && reply.params?.fact) {
            fetchMemories();
          } else if (reply.action === 'exec_command' && reply.params?.command) {
            setActiveTab('system_real');
            await execSafeCommand(reply.params.command);
          } else if (reply.action === 'browse_files' && reply.params?.path) {
            setActiveTab('system_real');
            await browseFilesystem(reply.params.path);
          } else if (reply.action === 'spotify') {
            if (!isPlayingMusic) {
              startAudioDrone();
            }
            if (reply.params?.song) {
              setCurrentSong(reply.params.song);
            }
          }
        }
      } else {
        addLog('Fallo en enlace cognitivo. Activando protocolos locales redundantes.', 'error');
        setReactorState('idle');
      }
    } catch (err) {
      addLog('Error de procesamiento de enlace con reactor arc.', 'error');
      setReactorState('idle');
    }
  };

  // Text-To-Speech Synthesis Output
  const speakText = (text: string) => {
    if (!speechActive || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('es') && v.name.toLowerCase().includes('google')) || 
                  voices.find(v => v.lang.startsWith('es')) || 
                  voices[0];
    
    if (voice) utterance.voice = voice;
    utterance.pitch = 0.95; // Jarvis debonair pitch
    utterance.rate = 1.05;

    utterance.onstart = () => setReactorState('speaking');
    
    // Auto-resume listening when speaking is complete or errored
    const onSpeakingEnd = () => {
      setReactorState('idle');
      if (isHandsFreeActiveRef.current) {
        setTimeout(() => {
          if (isHandsFreeActiveRef.current && !window.speechSynthesis.speaking) {
            startActiveMicrophone();
          }
        }, 500);
      }
    };

    utterance.onend = onSpeakingEnd;
    utterance.onerror = onSpeakingEnd;

    window.speechSynthesis.speak(utterance);
  };

  // VFS methods
  const fetchVFS = async () => {
    try {
      const res = await fetch('/api/virtual-fs');
      if (res.ok) {
        const data = await res.json();
        setVfs(data);
        const welcome = data.find((f: any) => f.path === 'welcome_protocol.txt');
        if (welcome && !selectedFile) {
          handleSelectFile(welcome);
        }
      }
    } catch (err) {
      console.error("VFS error:", err);
    }
  };

  const handleSelectFile = (file: VirtualFile) => {
    setSelectedFile(file);
    setEditedContent(file.content);
    playSystemBeep(580, 0.05);
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    try {
      setReactorState('processing');
      const res = await fetch('/api/virtual-fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedFile.path,
          content: editedContent,
          type: 'file'
        })
      });
      if (res.ok) {
        addLog(`Archivo '${selectedFile.path}' guardado correctamente en sandbox.`, 'success');
        playSystemBeep(900, 0.1);
        fetchVFS();
      }
    } catch (err) {
      addLog('Error al guardar archivo virtual.', 'error');
    } finally {
      setReactorState('idle');
    }
  };

  const handleCreateNewFile = async () => {
    const filename = prompt('Ruta y nombre del archivo (ej. workspace/seguridad.py o config/puertos.json):', 'workspace/analisis_vulnerabilidad.py');
    if (!filename) return;

    try {
      setReactorState('processing');
      const res = await fetch('/api/virtual-fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filename,
          content: '# Script creado por Tony Stark con Jarvis OS\nprint("Protocolo Seguro Iniciado")\n',
          type: 'file'
        })
      });
      if (res.ok) {
        addLog(`Archivo '${filename}' creado de manera persistente.`, 'success');
        fetchVFS();
      }
    } catch (err) {
      addLog('Error al registrar nuevo archivo.', 'error');
    } finally {
      setReactorState('idle');
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    if (!confirm(`¿Señor, purgar definitivamente '${filePath}'?`)) return;
    try {
      setReactorState('processing');
      const res = await fetch('/api/virtual-fs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });
      if (res.ok) {
        addLog(`Archivo '${filePath}' eliminado de la memoria virtual.`, 'warning');
        if (selectedFile?.path === filePath) {
          setSelectedFile(null);
        }
        fetchVFS();
      }
    } catch (err) {
      addLog('Error en borrado físico.', 'error');
    } finally {
      setReactorState('idle');
    }
  };

  const handleRunCode = async (filePath: string) => {
    try {
      setReactorState('processing');
      addLog(`Ejecutando script virtual de sistema: ${filePath}`, 'system');
      const res = await fetch('/api/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });
      if (res.ok) {
        const data = await res.json();
        data.logs.forEach((logLine: string) => {
          addLog(logLine, logLine.includes('ÉXITO') || logLine.includes('SUCCESS') ? 'success' : logLine.includes('ERROR') || logLine.includes('❌') ? 'error' : 'code');
        });
      }
    } catch (err) {
      addLog('Fallo de compilación en compilador virtual.', 'error');
    } finally {
      setReactorState('idle');
    }
  };

  // Memories & rules
  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.trim()) return;
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact: newMemory, category: newMemoryCat })
      });
      if (res.ok) {
        addLog(`Banco de datos actualizado: '${newMemoryCat}' recuerda ahora '${newMemory}'`, 'success');
        setNewMemory('');
        fetchMemories();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addLog(`Registro borrado del banco persistente de datos.`, 'info');
        fetchMemories();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/workflows');
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleWorkflow = async (id: string) => {
    try {
      const res = await fetch('/api/workflows/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchWorkflows();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerWorkflow = async (id: string) => {
    try {
      setReactorState('processing');
      const res = await fetch('/api/workflows/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const data = await res.json();
        data.logs.forEach((l: string) => addLog(l, 'system'));
        setWorkflowStatus(data.message);
        setTimeout(() => setWorkflowStatus(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReactorState('idle');
    }
  };

  const handleAddWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflow.name || !newWorkflow.trigger || !newWorkflow.action) return;
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorkflow)
      });
      if (res.ok) {
        addLog(`Protocolo de automatización registrado: ${newWorkflow.name}`, 'success');
        setNewWorkflow({ name: '', trigger: '', action: '', category: 'system' });
        fetchWorkflows();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Agent brainstorm Multi-agent simulation
  const handleBrainstorm = async () => {
    if (!agentTopic.trim()) return;
    setIsBrainstorming(true);
    setBrainstormMessages([]);
    setBrainstormSummary('');
    
    setAgents(prev => prev.map(a => ({ ...a, status: 'THINKING' })));
    addLog(`Iniciando mesa redonda de agentes de IA: "${agentTopic}"`, 'system');

    try {
      const res = await fetch('/api/agent-brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: agentTopic })
      });

      if (res.ok) {
        const data = await res.json();
        
        for (let i = 0; i < data.messages.length; i++) {
          const msg = data.messages[i];
          setAgents(prev => prev.map(a => a.id === msg.agentId ? { ...a, status: 'WORKING' } : { ...a, status: 'THINKING' }));
          await new Promise(resolve => setTimeout(resolve, 1400));
          setBrainstormMessages(prev => [...prev, msg]);
          addLog(`[AGENTE ${msg.agentName.toUpperCase()}]: ${msg.text.substring(0, 100)}...`, 'info');
        }

        setBrainstormSummary(data.summary);
        addLog('Deliberación en red de agentes finalizada. Plan unificado guardado.', 'success');
      }
    } catch (err) {
      addLog('Fallo de comunicaciones cuánticas entre agentes.', 'error');
    } finally {
      setIsBrainstorming(false);
      setAgents(prev => prev.map(a => ({ ...a, status: 'IDLE' })));
    }
  };

  // Helper log in terminal
  const addLog = (message: string, type: LogEntry['type']) => {
    const newEntry: LogEntry = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setMainTerminalLogs(prev => [...prev, newEntry]);
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#020308] text-cyan-400 font-mono flex flex-col p-3 relative select-none">
      
      {/* SCREEN FLASH CAPTURE ANIMATION LAYER */}
      {screenshotAnimation && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-flash" />
      )}

      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* TOP COMPACT HUD NAVIGATION HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border border-cyan-500/30 bg-[#060e1c]/80 backdrop-blur px-4 py-3 rounded-lg mb-3 relative z-20 gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 bg-cyan-400 rounded-full animate-ping opacity-65" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              J.A.R.V.I.S.
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded uppercase tracking-widest">
                Mk V Ultra
              </span>
              {wsConnected && (
                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                  WS LIVE
                </span>
              )}
            </h1>
            <p className="text-[8px] text-cyan-500/60 uppercase tracking-widest leading-none">Holographic Computer & Reactor Controller</p>
          </div>
        </div>

        {/* METERS COMPACT VIEWPORTS */}
        <div className="flex flex-wrap gap-4 items-center text-[10px] bg-black/40 border border-cyan-500/10 px-3 py-1.5 rounded">
          <div className="flex items-center gap-1.5">
            <span className="opacity-50 uppercase text-[8px]">ESCUCHA_ACTIVA:</span>
            <button 
              onClick={() => {
                setIsContinuousActive(!isContinuousActive);
                playSystemBeep(640, 0.08);
              }}
              className={`px-1.5 py-0.5 rounded font-bold text-[9px] border transition-all ${
                isContinuousActive 
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/40 text-red-400'
              }`}
              title="Permite activar Jarvis diciendo 'Jarvis' (manos libres) o 'Escúchame' (comando único)"
            >
              {isContinuousActive ? 'SINTONIZADA ("Jarvis" / "Escúchame")' : 'MUTADA'}
            </button>
          </div>
          <div className="hidden lg:flex flex-col items-end border-l border-cyan-500/20 pl-4">
            <span className="opacity-40 uppercase text-[8px]">DAEMON PUENTE:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              CONECTADO v1.8
            </span>
          </div>
          <div className="flex flex-col items-end border-l border-cyan-500/20 pl-4">
            <span className="opacity-40 uppercase text-[8px]">Reloj de Sistema:</span>
            <span className="text-cyan-200">{utcTime || 'SINCRONIZANDO...'}</span>
          </div>
        </div>
      </header>

      {/* REDESIGNED MAIN GLOWING TAB NAVIGATION MENU */}
      <nav className="flex flex-wrap gap-1 mb-3 relative z-20">
        <button 
          onClick={() => { setActiveTab('core'); playSystemBeep(520, 0.05); }}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold tracking-widest transition-all cursor-pointer ${
            activeTab === 'core' 
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
            : 'border-cyan-500/20 text-cyan-400/60 bg-[#040914]/40 hover:text-cyan-300 hover:bg-cyan-950/20'
          }`}
        >
          <Zap className="w-4 h-4" />
          CONSOLA CENTRAL Y VOZ
        </button>
        <button 
          onClick={() => { setActiveTab('pc_control'); playSystemBeep(520, 0.05); }}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold tracking-widest transition-all cursor-pointer ${
            activeTab === 'pc_control' 
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
            : 'border-cyan-500/20 text-cyan-400/60 bg-[#040914]/40 hover:text-cyan-300 hover:bg-cyan-950/20'
          }`}
        >
          <Monitor className="w-4 h-4" />
          CONTROL DE COMPUTADOR (PC)
        </button>
        <button 
          onClick={() => { setActiveTab('agents'); playSystemBeep(520, 0.05); }}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold tracking-widest transition-all cursor-pointer ${
            activeTab === 'agents' 
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
            : 'border-cyan-500/20 text-cyan-400/60 bg-[#040914]/40 hover:text-cyan-300 hover:bg-cyan-950/20'
          }`}
        >
          <Users className="w-4 h-4" />
          MULTIPLICIDAD DE AGENTES
        </button>
        <button 
          onClick={() => { setActiveTab('workspace'); playSystemBeep(520, 0.05); }}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold tracking-widest transition-all cursor-pointer ${
            activeTab === 'workspace' 
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
            : 'border-cyan-500/20 text-cyan-400/60 bg-[#040914]/40 hover:text-cyan-300 hover:bg-cyan-950/20'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          VFS Y COMPILADOR
        </button>
        <button 
          onClick={() => { setActiveTab('system_real'); playSystemBeep(520, 0.05); fetchRealProcesses(); fetchNetworkInterfaces(); }}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold tracking-widest transition-all cursor-pointer ${
            activeTab === 'system_real' 
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
            : 'border-emerald-500/20 text-emerald-400/60 bg-[#040914]/40 hover:text-emerald-300 hover:bg-emerald-950/20'
          }`}
        >
          <CpuIcon className="w-4 h-4" />
          SISTEMA REAL
        </button>
      </nav>

      {/* ACTIVE SCREEN MODULE - RENDERED INSIDE SCROLLABLE/NON-SCROLLABLE BENTO BOX */}
      <main className="flex-grow overflow-hidden relative z-10 flex flex-col">
        
        {/* MODULE 1: CONSOLA DE VOZ (The Reactor & Voice core) */}
        {activeTab === 'core' && (
          <div className="flex-grow grid grid-cols-1 lg:grid-cols-10 gap-4 h-full overflow-hidden">
            
            {/* Left Sub-column (Memory facts & Automation) */}
            <div className="lg:col-span-3 flex flex-col gap-3 h-full overflow-y-auto pr-1 text-xs select-none">
              
              {/* Memories */}
              <div className="bg-slate-950/60 border border-cyan-500/20 rounded-lg p-3 backdrop-blur-md flex flex-col">
                <div className="flex items-center justify-between border-b border-cyan-500/10 pb-1.5 mb-2">
                  <span className="text-[10px] tracking-wider font-semibold uppercase flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    Memoria de Preferencias
                  </span>
                  <span className="text-[8px] bg-cyan-950 px-1 rounded text-cyan-400/40">DB_FACTS</span>
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {memories.map(m => (
                    <div key={m.id} className="bg-cyan-500/5 p-2 rounded border border-cyan-500/10 flex justify-between items-start gap-1 group hover:border-cyan-500/30 transition-all">
                      <div className="flex-grow">
                        <span className="text-[7px] tracking-widest uppercase bg-cyan-500/20 text-cyan-100 px-1 rounded-sm">
                          {m.category}
                        </span>
                        <p className="text-cyan-200 font-sans text-[11px] mt-1 leading-tight">{m.fact}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteMemory(m.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddMemory} className="flex gap-1 border-t border-cyan-500/10 pt-2 mt-2">
                  <select 
                    value={newMemoryCat} 
                    onChange={(e) => setNewMemoryCat(e.target.value)}
                    className="bg-[#02040a] text-cyan-300 text-[10px] border border-cyan-500/30 rounded p-1 font-mono focus:outline-none"
                  >
                    <option value="Usuario">Usuario</option>
                    <option value="Preferencia">Preferencia</option>
                    <option value="Proyecto">Proyecto</option>
                  </select>
                  <input 
                    type="text"
                    value={newMemory}
                    onChange={(e) => setNewMemory(e.target.value)}
                    placeholder="Recordar que..."
                    className="flex-grow bg-[#02040a] text-cyan-100 text-xs border border-cyan-500/30 rounded px-2 py-1 focus:outline-none"
                  />
                  <button type="submit" className="bg-cyan-500/20 hover:bg-cyan-500/40 p-1.5 rounded border border-cyan-500/30">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Workflows triggers */}
              <div className="bg-slate-950/60 border border-cyan-500/20 rounded-lg p-3 backdrop-blur-md flex flex-col">
                <div className="flex items-center justify-between border-b border-cyan-500/10 pb-1.5 mb-2">
                  <span className="text-[10px] tracking-wider font-semibold uppercase flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Reglas de Automatización
                  </span>
                  <span className="text-[8px] bg-cyan-950 px-1 rounded text-cyan-400/40">DAEMON_CRON</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {workflows.map(w => (
                    <div key={w.id} className="bg-slate-900/40 p-2 rounded border border-cyan-500/10 flex justify-between items-center gap-2 hover:border-cyan-500/20">
                      <div>
                        <p className="font-bold text-cyan-200 text-[11px]">{w.name}</p>
                        <p className="text-[9px] text-cyan-500/70 font-sans mt-0.5">ACCIÓN: {w.action}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleToggleWorkflow(w.id)}
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          {w.active ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                        </button>
                        <button 
                          onClick={() => handleTriggerWorkflow(w.id)}
                          className="bg-cyan-500/10 hover:bg-cyan-500/20 p-1 rounded"
                        >
                          <Play className="w-3 h-3 text-cyan-300" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center Core Column (The holographic reactor core) */}
            <div className="lg:col-span-4 bg-[#040812]/20 border border-cyan-500/20 rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden h-full">
              
              {/* Circular Holographic lines background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
                <div className="w-[280px] h-[280px] border border-dashed border-cyan-400 rounded-full animate-[spin_24s_linear_infinite]" />
                <div className="absolute w-[320px] h-[320px] border border-cyan-500/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                <div className="absolute w-[220px] h-[220px] border border-cyan-300 rounded-full border-b-transparent animate-[spin_10s_linear_infinite]" />
              </div>

              {/* ARC REACTOR */}
              <div className="z-10 relative">
                <ArcReactor state={reactorState} onClick={toggleSpeechRecognition} />
              </div>

              {/* Bouncing visual voice equalizer */}
              {reactorState !== 'idle' && (
                <div className="flex gap-1 justify-center items-center h-8 z-10 mt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((bar) => {
                    const h = `${Math.floor(Math.random() * 25) + 5}px`;
                    let speed = Math.random() * 0.5 + 0.3;
                    let color = 'bg-cyan-400';
                    if (reactorState === 'listening') color = 'bg-red-500';
                    if (reactorState === 'thinking') color = 'bg-yellow-400';
                    if (reactorState === 'speaking') color = 'bg-emerald-400';
                    if (reactorState === 'processing') color = 'bg-purple-400';
                    
                    return (
                      <div 
                        key={bar} 
                        className={`w-1 rounded-full ${color} transition-all duration-200`} 
                        style={{
                          height: h,
                          animation: `bounce ${speed}s ease-in-out infinite alternate`
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Continuous Listen Alert message */}
              <div className="z-10 mt-2 bg-cyan-950/40 border border-cyan-500/20 px-3 py-1.5 rounded-lg text-center max-w-[90%]">
                <span className="text-[10px] text-cyan-300/80 uppercase font-bold flex items-center justify-center gap-1.5 font-sans">
                  <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  Módulo de activación activado
                </span>
                <p className="text-[9px] text-cyan-500/60 font-sans mt-0.5">
                  Diga <span className="text-cyan-200 font-bold uppercase">"Jarvis"</span> para charla continua o <span className="text-cyan-200 font-bold uppercase">"Escúchame"</span> para comando único.
                </p>
                {lastWakeWordTime && (
                  <span className="text-[8px] text-cyan-500/40 italic block mt-1">Último disparo por voz: {lastWakeWordTime}</span>
                )}
              </div>

              {micError && (
                <div className="absolute bottom-2 bg-red-950/80 border border-red-500/40 px-3 py-1 rounded text-[9px] text-red-300 flex items-center gap-1 z-10">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{micError}</span>
                </div>
              )}
            </div>

            {/* Right Sub-column (Chat Dialog & System Terminal Logs) */}
            <div className="lg:col-span-3 flex flex-col gap-3 h-full overflow-hidden">
              
              {/* Central speech feedback panel */}
              <div className="bg-slate-950/60 border border-cyan-500/20 rounded-lg p-3.5 flex-grow flex flex-col justify-between overflow-hidden backdrop-blur-md">
                <div className="overflow-hidden flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-cyan-500/10 pb-1.5 mb-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-cyan-200 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        Pantalla Holográfica
                      </span>
                      <button 
                       onClick={() => {
                          setSpeechActive(!speechActive);
                          playSystemBeep(500, 0.08);
                        }}
                        className={`p-1 rounded border ${speechActive ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                      >
                        {speechActive ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                      </button>
                    </div>

                    {chatReply ? (
                      <div className="space-y-2.5 overflow-y-auto max-h-[220px] scrollbar-thin">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {chatReply.acting_agent && (
                            <div className="text-[8px] tracking-widest uppercase font-bold font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                              Agente: {chatReply.acting_agent}
                            </div>
                          )}
                          {chatReply.aiSource && (
                            <div className={`text-[8px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              chatReply.aiSource === 'gemini' ? 'text-cyan-300 bg-cyan-950/40 border-cyan-500/20' :
                              chatReply.aiSource === 'ollama' ? 'text-purple-300 bg-purple-950/40 border-purple-500/20' :
                              'text-slate-400 bg-slate-900/40 border-slate-700/20'
                            }`}>
                              {chatReply.aiSource === 'gemini' ? '✦ GEMINI' : chatReply.aiSource === 'ollama' ? '⬡ OLLAMA LOCAL' : '⬟ OFFLINE'}
                            </div>
                          )}
                        </div>
                        <div className="bg-cyan-500/5 border-l-2 border-cyan-400 p-2 rounded-r">
                          <p className="italic text-cyan-100 text-xs font-sans leading-relaxed">
                            "{chatReply.speech}"
                          </p>
                        </div>
                        <div className="bg-slate-900/30 border border-cyan-500/5 p-2 rounded text-[11px] text-slate-300 leading-relaxed max-w-none prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{chatReply.text}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center italic text-cyan-500/30 text-xs py-8">Aguardando directiva vocal o escrita...</p>
                    )}
                  </div>

                  {/* Preset commands drawer */}
                  <div className="border-t border-cyan-500/10 pt-2.5 mt-2">
                    <span className="text-[8px] text-cyan-500/40 uppercase font-bold block mb-1">Órdenes Preestablecidas rápidas:</span>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                      {[
                        { label: 'Música de Fondo', cmd: 'Pon música de fondo.' },
                        { label: 'Escanear Sistema', cmd: 'Escanea el sistema y el reactor arc.' },
                        { label: 'Abrir VS Code', cmd: 'Abre Visual Studio Code.' },
                        { label: 'Procesos del PC', cmd: 'Lista los procesos del sistema ordenados por CPU.' },
                        { label: 'Info del CPU', cmd: 'Muéstrame la información real del procesador.' },
                        { label: 'Explorar Archivos', cmd: 'Explora el directorio principal del host.' },
                      ].map(({ label, cmd }) => (
                        <button
                          key={cmd}
                          onClick={() => handleChatSubmit(cmd)}
                          className="bg-cyan-500/5 hover:bg-cyan-500/15 border border-cyan-500/20 py-1 px-1.5 rounded text-left truncate text-cyan-300 text-[10px]"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Console logs */}
              <div className="bg-slate-950/80 border border-cyan-500/20 rounded-lg p-3 flex flex-col justify-between max-h-52 overflow-hidden">
                <div className="flex items-center justify-between border-b border-cyan-500/10 pb-1 mb-1.5">
                  <span className="text-[9px] uppercase tracking-widest text-cyan-500/60 font-semibold">Terminal de Enlace Jarvis</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-cyan-500/40">hist: {conversationHistory.length}</span>
                    <button
                      onClick={() => { setConversationHistory([]); addLog('[MEMORIA] Historial de conversación purgado.', 'warning'); }}
                      className="text-[8px] text-red-400/50 hover:text-red-400"
                      title="Purgar historial de conversación"
                    >
                      [PURGAR]
                    </button>
                    <span className="text-[8px] bg-cyan-950 px-1 rounded text-cyan-400/40">AUDIT_SYS</span>
                  </div>
                </div>
                <div className="space-y-1 overflow-y-auto h-36 pr-1 text-[9px] leading-tight font-mono">
                  {mainTerminalLogs.map(log => {
                    let color = 'text-cyan-400/70';
                    if (log.type === 'success') color = 'text-emerald-400 font-semibold';
                    if (log.type === 'warning') color = 'text-orange-400';
                    if (log.type === 'error') color = 'text-red-400 font-semibold';
                    if (log.type === 'system') color = 'text-indigo-300 font-bold';
                    if (log.type === 'code') color = 'text-purple-300';
                    
                    return (
                      <div key={log.id} className="flex gap-1.5 items-start hover:bg-slate-900/50 py-0.5 px-1 rounded transition-all">
                        <span className="text-cyan-500/30 flex-shrink-0">[{log.timestamp}]</span>
                        <span className={`${color} break-all`}>{log.message}</span>
                      </div>
                    );
                  })}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 2: PC CONTROL (The main new Computer Link Tab) */}
        {activeTab === 'pc_control' && (
          <div className="flex-grow flex flex-col gap-3 h-full overflow-y-auto lg:overflow-hidden">
            {/* System Meters placed perfectly at the top of the PC Control tab! */}
            <div className="flex-shrink-0">
              <SystemMeters wsMetrics={wsMetrics} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow overflow-y-auto lg:overflow-hidden">
            
            {/* Left PC Column: Status, process tree & settings */}
            <div className="lg:col-span-4 flex flex-col gap-3 h-full overflow-y-auto pr-1">
              
              {/* Connected Daemon Banner */}
              <div className="bg-emerald-950/25 border border-emerald-500/30 p-3 rounded-lg flex items-center justify-between shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]">
                <div className="flex items-center gap-3">
                  <Laptop className="w-8 h-8 text-emerald-400 animate-pulse" />
                  <div>
                    <span className="block text-slate-100 font-bold text-xs tracking-wider">STARK DAEMON LINK</span>
                    <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      ENLACE LOCAL EN VIVO (ACTIVO)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[8px] opacity-40">VERSION:</span>
                  <span className="text-emerald-300 font-bold text-[10px]">1.8.4-secure</span>
                </div>
              </div>

              {/* Processes list */}
              <div className="bg-slate-950/60 border border-cyan-500/20 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 text-cyan-200">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      Árbol de Procesos de PC
                    </span>
                    <span className="text-[8px] bg-cyan-950 px-1 text-cyan-400/50 rounded font-semibold">TASK_MANAGER</span>
                  </div>
                  
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-[11px] font-mono">
                    {pcProcesses.map(p => (
                      <div 
                        key={p.pid} 
                        className={`flex items-center justify-between p-2 rounded border group transition-all ${
                          p.active 
                          ? 'bg-cyan-500/5 border-cyan-500/10 hover:border-cyan-500/30' 
                          : 'bg-slate-900/10 border-slate-900/40 opacity-40 hover:opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate max-w-[60%]">
                          <div className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                          <span className="text-[10px] text-cyan-500/40">[{p.pid}]</span>
                          <span className="font-semibold text-slate-200 truncate">{p.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right text-[10px]">
                            {p.active ? (
                              <span className="text-cyan-300">{p.cpu}% CPU <span className="text-[8px] opacity-40">| {p.ram}MB</span></span>
                            ) : (
                              <span className="text-slate-500">INACTIVO</span>
                            )}
                          </div>
                          
                          {p.active ? (
                            <button 
                              onClick={() => executePcCommand(`kill ${p.pid}`)}
                              className="text-red-400 hover:text-red-300 p-0.5 rounded hover:bg-red-500/10 transition-all font-bold text-[9px] uppercase tracking-wider"
                              title="Terminar Proceso"
                            >
                              KILL
                            </button>
                          ) : (
                            <button 
                              onClick={() => executePcCommand(`launch ${p.name}`)}
                              className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded hover:bg-emerald-500/10 transition-all font-bold text-[9px] uppercase tracking-wider"
                              title="Iniciar Proceso"
                            >
                              START
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* PC Daemon permissions settings */}
              <div className="bg-slate-950/60 border border-cyan-500/20 rounded-lg p-3">
                <span className="text-[9px] uppercase tracking-wider font-bold block mb-2 text-cyan-300/80">Configurar Permisos del Asistente</span>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-sans">Permitir lectura y escritura en disco</span>
                    <button 
                      onClick={() => setPcPermissions(prev => ({ ...prev, diskAccess: !prev.diskAccess }))}
                      className="text-cyan-400"
                    >
                      {pcPermissions.diskAccess ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-cyan-500/5 pt-1.5">
                    <span className="text-slate-300 font-sans">Permitir apagar/matar procesos</span>
                    <button 
                      onClick={() => setPcPermissions(prev => ({ ...prev, processControl: !prev.processControl }))}
                      className="text-cyan-400"
                    >
                      {pcPermissions.processControl ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-cyan-500/5 pt-1.5">
                    <span className="text-slate-300 font-sans">Habilitar automatización por micrófono</span>
                    <button 
                      onClick={() => setPcPermissions(prev => ({ ...prev, voiceAutomation: !prev.voiceAutomation }))}
                      className="text-cyan-400"
                    >
                      {pcPermissions.voiceAutomation ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-cyan-500/5 pt-1.5">
                    <span className="text-slate-300 font-sans">Inyectar scripts de seguridad en segundo plano</span>
                    <button 
                      onClick={() => setPcPermissions(prev => ({ ...prev, scriptInjections: !prev.scriptInjections }))}
                      className="text-cyan-400"
                    >
                      {pcPermissions.scriptInjections ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle PC Column: Interactive Command Terminal console */}
            <div className="lg:col-span-5 flex flex-col gap-3 h-full overflow-hidden">
              
              <div className="bg-slate-950/85 border border-cyan-500/20 rounded-lg p-3 flex-grow flex flex-col justify-between overflow-hidden shadow-lg">
                <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-xs uppercase font-bold tracking-wider text-cyan-100">Caja de Consola de PC Integrada</span>
                  </div>
                  <button 
                    onClick={() => { setPcConsoleLogs([]); playSystemBeep(350, 0.05); }}
                    className="text-[9px] text-cyan-500/50 hover:text-cyan-400"
                  >
                    [LIMPIAR CONSOLA]
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-1.5 text-[10px] font-mono leading-relaxed bg-[#02040a]/40 p-2.5 rounded border border-cyan-500/5 pr-1 max-h-[290px] scrollbar-thin">
                  {pcConsoleLogs.map((logLine, idx) => {
                    let logColor = 'text-slate-300';
                    if (logLine.startsWith('stark@laptop:~$')) logColor = 'text-cyan-400 font-semibold';
                    else if (logLine.startsWith('[SUCCESS]')) logColor = 'text-emerald-400';
                    else if (logLine.startsWith('[WARNING]')) logColor = 'text-orange-400 font-bold';
                    else if (logLine.startsWith('Error:')) logColor = 'text-red-400';
                    else if (logLine.includes('[INFO DISPOSITIVO]') || logLine.includes('[ESTADO TÉRMICO]')) logColor = 'text-indigo-300';
                    
                    return (
                      <div key={idx} className={`${logColor} whitespace-pre-wrap`}>
                        {logLine}
                      </div>
                    );
                  })}
                  <div ref={pcConsoleEndRef} />
                </div>

                {/* Console prompt line */}
                <div className="border-t border-cyan-500/10 pt-2.5 mt-2 flex gap-2">
                  <span className="text-cyan-400 font-bold text-xs flex items-center shrink-0">stark@laptop:~$</span>
                  <input 
                    type="text"
                    value={pcConsoleInput}
                    onChange={(e) => setPcConsoleInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') executePcCommand(); }}
                    placeholder="Escriba un comando... (ej. sysinfo, processes, screenshot)"
                    className="flex-grow bg-black/60 text-cyan-100 font-mono text-xs border border-cyan-500/20 rounded px-2 py-1.5 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30"
                  />
                  <button 
                    onClick={() => executePcCommand()}
                    className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded px-3 py-1 text-xs font-bold text-cyan-300"
                  >
                    EJECUTAR
                  </button>
                </div>
              </div>

              {/* Program Quick Launcher launcher card */}
              <div className="bg-slate-950/60 border border-cyan-500/20 rounded-lg p-3">
                <span className="text-[9px] uppercase tracking-wider font-bold block mb-2 text-cyan-300/80">Lanzador Rápido de Aplicaciones en PC</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <button 
                    onClick={() => executePcCommand('launch Chrome.exe')}
                    className="bg-cyan-500/5 hover:bg-cyan-500/15 border border-cyan-500/20 py-1.5 rounded flex items-center justify-center gap-1.5 text-cyan-100 font-semibold"
                  >
                    🌐 Google Chrome
                  </button>
                  <button 
                    onClick={() => executePcCommand('launch Spotify.exe')}
                    className="bg-cyan-500/5 hover:bg-cyan-500/15 border border-cyan-500/20 py-1.5 rounded flex items-center justify-center gap-1.5 text-cyan-100 font-semibold"
                  >
                    🎵 Spotify
                  </button>
                  <button 
                    onClick={() => executePcCommand('launch VSCode.exe')}
                    className="bg-cyan-500/5 hover:bg-cyan-500/15 border border-cyan-500/20 py-1.5 rounded flex items-center justify-center gap-1.5 text-cyan-100 font-semibold"
                  >
                    💻 VS Code
                  </button>
                  <button 
                    onClick={() => executePcCommand('launch Blender.exe')}
                    className="bg-cyan-500/5 hover:bg-cyan-500/15 border border-cyan-500/20 py-1.5 rounded flex items-center justify-center gap-1.5 text-cyan-100 font-semibold"
                  >
                    🎨 Blender
                  </button>
                </div>
              </div>
            </div>

            {/* Right PC Column: Animated Live Screen visualizer preview */}
            <div className="lg:col-span-3 flex flex-col gap-3 h-full overflow-hidden">
              <div className="bg-slate-950/60 border border-cyan-500/20 rounded-lg p-3.5 h-full flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2 mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 text-cyan-200">
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      Captura de Escritorio
                    </span>
                    <span className="text-[8px] bg-cyan-950 px-1 rounded text-cyan-400/50">LIVE_PREVIEW</span>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 font-sans leading-normal mb-3">
                    Obtenga un render en vivo de su escritorio de computador o de la estación de trabajo principal del reactor.
                  </p>
                </div>

                {/* Screenshotted image mockup */}
                <div className="flex-grow border border-dashed border-cyan-500/30 bg-[#02050e] rounded-lg p-2.5 flex flex-col items-center justify-center relative min-h-[180px] overflow-hidden">
                  {screenshotPreview ? (
                    <div className="w-full h-full flex flex-col justify-between text-[8px] relative z-10 animate-[fadeIn_0.5s_ease_out]">
                      {/* Cool vector HUD schematic mocking Stark screen */}
                      <div className="flex justify-between items-center border-b border-cyan-500/20 pb-1">
                        <span className="text-cyan-400 tracking-widest font-bold">STARK_HUD_SYSTEMS</span>
                        <span className="text-emerald-400 font-bold font-sans">● LIVE STREAM</span>
                      </div>
                      
                      <div className="my-2 flex-grow flex flex-col justify-center space-y-1.5 relative">
                        {/* Circular diagram inside screen */}
                        <div className="w-16 h-16 border border-cyan-400/20 rounded-full mx-auto flex items-center justify-center animate-[spin_10s_linear_infinite]">
                          <div className="w-10 h-10 border border-dashed border-cyan-500/30 rounded-full flex items-center justify-center animate-[spin_5s_linear_infinite_reverse]">
                            <div className="w-4 h-4 bg-cyan-500/10 border border-cyan-400/60 rounded-full" />
                          </div>
                        </div>
                        
                        <div className="text-center font-sans space-y-0.5 mt-2">
                          <span className="block text-cyan-200 font-mono text-[9px] tracking-wide">Workspace: ACTIVO</span>
                          <span className="block text-slate-400 leading-none">VS Code, Chrome y Spotify en ejecución</span>
                          <span className="block text-cyan-500/50">Carga de CPU total: 18.5% | Temp: 42°C</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-cyan-500/20 pt-1 text-[7px] text-cyan-500/40">
                        <span>FPS: 60.00</span>
                        <span>RESOLUCIÓN: 2560x1440px</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-3 relative z-10">
                      <Monitor className="w-10 h-10 text-cyan-500/20 mx-auto animate-pulse" />
                      <div>
                        <span className="block text-[10px] text-cyan-500/40 uppercase font-bold">Pantalla no capturada</span>
                        <span className="block text-[9px] text-slate-500 font-sans mt-0.5">Haga clic abajo o diga "saca una captura"</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <button 
                    onClick={() => executePcCommand('screenshot')}
                    className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 py-1.5 rounded text-[10px] uppercase font-bold tracking-widest text-cyan-300 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    Capturar Escritorio Principal
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* MODULE 3: MULTI-AGENT ARENA */}
        {activeTab === 'agents' && (
          <div className="flex-grow flex flex-col gap-3 h-full overflow-hidden select-none">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {agents.map(a => (
                <div key={a.id} className="bg-slate-950/60 border border-cyan-500/20 p-2.5 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{a.avatar}</span>
                    <div>
                      <span className="block text-[11px] font-bold text-slate-100 leading-tight">{a.name}</span>
                      <span className="text-[9px] opacity-60 font-sans block">{a.role}</span>
                    </div>
                  </div>
                  <div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                      a.status === 'WORKING' ? 'bg-purple-500/10 text-purple-400 animate-pulse' :
                      a.status === 'THINKING' ? 'bg-yellow-500/10 text-yellow-400 animate-pulse' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>{a.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Brainstorm setup panel */}
            <div className="bg-[#050b16]/40 border border-cyan-500/20 p-3.5 rounded-lg flex flex-col gap-3">
              <span className="text-[10px] text-cyan-300/80 uppercase font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Mesa Redonda del Consejo de Agentes de Stark
              </span>
              <div className="flex gap-2">
                <textarea
                  value={agentTopic}
                  onChange={(e) => setAgentTopic(e.target.value)}
                  placeholder="Escriba un tema de ingeniería..."
                  rows={2}
                  className="flex-grow bg-[#02040a]/80 text-cyan-100 text-xs border border-cyan-500/30 rounded px-2.5 py-1.5 focus:outline-none"
                />
                <button 
                  onClick={handleBrainstorm}
                  disabled={isBrainstorming}
                  className={`px-4 rounded text-xs font-bold font-mono uppercase tracking-wider border transition-all ${
                    isBrainstorming 
                    ? 'bg-purple-950/40 border-purple-500/30 text-purple-400' 
                    : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                  }`}
                >
                  {isBrainstorming ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'CONVOCAR'}
                </button>
              </div>
            </div>

            {/* Conversation outputs */}
            <div className="flex-grow bg-slate-950/80 border border-cyan-500/20 p-3.5 rounded-lg flex flex-col justify-between overflow-hidden">
              <span className="block text-[9px] uppercase tracking-wider bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-sm font-semibold text-center mb-2 shrink-0">
                LÍNEA DE DISCURSO DE COOPERACIÓN DE AGENTES
              </span>
              
              <div className="flex-grow overflow-y-auto space-y-2 pr-1 text-[11px] max-h-[170px] scrollbar-thin">
                {brainstormMessages.length === 0 ? (
                  <p className="text-center italic text-cyan-500/30 py-8">La red de agentes se encuentra inactiva. Proporcione un tema y presione "Convocatoria".</p>
                ) : (
                  brainstormMessages.map(bm => (
                    <div key={bm.id} className="bg-cyan-500/5 p-2 rounded border border-cyan-500/10">
                      <span className="font-bold text-cyan-200">{bm.agentName}:</span>
                      <p className="text-slate-300 font-sans leading-normal mt-0.5">{bm.text}</p>
                    </div>
                  ))
                )}
                {brainstormSummary && (
                  <div className="bg-purple-950/15 border border-purple-500/30 p-2.5 rounded-lg">
                    <span className="font-bold text-purple-300 uppercase block text-[9px] mb-1">PROSPECTO ARQUITECTÓNICO FINAL:</span>
                    <p className="text-slate-200 font-sans leading-relaxed">{brainstormSummary}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 4: WORKSPACE FILES (The VFS File Explorer & editor) */}
        {activeTab === 'workspace' && (
          <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
            
            {/* VFS File list column (4/12) */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-950/60 border border-cyan-500/20 rounded-lg p-3 overflow-hidden h-full">
              <div className="overflow-hidden flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 text-cyan-200">
                      <FolderOpen className="w-4 h-4 text-cyan-400" />
                      Ficheros Sandbox
                    </span>
                    <span className="text-[8px] bg-cyan-950 px-1 rounded text-cyan-400/50">V_FILES</span>
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-52 pr-1 text-[11px] font-mono scrollbar-thin">
                    {vfs.map(file => {
                      const isSelected = selectedFile?.path === file.path;
                      return (
                        <div 
                          key={file.path} 
                          className={`flex justify-between items-center px-2 py-1.5 rounded cursor-pointer transition-all ${
                            isSelected 
                            ? 'bg-cyan-500/15 border border-cyan-500/30' 
                            : 'hover:bg-cyan-500/5'
                          }`}
                          onClick={() => handleSelectFile(file)}
                        >
                          <div className="flex items-center gap-2 truncate max-w-[70%]">
                            {file.path.endsWith('.py') ? (
                              <Code2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            )}
                            <span className="truncate text-slate-200 text-xs">{file.path}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100">
                            {(file.path.endsWith('.py') || file.path.endsWith('.js')) && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRunCode(file.path); }}
                                className="p-0.5 hover:bg-cyan-500/20 rounded text-cyan-300"
                                title="Ejecutar"
                              >
                                <Play className="w-3 h-3 text-emerald-400" />
                              </button>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.path); }}
                              className="p-0.5 hover:bg-red-500/20 rounded text-red-400"
                              title="Borrar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-cyan-500/10 pt-2.5 mt-2">
                  <button 
                    onClick={handleCreateNewFile}
                    className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider text-cyan-300 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Registrar Archivo Virtual
                  </button>
                </div>
              </div>
            </div>

            {/* Live code Editor column (8/12) */}
            <div className="lg:col-span-8 flex flex-col justify-between bg-slate-950/85 border border-cyan-500/20 rounded-lg p-3.5 overflow-hidden h-full">
              {selectedFile ? (
                <div className="flex flex-col h-full justify-between overflow-hidden">
                  <div className="flex justify-between items-center border-b border-cyan-500/10 pb-2 mb-2">
                    <span className="text-[10px] text-cyan-200 uppercase font-bold tracking-wider truncate max-w-[60%]">
                      EDICIÓN: {selectedFile.path}
                    </span>
                    <button 
                      onClick={handleSaveFile}
                      className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 px-3 py-1 rounded-md flex items-center gap-1 font-bold"
                    >
                      <Save className="w-3 h-3" />
                      GUARDAR ARCHIVO
                    </button>
                  </div>

                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={12}
                    className="flex-grow bg-[#020409] text-cyan-100 text-[11px] border border-cyan-500/10 rounded p-2.5 focus:outline-none focus:border-cyan-400 font-mono resize-none leading-relaxed overflow-y-auto max-h-[190px] scrollbar-thin"
                  />

                  {(selectedFile.path.endsWith('.py') || selectedFile.path.endsWith('.js')) && (
                    <div className="mt-2.5 shrink-0">
                      <button 
                        onClick={() => handleRunCode(selectedFile.path)}
                        className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Compilar y Ejecutar en Sandbox
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center py-12">
                  <Code2 className="w-12 h-12 text-cyan-500/25 animate-pulse mb-3" />
                  <p className="text-center italic text-cyan-500/30 text-xs">Seleccione un archivo virtual a la izquierda para cargarlo en el visor holográfico.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODULE 5: SISTEMA REAL */}
        {activeTab === 'system_real' && (
          <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-y-auto">

            {/* Left: Real Processes */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="bg-slate-950/60 border border-emerald-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2 mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 text-emerald-300">
                    <CpuIcon className="w-3.5 h-3.5" />
                    Procesos Reales del Host
                  </span>
                  <button onClick={fetchRealProcesses} className="text-emerald-400 hover:text-emerald-300">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1 text-[10px] font-mono">
                  {realProcesses.length === 0 ? (
                    <p className="text-center text-emerald-500/30 italic py-4">Cargando procesos reales...</p>
                  ) : (
                    realProcesses.slice(0, 20).map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center px-2 py-1 rounded bg-slate-900/40 border border-emerald-500/5 hover:border-emerald-500/20 transition-all">
                        <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                          <span className="text-emerald-500/40 text-[9px]">{p.pid}</span>
                          <span className="text-slate-200 truncate">{p.name}</span>
                        </div>
                        <div className="flex gap-2 text-[9px] shrink-0">
                          <span className={p.cpu > 20 ? 'text-orange-400' : 'text-emerald-400'}>{p.cpu.toFixed(1)}%</span>
                          <span className="text-slate-400">{p.ram}MB</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Network Interfaces */}
              <div className="bg-slate-950/60 border border-emerald-500/20 rounded-lg p-3">
                <div className="flex items-center gap-1.5 border-b border-emerald-500/10 pb-2 mb-2">
                  <Network className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">Interfaces de Red</span>
                </div>
                <div className="space-y-1 text-[10px] font-mono">
                  {networkInterfaces.length === 0 ? (
                    <p className="text-center text-emerald-500/30 italic py-2">Cargando interfaces...</p>
                  ) : (
                    networkInterfaces.map((ni, idx) => (
                      <div key={idx} className="flex justify-between items-center px-2 py-1 rounded bg-slate-900/40 border border-emerald-500/5">
                        <span className={`font-bold ${ni.internal ? 'text-slate-400' : 'text-emerald-300'}`}>{ni.name}</span>
                        <span className="text-slate-300">{ni.address}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Center: Safe Command Executor */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="bg-slate-950/60 border border-emerald-500/20 rounded-lg p-3 flex flex-col">
                <div className="flex items-center gap-1.5 border-b border-emerald-500/10 pb-2 mb-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">Comandos Reales del Sistema</span>
                  <span className="ml-auto text-[8px] text-emerald-500/50">WHITELIST_SAFE</span>
                </div>
                <p className="text-[9px] text-slate-400 font-sans mb-2">Ejecuta comandos reales en el host de forma segura (lista blanca). Jarvis puede ejecutarlos cuando dices "analiza el sistema", "muestra procesos", etc.</p>
                <div className="grid grid-cols-2 gap-1 mb-3">
                  {['uptime', 'hostname', 'free', 'df', 'top_cpu', 'top_ram', 'ifconfig', 'cpu_info', 'os_info', 'gpu_info', 'temperature', 'open_ports'].map(cmd => (
                    <button
                      key={cmd}
                      onClick={() => execSafeCommand(cmd)}
                      disabled={execLoading}
                      className="bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/20 py-1 px-2 rounded text-[9px] font-mono text-emerald-300 text-left truncate transition-all disabled:opacity-40"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
                <div className="bg-[#020a04] border border-emerald-500/10 rounded p-2 flex-grow min-h-40 max-h-64 overflow-y-auto">
                  {execLoading ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-[10px]">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Ejecutando...
                    </div>
                  ) : execOutput ? (
                    <pre className="text-[9px] text-emerald-300 font-mono whitespace-pre-wrap leading-relaxed">{execOutput}</pre>
                  ) : (
                    <p className="text-[9px] text-emerald-500/30 italic">Seleccione un comando para ejecutarlo...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Real Filesystem Browser */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="bg-slate-950/60 border border-emerald-500/20 rounded-lg p-3 flex flex-col">
                <div className="flex items-center gap-1.5 border-b border-emerald-500/10 pb-2 mb-2">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">Explorador de Archivos Real</span>
                </div>
                <div className="flex gap-1 mb-2">
                  <input
                    type="text"
                    value={browsePath}
                    onChange={(e) => setBrowsePath(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && browseFilesystem(browsePath)}
                    placeholder={`Ruta (ej. ~/Documents)`}
                    className="flex-grow bg-[#020a04] text-emerald-100 text-[10px] border border-emerald-500/20 rounded px-2 py-1 focus:outline-none font-mono"
                  />
                  <button onClick={() => browseFilesystem(browsePath)} className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 rounded text-emerald-300">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-1 mb-2 flex-wrap">
                  {['~', '/tmp', '/etc', '/var/log'].map(p => (
                    <button key={p} onClick={() => browseFilesystem(p)} className="text-[8px] font-mono bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-400 hover:bg-emerald-500/10">
                      {p}
                    </button>
                  ))}
                </div>
                {fileBrowse ? (
                  <div className="space-y-0.5 max-h-72 overflow-y-auto text-[10px] font-mono">
                    <div className="text-[8px] text-emerald-500/50 mb-1 px-1 truncate">{fileBrowse.path}</div>
                    {fileBrowse.parent !== fileBrowse.path && (
                      <div
                        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-emerald-500/10 cursor-pointer text-emerald-400"
                        onClick={() => browseFilesystem(fileBrowse.parent)}
                      >
                        <ChevronUp className="w-3 h-3" />
                        <span>..</span>
                      </div>
                    )}
                    {fileBrowse.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-2 py-1 rounded hover:bg-emerald-500/5 cursor-pointer transition-all ${item.type === 'directory' ? 'text-emerald-300' : 'text-slate-300'}`}
                        onClick={() => item.type === 'directory' && browseFilesystem(item.path)}
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[75%]">
                          {item.type === 'directory' ? <FolderOpen className="w-3 h-3 shrink-0" /> : <FileText className="w-3 h-3 shrink-0" />}
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.type === 'file' && (
                          <span className="text-[9px] text-slate-500">{item.size > 1024 ? `${(item.size / 1024).toFixed(0)}KB` : `${item.size}B`}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center py-8 text-emerald-500/30 text-[10px] italic">
                    <Globe className="w-6 h-6 mx-auto opacity-30 block mb-2" />
                    Explore el sistema de archivos real del host.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* CONTINUOUS AUDIO BAR / DECORATIVE FOOTER */}
      <footer className="mt-3 bg-[#050e18]/90 border border-cyan-500/20 px-4 py-2.5 rounded-lg flex flex-col sm:flex-row items-center gap-3 relative z-20 flex-shrink-0 select-none">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[10px] tracking-wider shrink-0 uppercase">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
          SALA_MULTIMEDIA:
        </div>
        
        <div className="flex-grow text-[10px] font-sans text-cyan-200/70 leading-normal italic text-center sm:text-left truncate max-w-[80%]">
          {isPlayingMusic ? (
            <span className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-400">
              <span className="flex gap-0.5 items-end h-2.5">
                <span className="w-0.5 h-2 bg-emerald-400 animate-[bounce_0.6s_infinite_alternate]" />
                <span className="w-0.5 h-1.5 bg-emerald-400 animate-[bounce_0.4s_infinite_alternate_0.2s]" />
                <span className="w-0.5 h-2.5 bg-emerald-400 animate-[bounce_0.8s_infinite_alternate_0.1s]" />
              </span>
              TRANSMITIENDO AUDIO AMBIENTAL: "{currentSong}" (Frecuencia base: 110Hz)
            </span>
          ) : (
            `Instrucción rápida: diga "Escúchame, pon música" para iniciar el sintetizador de concentración de Tony Stark.`
          )}
        </div>

        <button 
          onClick={toggleMusic}
          className={`px-3 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all shrink-0 border ${
            isPlayingMusic 
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
            : 'bg-cyan-500/5 border-cyan-500/30 text-cyan-300'
          }`}
        >
          {isPlayingMusic ? 'MUTE_AMBIENT' : 'PLAY_AMBIENT'}
        </button>
      </footer>

      {/* NEURAL COMMAND INPUT CONSOLE (Always visible and anchored at the bottom for easy typing) */}
      <section className="mt-3 bg-slate-950/90 border border-cyan-500/30 rounded-lg p-3 relative z-20 shrink-0 shadow-2xl">
        <div className="flex gap-2">
          {/* Active Voice microphone button */}
          <button 
            onClick={toggleSpeechRecognition}
            className={`p-2.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shrink-0 ${
              micState 
              ? 'bg-red-500/20 border-red-500/60 text-red-300 animate-pulse' 
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
            }`}
            title={micState ? "Detener sintonizador de voz" : "Iniciar sintonizador de voz"}
          >
            {micState ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 animate-pulse" />}
          </button>

          {/* Hands-Free Conversation Mode Toggle Button */}
          <button 
            onClick={() => {
              playSystemBeep(800, 0.1);
              const nextVal = !isHandsFreeActive;
              setIsHandsFreeActive(nextVal);
              hasLoggedHandsFreeStartRef.current = false;
              if (nextVal) {
                addLog("MODO CHARLA ACTIVA: Jarvis escuchará continuamente sin requerir clicks. Diga 'Stop' o 'Para' para detener.", "success");
                // Immediately start mic if not active
                if (!micState) {
                  setTimeout(() => startActiveMicrophone(), 200);
                }
              } else {
                addLog("Modo charla continua desactivado.", "warning");
                if (micState) {
                  if (recognitionRef.current) {
                    try { recognitionRef.current.stop(); } catch (e) {}
                  }
                }
              }
            }}
            className={`px-3 py-2 rounded-lg border transition-all text-[10px] font-bold tracking-widest flex items-center gap-1.5 shrink-0 cursor-pointer ${
              isHandsFreeActive 
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] animate-pulse' 
              : 'bg-cyan-500/5 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/15'
            }`}
            title="Sintonización continua de manos libres: Jarvis le escuchará sin interrupciones ni clics adicionales"
          >
            <Activity className={`w-3.5 h-3.5 ${isHandsFreeActive ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">{isHandsFreeActive ? 'CHARLA ACTIVA ON' : 'CHARLA CONTINUA'}</span>
          </button>

          <input 
            type="text"
            value={chatPrompt}
            onChange={(e) => setChatPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleChatSubmit(); }}
            placeholder={micState ? "Decodificando flujos de voz, hable ahora Señor..." : "Escriba una orden... (ej. Pon música de AC/DC, cierra Chrome, crea un script...)"}
            className="flex-grow bg-[#020409] text-cyan-100 text-xs border border-cyan-500/30 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 font-sans tracking-wide"
          />

          <button 
            onClick={() => handleChatSubmit()}
            className="bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/30 text-cyan-100 rounded-lg px-5 flex items-center justify-center transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* STARK INDUSTRIES CORNER ADORNMENTS */}
      <div className="absolute top-4 right-4 w-12 h-0.5 bg-cyan-400/10 pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-0.5 h-12 bg-cyan-400/10 pointer-events-none" />
      <div className="absolute top-0 left-0 border-t border-l border-cyan-400/40 w-4 h-4 pointer-events-none" />
      <div className="absolute top-0 right-0 border-t border-r border-cyan-400/40 w-4 h-4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 border-b border-l border-cyan-400/40 w-4 h-4 pointer-events-none" />
      <div className="absolute bottom-0 right-0 border-b border-r border-cyan-400/40 w-4 h-4 pointer-events-none" />
    </div>
  );
}
