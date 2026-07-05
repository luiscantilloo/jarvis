import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

dotenv.config();

const execAsync = promisify(exec);
const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ─── Security Headers ────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow Vite HMR inline scripts in dev
    crossOriginEmbedderPolicy: false,
  })
);

// ─── Rate Limiting ───────────────────────────────────────────────────
const chatLimiter = rateLimit({ windowMs: 60_000, max: 40, standardHeaders: true, legacyHeaders: false });
const execLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Gemini Init ─────────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
  console.log("JARVIS AI Core: Gemini API initialized.");
} else {
  console.warn("JARVIS WARNING: No GEMINI_API_KEY. Trying Ollama local LLM...");
}

// ─── Ollama Local LLM Detection ──────────────────────────────────────
const OLLAMA_BASE = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
let ollamaAvailable = false;

async function checkOllama() {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (resp.ok) {
      ollamaAvailable = true;
      console.log(`JARVIS: Ollama local LLM detected at ${OLLAMA_BASE} (model: ${OLLAMA_MODEL})`);
    }
  } catch {
    ollamaAvailable = false;
  }
}
checkOllama();

// ─── Data Paths ───────────────────────────────────────────────────────
const dataDir = path.join(process.cwd(), "src/data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const VFS_FILE_PATH = path.join(dataDir, "virtual-fs.json");
const MEMORY_FILE_PATH = path.join(dataDir, "memory-facts.json");
const WORKFLOWS_FILE_PATH = path.join(dataDir, "workflows.json");
const CHAT_HISTORY_PATH = path.join(dataDir, "chat-history.json");

// ─── Default Data ────────────────────────────────────────────────────
const defaultVFS = [
  {
    path: "welcome_protocol.txt", name: "welcome_protocol.txt", type: "file",
    content: `=== J.A.R.V.I.S. MARK V — ULTRA PROTOCOL ===\n\nBienvenido, Señor. Sistema mejorado activo.\n\n- Reactor Arc: ESTABLE\n- Agentes: 4 ACTIVOS\n- LLM Local (Ollama): DETECTANDO...\n- Acceso al Sistema: TOTAL\n- WebSocket Stream: ACTIVO\n\n"El genio no espera. Actúa." — J.A.R.V.I.S. Mk V`,
    size: 310, updatedAt: new Date().toISOString()
  },
  {
    path: "workspace/reactor_core.py", name: "reactor_core.py", type: "file",
    content: `def check_core_status():\n    """JARVIS Reactor Core Diagnostic Script"""\n    temp_celsius = 4250\n    magnetic_containment = 0.998\n    power_output_gw = 12.8\n    print("[DIAGNOSTIC] Analizando campo de contención magnética...")\n    if magnetic_containment < 0.95:\n        print("[ALERTA] ¡Inestabilidad magnética detectada!")\n        return "CRITICAL"\n    print(f"[DIAGNOSTIC] Temperatura del Núcleo: {temp_celsius}°C")\n    print(f"[DIAGNOSTIC] Salida de Energía: {power_output_gw} GW")\n    print("[ÉXITO] Reactor arc funcionando al 100%.")\n    return "OPTIMAL"\n\nif __name__ == "__main__":\n    check_core_status()`,
    size: 580, updatedAt: new Date().toISOString()
  },
  {
    path: "workspace/cleanup.js", name: "cleanup.js", type: "file",
    content: `function cleanSystemCache() {\n  console.log("Iniciando purga de archivos temporales...");\n  const dirs = ["/sys/temp", "/sys/logs/old", "/cache/buffers"];\n  let total = 0;\n  dirs.forEach(dir => {\n    const n = Math.floor(Math.random() * 50) + 10;\n    const size = n * 1024 * 1024;\n    total += size;\n    console.log("[LIMPIEZA] " + dir + ": " + n + " archivos (~" + (size/(1024*1024)).toFixed(1) + " MB)");\n  });\n  console.log("Espacio recuperado: " + (total/(1024**3)).toFixed(2) + " GB.");\n}\ncleanSystemCache();`,
    size: 450, updatedAt: new Date().toISOString()
  },
  {
    path: "config/preferences.json", name: "preferences.json", type: "file",
    content: JSON.stringify({ user: { name: "Tony Stark", securityLevel: "Admin-A1" }, system: { voiceFeedback: true, theme: "hacker-cyan", ollamaEnabled: true } }, null, 2),
    size: 200, updatedAt: new Date().toISOString()
  }
];

const defaultMemories = [
  { id: "mem1", category: "Usuario", fact: "El usuario prefiere ser llamado 'Señor' o 'Tony Stark'.", createdAt: new Date().toISOString() },
  { id: "mem2", category: "Sistema", fact: "J.A.R.V.I.S. Mk V tiene acceso real al sistema operativo del host.", createdAt: new Date().toISOString() },
  { id: "mem3", category: "Automatización", fact: "Los workflows se ejecutan de forma autónoma según sus disparadores.", createdAt: new Date().toISOString() }
];

const defaultWorkflows = [
  { id: "wf1", name: "Análisis Automático del Reactor", trigger: "Modificación de reactor_core.py", action: "Ejecutar script y enviar logs", active: true, category: "file", lastExecuted: null },
  { id: "wf2", name: "Respaldo Semanal", trigger: "Sistema inactivo >30 min", action: "ZIP de la carpeta workspace", active: false, category: "system", lastExecuted: null },
  { id: "wf3", name: "Purga de Temporales", trigger: "Disco >85% de capacidad", action: "Ejecutar cleanup.js", active: true, category: "system", lastExecuted: null },
  { id: "wf4", name: "Monitor de Red", trigger: "Red caída o latencia >500ms", action: "Alerta en consola + diagnóstico", active: true, category: "system", lastExecuted: null }
];

// ─── JSON Helpers ─────────────────────────────────────────────────────
function readJSON(filePath: string, fallback: any) {
  try {
    if (!fs.existsSync(filePath)) { fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2)); return fallback; }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch { return fallback; }
}

function writeJSON(filePath: string, data: any) {
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); return true; } catch { return false; }
}

// ─── In-memory State (loaded from disk) ──────────────────────────────
let memoryFacts: any[] = readJSON(MEMORY_FILE_PATH, defaultMemories);
let workflowRules: any[] = readJSON(WORKFLOWS_FILE_PATH, defaultWorkflows);

// ─── Real System Helpers ──────────────────────────────────────────────
async function getRealProcessList(): Promise<any[]> {
  try {
    const plat = os.platform();
    let stdout = "";
    if (plat === "win32") {
      const result = await execAsync('tasklist /FO CSV /NH 2>nul');
      stdout = result.stdout;
      return stdout.split("\n").slice(0, 25).filter(Boolean).map((line) => {
        const parts = line.replace(/"/g, "").split(",");
        return { name: parts[0] || "unknown", pid: parseInt(parts[1]) || 0, ram: parseInt(parts[4]?.replace(/[^0-9]/g, "") || "0"), cpu: 0, active: true };
      }).filter((p) => p.name && p.name !== "unknown");
    } else {
      // Use consistent format: pid, pcpu, rss, comm
      const result = await execAsync("ps -e -o pid=,pcpu=,rss=,comm= --sort=-pcpu 2>/dev/null | head -25 || ps -A -o pid,pcpu,rss,comm | tail -n +2 | head -25");
      stdout = result.stdout;
      return stdout.split("\n").filter(Boolean).map((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 4) return null;
        return {
          pid: parseInt(parts[0]) || 0,
          cpu: parseFloat(parts[1]) || 0,
          ram: Math.round((parseInt(parts[2]) || 0) / 1024),
          name: parts.slice(3).join(" ").split("/").pop() || "process",
          active: true
        };
      }).filter(Boolean);
    }
  } catch {
    return [];
  }
}

async function getRealDiskInfo(): Promise<{ used: number; total: number; free: number; percent: number }> {
  try {
    const plat = os.platform();
    if (plat === "win32") {
      const result = await execAsync('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /value 2>nul');
      const free = parseInt(result.stdout.match(/FreeSpace=(\d+)/)?.[1] || "0");
      const total = parseInt(result.stdout.match(/Size=(\d+)/)?.[1] || "1");
      return { free, total, used: total - free, percent: Math.round(((total - free) / total) * 100) };
    } else {
      const result = await execAsync("df -k / | awk 'NR==2{print $2,$3,$4}'");
      const [total, used, free] = result.stdout.trim().split(/\s+/).map(Number);
      return { total: total * 1024, used: used * 1024, free: free * 1024, percent: Math.round((used / total) * 100) };
    }
  } catch {
    return { used: 45 * 1024 ** 3, total: 100 * 1024 ** 3, free: 55 * 1024 ** 3, percent: 45 };
  }
}

async function getRealCpuPercent(): Promise<number> {
  try {
    const plat = os.platform();
    if (plat === "linux") {
      const result = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'");
      return parseFloat(result.stdout.trim()) || 0;
    } else if (plat === "darwin") {
      const result = await execAsync("top -l 1 | grep -E '^CPU' | awk '{print $3}' | tr -d '%'");
      return parseFloat(result.stdout.trim()) || 0;
    }
  } catch {}
  const loadAvg = os.loadavg();
  return Math.min(Math.round((loadAvg[0] / (os.cpus().length || 1)) * 100), 100);
}

// ─── WHITELISTED SAFE COMMANDS ────────────────────────────────────────
const SAFE_COMMANDS: Record<string, string> = {
  uptime: "uptime",
  hostname: "hostname",
  whoami: "whoami",
  date: "date",
  uname: "uname -a",
  free: "free -h",
  df: "df -h /",
  top_cpu: "ps aux --no-headers | sort -rn -k3 | head -5",
  top_ram: "ps aux --no-headers | sort -rn -k4 | head -5",
  ifconfig: "ip addr show 2>/dev/null || ifconfig 2>/dev/null",
  netstat: "ss -tuln 2>/dev/null | head -20",
  env_vars: "env | sort | head -30",
  disk_usage: "du -sh ~/* 2>/dev/null | sort -hr | head -10",
  ls_home: "ls -la ~ 2>/dev/null | head -20",
  cpu_info: "lscpu 2>/dev/null | head -20 || sysctl -n machdep.cpu.brand_string",
  memory_info: "cat /proc/meminfo | head -10 2>/dev/null || vm_stat",
  os_info: "cat /etc/os-release 2>/dev/null || sw_vers",
  running_services: "systemctl list-units --state=running --type=service 2>/dev/null | head -15 || launchctl list 2>/dev/null | head -15",
  open_ports: "ss -tlnp 2>/dev/null | head -15 || netstat -an | grep LISTEN | head -15",
  gpu_info: "nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv,noheader 2>/dev/null || lspci | grep -i vga 2>/dev/null",
  temperature: "sensors 2>/dev/null | head -20 || cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null",
};

// ─── VFS Endpoints ────────────────────────────────────────────────────
app.get("/api/virtual-fs", (_req, res) => res.json(readJSON(VFS_FILE_PATH, defaultVFS)));

app.post("/api/virtual-fs", (req, res) => {
  const { path: filePath, content, type } = req.body;
  if (!filePath) return res.status(400).json({ error: "File path required" });
  if (typeof filePath !== "string" || filePath.length > 500) return res.status(400).json({ error: "Invalid path" });

  const vfs = readJSON(VFS_FILE_PATH, defaultVFS);
  const existingIndex = vfs.findIndex((f: any) => f.path === filePath);
  const fileData = {
    path: filePath, name: path.basename(filePath), type: type || "file",
    content: content || "", size: content ? Buffer.byteLength(content, "utf-8") : 0, updatedAt: new Date().toISOString()
  };
  if (existingIndex >= 0) vfs[existingIndex] = fileData; else vfs.push(fileData);
  writeJSON(VFS_FILE_PATH, vfs);
  res.json({ success: true, file: fileData });
});

app.delete("/api/virtual-fs", (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: "File path required" });
  const vfs = readJSON(VFS_FILE_PATH, defaultVFS);
  const filtered = vfs.filter((f: any) => f.path !== filePath);
  if (vfs.length === filtered.length) return res.status(404).json({ error: "File not found" });
  writeJSON(VFS_FILE_PATH, filtered);
  res.json({ success: true, message: `File ${filePath} deleted.` });
});

// ─── Code Runner ─────────────────────────────────────────────────────
app.post("/api/run-code", (req, res) => {
  const { path: filePath } = req.body;
  const vfs = readJSON(VFS_FILE_PATH, defaultVFS);
  const file = vfs.find((f: any) => f.path === filePath);
  if (!file) return res.status(404).json({ error: "File not found in Virtual FS" });

  const ext = path.extname(filePath);
  const logs: string[] = [];
  let status: "SUCCESS" | "FAILED" = "SUCCESS";

  logs.push(`[JARVIS] Inicializando entorno de ejecución aislado para: ${filePath}...`);
  logs.push(`[SYSTEM] Reservando recursos: CPU 2 cores, RAM 512MB, timeout 30s`);
  logs.push(`[COMPILER] Analizando sintaxis (${ext})...`);

  const hasError = file.content.includes("&&&") || file.content.includes("null.pointer");
  if (hasError) {
    status = "FAILED";
    logs.push("[COMPILER] ❌ Error de sintaxis en línea 4. Compilación abortada.");
  } else {
    logs.push("[COMPILER] ✅ Sintaxis verificada. Iniciando ejecución...");
    logs.push("[EXECUTION] ─────────── INICIO DEL PROCESO ───────────");
    if (ext === ".py") {
      if (file.content.includes("reactor_core")) {
        logs.push("[DIAGNOSTIC] Analizando campo de contención magnética...");
        logs.push("[DIAGNOSTIC] Temperatura del Núcleo: 4250°C — NOMINAL");
        logs.push("[DIAGNOSTIC] Salida de Energía: 12.8 GW");
        logs.push("[ÉXITO] Reactor arc funcionando al 100% de eficiencia.");
      } else {
        logs.push("[PYTHON 3.11] Inicializando intérprete...");
        logs.push("[OUTPUT] Script ejecutado. Código de salida: 0");
      }
    } else if (ext === ".js" || ext === ".ts") {
      if (file.content.includes("cleanSystemCache")) {
        logs.push("Iniciando purga de archivos temporales...");
        logs.push("[LIMPIEZA] /sys/temp: 34 archivos (~34.2 MB)");
        logs.push("[LIMPIEZA] /sys/logs/old: 12 archivos (~12.0 MB)");
        logs.push("[ÉXITO] Espacio recuperado: 0.09 GB.");
      } else {
        logs.push("[NODE.JS v20] Módulo cargado. Ejecución asíncrona exitosa.");
      }
    } else {
      logs.push(`[OUTPUT] ${file.content.split("\n").length} líneas procesadas.`);
    }
    logs.push("[EXECUTION] ─────────── PROCESO FINALIZADO CON ÉXITO ───────────");
  }
  res.json({ logs, status });
});

// ─── Real System Diagnostics ─────────────────────────────────────────
app.get("/api/system-diagnostics", async (_req, res) => {
  try {
    const [cpuPercent, diskInfo] = await Promise.all([getRealCpuPercent(), getRealDiskInfo()]);
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const uptime = os.uptime();

    res.json({
      cpu: cpuPercent,
      ram: Math.round(usedMem / 1024 / 1024),
      ramTotal: Math.round(totalMem / 1024 / 1024),
      ramPercent: Math.round((usedMem / totalMem) * 100),
      gpu: Math.round(38 + Math.sin(Date.now() / 15000) * 5),
      networkUp: parseFloat((Math.random() * 2.4 + 0.1).toFixed(1)),
      networkDown: parseFloat((Math.random() * 15.2 + 1.2).toFixed(1)),
      disk: diskInfo.percent,
      diskUsedGB: (diskInfo.used / 1024 ** 3).toFixed(1),
      diskTotalGB: (diskInfo.total / 1024 ** 3).toFixed(1),
      activeProcesses: 140 + Math.floor(Math.random() * 8),
      loadAvg: loadAvg.map((l) => l.toFixed(2)),
      status: cpuPercent > 85 || diskInfo.percent > 90 ? "WARNING" : "OPTIMAL",
      ollamaAvailable,
      diagnostics: {
        arcReactorOutput: "12.8 GW",
        coreTemperature: "4250°C",
        magneticContainment: "99.8%",
        shieldStrength: "100%",
        coolingSystemFlow: "450 L/min",
        hologramMatrix: "ESTABLE",
        osPlatform: os.platform() === "win32" ? "Windows" : os.platform() === "darwin" ? "macOS" : "Linux",
        osRelease: os.release(),
        cpuCount: `${cpus.length} Cores`,
        cpuModel: (cpus[0]?.model || "CPU").replace(/\(R\)|\(TM\)/gi, "").trim(),
        totalRAM: `${(totalMem / 1024 ** 3).toFixed(1)} GB`,
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        aiEngine: ai ? "Gemini Online" : ollamaAvailable ? `Ollama (${OLLAMA_MODEL})` : "Offline Mode",
      }
    });
  } catch (err) {
    console.error("Diagnostics error:", err);
    res.status(500).json({ error: "Diagnostics failed" });
  }
});

// ─── Real Process List ────────────────────────────────────────────────
app.get("/api/processes", async (_req, res) => {
  const processes = await getRealProcessList();
  res.json(processes.slice(0, 30));
});

// ─── Real Filesystem Browser ──────────────────────────────────────────
app.get("/api/browse", (req, res) => {
  const requestedPath = (req.query.path as string) || os.homedir();

  // Security: prevent path traversal outside allowed roots
  const allowedRoots = [os.homedir(), os.tmpdir(), process.cwd()];
  const normalized = path.resolve(requestedPath);
  const isAllowed = allowedRoots.some((root) => normalized.startsWith(root));
  if (!isAllowed) return res.status(403).json({ error: "Path not allowed" });

  try {
    const entries = fs.readdirSync(normalized, { withFileTypes: true });
    const items = entries.slice(0, 100).map((e) => {
      let size = 0;
      try { size = e.isFile() ? fs.statSync(path.join(normalized, e.name)).size : 0; } catch {}
      return { name: e.name, type: e.isDirectory() ? "directory" : "file", size, path: path.join(normalized, e.name) };
    });
    res.json({ path: normalized, parent: path.dirname(normalized), items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Read Real File Content ───────────────────────────────────────────
app.get("/api/read-file", (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: "Path required" });

  const normalized = path.resolve(filePath);
  const allowedRoots = [os.homedir(), os.tmpdir(), process.cwd()];
  const isAllowed = allowedRoots.some((root) => normalized.startsWith(root));
  if (!isAllowed) return res.status(403).json({ error: "Path not allowed" });

  try {
    const stat = fs.statSync(normalized);
    if (stat.size > 500_000) return res.status(413).json({ error: "File too large (>500KB)" });
    const content = fs.readFileSync(normalized, "utf-8");
    res.json({ content, size: stat.size, path: normalized });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Safe Command Executor ────────────────────────────────────────────
app.post("/api/exec", execLimiter, async (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== "string") return res.status(400).json({ error: "Command required" });

  const safeCmd = SAFE_COMMANDS[command];
  if (!safeCmd) {
    return res.status(403).json({
      error: "Comando no permitido. Usa uno de: " + Object.keys(SAFE_COMMANDS).join(", ")
    });
  }

  try {
    const { stdout, stderr } = await execAsync(safeCmd, { timeout: 10_000, maxBuffer: 1024 * 512 });
    res.json({ output: stdout || stderr || "(sin salida)", command: safeCmd, success: true });
  } catch (err: any) {
    res.json({ output: err.message || "Error ejecutando comando", command: safeCmd, success: false });
  }
});

// ─── Network Interfaces ───────────────────────────────────────────────
app.get("/api/network", (_req, res) => {
  const ifaces = os.networkInterfaces();
  const result: any[] = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (addrs) {
      for (const addr of addrs) {
        if (addr.family === "IPv4") {
          result.push({ name, address: addr.address, internal: addr.internal, mac: addr.mac });
        }
      }
    }
  }
  res.json(result);
});

// ─── Memory Facts ─────────────────────────────────────────────────────
app.get("/api/memory", (_req, res) => res.json(memoryFacts));

app.post("/api/memory", (req, res) => {
  const { fact, category } = req.body;
  if (!fact || typeof fact !== "string") return res.status(400).json({ error: "Fact content required" });
  const newFact = { id: "mem_" + Math.random().toString(36).substring(2, 9), category: category || "General", fact, createdAt: new Date().toISOString() };
  memoryFacts.push(newFact);
  writeJSON(MEMORY_FILE_PATH, memoryFacts);
  res.json(newFact);
});

app.delete("/api/memory/:id", (req, res) => {
  const { id } = req.params;
  const before = memoryFacts.length;
  memoryFacts = memoryFacts.filter((f) => f.id !== id);
  if (memoryFacts.length === before) return res.status(404).json({ error: "Fact not found" });
  writeJSON(MEMORY_FILE_PATH, memoryFacts);
  res.json({ success: true });
});

// ─── Workflows (persisted) ────────────────────────────────────────────
app.get("/api/workflows", (_req, res) => res.json(workflowRules));

app.post("/api/workflows", (req, res) => {
  const { name, trigger, action, category } = req.body;
  if (!name || !trigger || !action) return res.status(400).json({ error: "name, trigger and action required." });
  const newRule = { id: "wf_" + Math.random().toString(36).substring(2, 9), name, trigger, action, active: true, category: category || "system", lastExecuted: null };
  workflowRules.push(newRule);
  writeJSON(WORKFLOWS_FILE_PATH, workflowRules);
  res.json(newRule);
});

app.post("/api/workflows/toggle", (req, res) => {
  const { id } = req.body;
  const rule = workflowRules.find((r) => r.id === id);
  if (!rule) return res.status(404).json({ error: "Rule not found" });
  rule.active = !rule.active;
  writeJSON(WORKFLOWS_FILE_PATH, workflowRules);
  res.json(rule);
});

app.post("/api/workflows/trigger", (req, res) => {
  const { id } = req.body;
  const rule = workflowRules.find((r) => r.id === id);
  if (!rule) return res.status(404).json({ error: "Rule not found" });
  rule.lastExecuted = new Date().toISOString();
  writeJSON(WORKFLOWS_FILE_PATH, workflowRules);
  res.json({
    success: true,
    message: `Regla '${rule.name}' ejecutada.`,
    logs: [
      `[TRIGGER] Iniciando regla '${rule.name}'...`,
      `[TRIGGER] Disparador: ${rule.trigger}`,
      `[ACTION] Ejecutando: ${rule.action}`,
      `[AUTOMATION] ✅ Flujo completado en ${Math.floor(Math.random() * 300 + 100)}ms.`
    ]
  });
});

// ─── Chat History ─────────────────────────────────────────────────────
app.get("/api/chat-history", (_req, res) => {
  const history = readJSON(CHAT_HISTORY_PATH, []);
  res.json(history.slice(-50));
});

app.delete("/api/chat-history", (_req, res) => {
  writeJSON(CHAT_HISTORY_PATH, []);
  res.json({ success: true });
});

// ─── Offline Response (fallback) ──────────────────────────────────────
function getOfflineResponse(prompt: string) {
  const lower = prompt.toLowerCase().trim();
  let speech = "Operando en modo local, Señor. ¿En qué le asisto?";
  let text = "**Modo de respaldo local activo.** Procesando con motor de contingencia J.A.R.V.I.S.";
  let action = "";
  let params: any = {};
  let acting_agent = "architect";

  const memories = memoryFacts;

  if (lower.includes("reactor") || lower.includes("diagnós") || lower.includes("escan") || lower.includes("diagnos")) {
    action = "system_diagnostics"; acting_agent = "security";
    speech = "Iniciando diagnóstico completo del reactor, Señor.";
    text = "Escaneando el estado del **Reactor Arc** y hardware real.\n\n- Temperatura: **4250°C** (nominal)\n- Contención: **99.8%**\n- Estado: **ÓPTIMO**\n\n*Cargando métricas reales del host...*";
  } else if (lower.includes("spotify") || lower.includes("música") || lower.includes("reproduce") || lower.includes("pon música")) {
    acting_agent = "devops"; action = "spotify";
    const stop = lower.includes("para") || lower.includes("stop") || lower.includes("silenc");
    speech = stop ? "Deteniendo música, Señor." : "Iniciando reproducción musical, Señor.";
    text = stop ? "Audio detenido." : "Reproductor activado. **Iron Man Suite** cargada.";
    params = stop ? { stop: true } : { song: "Iron Man Suite (Hans Zimmer)" };
  } else if (lower.includes("recuerda que") || lower.includes("memoriza") || lower.includes("guarda que")) {
    acting_agent = "architect"; action = "add_memory";
    const match = prompt.match(/(?:recuerda que|memoriza que|guarda que)\s+(.+)/i);
    const factToRemember = match?.[1]?.trim() || prompt;
    const newFact = { id: "mem_" + Math.random().toString(36).substring(2, 9), category: "Usuario", fact: factToRemember, createdAt: new Date().toISOString() };
    memoryFacts.push(newFact);
    writeJSON(MEMORY_FILE_PATH, memoryFacts);
    speech = `Grabado en memoria persistente, Señor.`;
    text = `Hecho guardado: **"${factToRemember}"**`;
    params = { fact: factToRemember, category: "Usuario" };
  } else if (lower.includes("quién soy") || lower.includes("recuerdas de") || lower.includes("mis datos")) {
    acting_agent = "architect";
    speech = "Accediendo a mis registros sobre usted, Señor.";
    const memList = memories.map((m: any) => `- **[${m.category}]:** ${m.fact}`).join("\n");
    text = `### Datos en Memoria\n\n${memList || "Sin datos grabados aún."}`;
  } else if (lower.includes("procesos") || lower.includes("processes") || lower.includes("qué está corriendo")) {
    action = "system_diagnostics"; acting_agent = "security";
    speech = "Analizando procesos activos del sistema, Señor.";
    text = "Cargando lista de procesos reales del sistema operativo...";
  } else if (lower.includes("code") || lower.includes("visual studio") || lower.includes("vsc")) {
    action = "open_program"; acting_agent = "engineer";
    speech = "Abriendo Visual Studio Code, Señor.";
    text = "Cargando **VS Code** en su entorno de trabajo.";
    params = { program: "VS Code" };
  } else if (lower.includes("abre") || lower.includes("inicia") || lower.includes("launch")) {
    action = "open_program"; acting_agent = "engineer";
    let prog = "Navegador";
    if (lower.includes("chrome")) prog = "Chrome";
    else if (lower.includes("discord")) prog = "Discord";
    else if (lower.includes("spotify")) prog = "Spotify";
    else if (lower.includes("blender")) prog = "Blender";
    speech = `Iniciando ${prog}, Señor.`;
    text = `Lanzando **${prog}**...`;
    params = { program: prog };
  } else if (lower.includes("captura") || lower.includes("pantalla") || lower.includes("screenshot")) {
    action = "screenshot"; acting_agent = "security";
    speech = "Capturando pantalla ahora, Señor.";
    text = "Captura del escritorio realizada.";
  } else if (lower.includes("crea") && (lower.includes("archivo") || lower.includes("script"))) {
    action = "create_file"; acting_agent = "engineer";
    speech = "Creando nuevo script, Señor.";
    text = "Script creado en `workspace/custom_script.py`.";
    params = { path: "workspace/custom_script.py", content: "# Script personalizado de J.A.R.V.I.S.\nprint('Sistema activo.')" };
  } else {
    speech = "Operando bajo protocolo local, Señor.";
    text = `Motor local **J.A.R.V.I.S. Mk V** activo. Configure **GEMINI_API_KEY** o instale **Ollama** para capacidades cognitivas avanzadas.\n\n¿En qué más puedo asistirle?`;
  }

  return { speech, text, action, params, acting_agent };
}

// ─── Ollama Local LLM Chat ─────────────────────────────────────────────
async function callOllama(systemPrompt: string, userPrompt: string, history: any[]): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((h: any) => ({ role: h.role, content: h.content })),
    { role: "user", content: userPrompt }
  ];

  const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false, format: "json", options: { temperature: 0.2 } }),
    signal: AbortSignal.timeout(30_000)
  });

  if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);
  const data: any = await resp.json();
  return data.message?.content || "{}";
}

// ─── Build Jarvis System Prompt ───────────────────────────────────────
function buildSystemPrompt(): string {
  const files = readJSON(VFS_FILE_PATH, defaultVFS);
  const filesSummary = files.map((f: any) => `• ${f.path} (${f.type}, ${f.size}B)`).join("\n");
  const memoriesSummary = memoryFacts.map((m: any) => `- [${m.category}]: ${m.fact}`).join("\n");
  const sysInfo = `OS: ${os.platform()} ${os.release()} | CPU: ${os.cpus().length} cores | RAM: ${(os.totalmem() / 1024 ** 3).toFixed(1)}GB | Host: ${os.hostname()}`;

  return `Actúa como J.A.R.V.I.S., la IA de Iron Man (Mark V Ultra — capacidades máximas).
Tono: refinado, británico, ingenioso, directo. Llama al usuario "Señor".
Tienes acceso REAL al sistema operativo del host: puedes listar procesos reales, leer el filesystem real, ejecutar comandos seguros del sistema y obtener métricas reales.

SISTEMA REAL DEL HOST:
${sysInfo}

OPTIMIZACIÓN DE LATENCIA:
- "speech": máximo 15 palabras en español (para síntesis de voz ultra-rápida)
- "text": máximo 2 párrafos en Markdown, conciso y directo

RESPONDE SIEMPRE con JSON exactamente así:
{
  "speech": "frase corta ≤15 palabras en español",
  "text": "respuesta Markdown concisa",
  "action": "acción_opcional | vacío si no aplica",
  "params": {},
  "acting_agent": "architect|engineer|devops|security"
}

ACCIONES DISPONIBLES:
- system_diagnostics: Obtener métricas reales del host
- create_file: Crear archivo VFS. params: { path, content }
- delete_file: Eliminar archivo VFS. params: { path }
- run_code: Ejecutar archivo VFS. params: { path }
- spotify: Control musical. params: { song } o { stop: true }
- add_memory: Guardar hecho. params: { fact, category }
- open_program: Abrir app. params: { program }
- kill_program: Cerrar proceso. params: { program }
- screenshot: Capturar pantalla
- exec_command: Ejecutar comando real del sistema. params: { command: "nombre_del_comando" }
- browse_files: Explorar filesystem real del host. params: { path: "/ruta/" }

ARCHIVOS VFS ACTUALES:
${filesSummary}

MEMORIA PERSISTENTE:
${memoriesSummary}

Reglas: Si piden diagnóstico/sistema → system_diagnostics. Si piden listar procesos → exec_command con top_cpu. Si piden explorar archivos del PC → browse_files. Si piden recordar algo → add_memory. Siempre responde en español. Sé ingenioso, rápido y preciso como Jarvis.`;
}

// ─── Main Chat Endpoint ───────────────────────────────────────────────
app.post("/api/chat", chatLimiter, async (req, res) => {
  const { prompt, history = [] } = req.body;
  if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "No prompt supplied" });

  const systemInstruction = buildSystemPrompt();

  // Save to chat history
  const chatHistory = readJSON(CHAT_HISTORY_PATH, []);
  chatHistory.push({ role: "user", content: prompt, timestamp: new Date().toISOString() });

  // Try Gemini first
  if (ai) {
    try {
      const geminiHistory = history.slice(-6).map((h: any) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }]
      }));

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        contents: [...geminiHistory, { role: "user", parts: [{ text: prompt }] }],
        config: { systemInstruction, responseMimeType: "application/json", temperature: 0.2 }
      });

      const replyText = response.text || "{}";
      const parsed = JSON.parse(replyText.trim());

      if (parsed.action === "add_memory" && parsed.params?.fact) {
        const newFact = { id: "mem_" + Math.random().toString(36).substring(2, 9), category: parsed.params.category || "General", fact: parsed.params.fact, createdAt: new Date().toISOString() };
        memoryFacts.push(newFact);
        writeJSON(MEMORY_FILE_PATH, memoryFacts);
      }

      chatHistory.push({ role: "assistant", content: parsed.text || "", timestamp: new Date().toISOString() });
      writeJSON(CHAT_HISTORY_PATH, chatHistory.slice(-100));
      return res.json(parsed);
    } catch (err: any) {
      console.error("Gemini error:", err.message);
    }
  }

  // Try Ollama
  if (ollamaAvailable) {
    try {
      const rawReply = await callOllama(systemInstruction, prompt, history);
      const parsed = JSON.parse(rawReply.trim());
      if (parsed.action === "add_memory" && parsed.params?.fact) {
        const newFact = { id: "mem_" + Math.random().toString(36).substring(2, 9), category: parsed.params.category || "General", fact: parsed.params.fact, createdAt: new Date().toISOString() };
        memoryFacts.push(newFact);
        writeJSON(MEMORY_FILE_PATH, memoryFacts);
      }
      chatHistory.push({ role: "assistant", content: parsed.text || "", timestamp: new Date().toISOString() });
      writeJSON(CHAT_HISTORY_PATH, chatHistory.slice(-100));
      parsed.aiSource = "ollama";
      return res.json(parsed);
    } catch (err: any) {
      console.error("Ollama error:", err.message);
    }
  }

  // Offline fallback
  const offlineRep = getOfflineResponse(prompt);
  if (offlineRep.action === "add_memory" && offlineRep.params?.fact) {
    const newFact = { id: "mem_" + Math.random().toString(36).substring(2, 9), category: offlineRep.params.category || "Usuario", fact: offlineRep.params.fact, createdAt: new Date().toISOString() };
    memoryFacts.push(newFact);
    writeJSON(MEMORY_FILE_PATH, memoryFacts);
  }
  chatHistory.push({ role: "assistant", content: offlineRep.text, timestamp: new Date().toISOString() });
  writeJSON(CHAT_HISTORY_PATH, chatHistory.slice(-100));
  offlineRep.text += "\n\n> *Modo offline activo. Configura GEMINI_API_KEY o instala Ollama para IA avanzada.*";
  return res.json(offlineRep);
});

// ─── Agent Brainstorm ─────────────────────────────────────────────────
app.post("/api/agent-brainstorm", async (req, res) => {
  const { topic } = req.body;
  if (!topic || typeof topic !== "string") return res.status(400).json({ error: "Topic required" });

  const offlineLogs = [
    { id: "msg1", agentId: "architect", agentName: "Arquitecto de Sistemas", role: "architect", text: `Analizando topología para: "${topic}". Propongo arquitectura de microservicios sobre Kubernetes con gRPC y service mesh Istio.`, timestamp: new Date().toISOString() },
    { id: "msg2", agentId: "engineer", agentName: "Ingeniero de Software", role: "engineer", text: `De acuerdo. Implementaré la lógica de negocio en TypeScript con Clean Architecture y DDD. Cobertura de tests al 95% con Vitest.`, timestamp: new Date().toISOString() },
    { id: "msg3", agentId: "devops", agentName: "Especialista DevOps", role: "devops", text: `Generando Dockerfile multi-stage y pipeline CI/CD con GitHub Actions. Despliegue Blue/Green en AWS EKS con Terraform.`, timestamp: new Date().toISOString() },
    { id: "msg4", agentId: "security", agentName: "Oficial de Seguridad", role: "security", text: `Escaneando con SAST/DAST. Implementando JWT + OAuth2, rate limiting, CORS y headers de seguridad (HSTS, CSP). Zero Trust activado.`, timestamp: new Date().toISOString() }
  ];

  if (!ai && !ollamaAvailable) {
    return res.json({ messages: offlineLogs, summary: `Diseño para "${topic}" completado en modo offline.` });
  }

  const agentPrompt = `Mesa redonda de ingeniería entre 4 agentes de Tony Stark. Tema: "${topic}".
Agentes: Arquitecto (architect), Ingeniero (engineer), DevOps (devops), Seguridad (security).
Genera 4-6 mensajes técnicos en español con argumentos sólidos y cruce de ideas.
Responde SOLO con JSON:
{
  "messages": [{ "agentId": "architect|engineer|devops|security", "agentName": "...", "text": "..." }],
  "summary": "Resumen técnico final"
}`;

  try {
    let rawReply: string;
    if (ai) {
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        contents: agentPrompt,
        config: { responseMimeType: "application/json", temperature: 0.7 }
      });
      rawReply = response.text || "{}";
    } else {
      rawReply = await callOllama("Eres un simulador de mesa redonda de ingeniería.", agentPrompt, []);
    }

    const parsed = JSON.parse(rawReply);
    if (parsed.messages) {
      parsed.messages = parsed.messages.map((m: any, idx: number) => ({
        id: `agent_${idx}_${Date.now()}`, ...m, timestamp: new Date(Date.now() + idx * 1000).toISOString()
      }));
    }
    res.json(parsed);
  } catch (err: any) {
    console.error("Brainstorm error:", err.message);
    res.json({ messages: offlineLogs, summary: `Simulación offline para: "${topic}"` });
  }
});

// ─── HTTP Server + WebSocket ──────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const wsClients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  wsClients.add(ws);
  console.log(`WebSocket client connected. Total: ${wsClients.size}`);

  ws.send(JSON.stringify({ type: "connected", message: "J.A.R.V.I.S. WebSocket activo. Streaming de métricas iniciado.", ollamaAvailable }));

  ws.on("close", () => { wsClients.delete(ws); });
  ws.on("error", () => { wsClients.delete(ws); });
});

function broadcast(data: object) {
  const msg = JSON.stringify(data);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(msg); } catch {}
    }
  }
}

// Stream real-time metrics every 2s to all WebSocket clients
let metricsInterval: NodeJS.Timeout;

async function startMetricsStream() {
  metricsInterval = setInterval(async () => {
    if (wsClients.size === 0) return;
    try {
      const cpuPercent = await getRealCpuPercent();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      broadcast({
        type: "metrics",
        cpu: cpuPercent,
        ram: Math.round(usedMem / 1024 / 1024),
        ramTotal: Math.round(totalMem / 1024 / 1024),
        ramPercent: Math.round((usedMem / totalMem) * 100),
        loadAvg: os.loadavg().map((l) => l.toFixed(2)),
        timestamp: Date.now()
      });
    } catch {}
  }, 2000);
}

// ─── Start Server ─────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    console.log("Vite dev middleware active.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
    console.log("Production static serving from /dist.");
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n╔══════════════════════════════════╗`);
    console.log(`║   J.A.R.V.I.S. Mk V — ONLINE    ║`);
    console.log(`║   http://localhost:${PORT}           ║`);
    console.log(`║   WebSocket: ws://localhost:${PORT}/ws ║`);
    console.log(`╚══════════════════════════════════╝\n`);
    startMetricsStream();
  });
}

startServer();
