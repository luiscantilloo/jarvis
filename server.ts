import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  console.log("JARVIS AI Core: Gemini API initialized successfully.");
} else {
  console.warn("JARVIS AI Core WARNING: GEMINI_API_KEY not found in environment. Simulated offline AI mode active.");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- VIRTUAL FILESYSTEM ENGINE ---
const VFS_FILE_PATH = path.join(process.cwd(), "src/data/virtual-fs.json");

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "src/data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Default virtual filesystem
const defaultVFS = [
  {
    path: "welcome_protocol.txt",
    name: "welcome_protocol.txt",
    type: "file",
    content: `==================================================
   J.A.R.V.I.S. SYSTEM INTERACTIVE PROTOCOL v4.11
==================================================

Bienvenido, Señor. El Asistente Virtual Inteligente de Seguridad y Diagnóstico está completamente operativo.

He inicializado los subsistemas centrales en este sandbox seguro. Todos los sistemas informan verde:
- Núcleo del Reactor Arc: ESTABLE (Consumo nominal)
- Red Neuronal de Agentes: ACTIVA (4 Agentes en espera)
- Terminal y Compilador Virtual: CONECTADOS
- Sensor de Voz y Audio: SINTONIZADO
- Sistema de Automatización de Flujos: OPERATIVO

Instrucciones de Voz Rápidas:
- Diga "Jarvis, analiza el reactor" para comprobar diagnósticos.
- Diga "Jarvis, crea un script en Python" para escribir código de automatización.
- Diga "Jarvis, pon música de fondo" para iniciar el reproductor integrado.

Estoy a su servicio para automatizar, programar y supervisar su entorno.

-- Jarvis`,
    size: 920,
    updatedAt: new Date().toISOString()
  },
  {
    path: "workspace/reactor_core.py",
    name: "reactor_core.py",
    type: "file",
    content: `def check_core_status():
    """JARVIS Reactor Core Diagnostic Script"""
    temp_celsius = 4250
    magnetic_containment = 0.998
    power_output_gw = 12.8
    
    print("[DIAGNOSTIC] Analizando campo de contención magnética...")
    if magnetic_containment < 0.95:
        print("[ALERTA] Inestabilidad magnética detectada en el reactor!")
        return "CRITICAL"
        
    print(f"[DIAGNOSTIC] Temperatura del Núcleo: {temp_celsius}°C")
    print(f"[DIAGNOSTIC] Salida de Energía: {power_output_gw} GW")
    print("[ÉXITO] El reactor arc está funcionando al 100% de eficiencia.")
    return "OPTIMAL"

if __name__ == "__main__":
    check_core_status()`.replace(/\$\{/g, "\\${"),
    size: 580,
    updatedAt: new Date().toISOString()
  },
  {
    path: "workspace/cleanup.js",
    name: "cleanup.js",
    type: "file",
    content: `/**
 * Script de limpieza automatizada de temporales del sistema.
 */
function cleanSystemCache() {
  console.log("Iniciando purga de archivos temporales...");
  const tempDirectories = ["/sys/temp", "/sys/logs/old", "/cache/buffers"];
  let totalCleanedBytes = 0;
  
  tempDirectories.forEach(dir => {
    const fakeCleanCount = Math.floor(Math.random() * 50) + 10;
    const sizeCleaned = fakeCleanCount * 1024 * 1024; // MB
    totalCleanedBytes += sizeCleaned;
    console.log("[LIMPIEZA] " + dir + ": Eliminados " + fakeCleanCount + " archivos temporales (~" + (sizeCleaned / (1024*1024)).toFixed(1) + " MB)");
  });
  
  console.log("Limpieza finalizada. Espacio recuperado: " + (totalCleanedBytes / (1024*1024*1024)).toFixed(2) + " GB.");
  return true;
}

cleanSystemCache();`,
    size: 730,
    updatedAt: new Date().toISOString()
  },
  {
    path: "config/preferences.json",
    name: "preferences.json",
    type: "file",
    content: JSON.stringify({
      user: {
        name: "Tony Stark",
        accent: "Spanish-Jarvis",
        securityLevel: "Admin-A1",
        favoriteVolume: 75,
        continuousListening: true
      },
      system: {
        voiceFeedback: true,
        ambientVibe: "blue-arc",
        terminalTheme: "hacker-cyan",
        autoRefactor: false
      }
    }, null, 2),
    size: 320,
    updatedAt: new Date().toISOString()
  }
];

// Helper to read VFS
function getVFS() {
  try {
    if (!fs.existsSync(VFS_FILE_PATH)) {
      fs.writeFileSync(VFS_FILE_PATH, JSON.stringify(defaultVFS, null, 2));
      return defaultVFS;
    }
    const data = fs.readFileSync(VFS_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("VFS Read Error, falling back to in-memory:", err);
    return defaultVFS;
  }
}

// Helper to write VFS
function saveVFS(vfsData: any) {
  try {
    fs.writeFileSync(VFS_FILE_PATH, JSON.stringify(vfsData, null, 2));
    return true;
  } catch (err) {
    console.error("VFS Write Error:", err);
    return false;
  }
}

// --- LOCAL PERSISTENCE FOR MEMORY ---
const MEMORY_FILE_PATH = path.join(process.cwd(), "src/data/memory-facts.json");
const defaultMemories = [
  { id: "mem1", category: "Usuario", fact: "El usuario prefiere ser llamado 'Señor' o 'Tony Stark'.", createdAt: new Date().toISOString() },
  { id: "mem2", category: "Reactor", fact: "El núcleo del reactor opera de forma segura por debajo de los 4500°C.", createdAt: new Date().toISOString() },
  { id: "mem3", category: "Automatización", fact: "Los flujos automáticos se ejecutan los viernes por la tarde.", createdAt: new Date().toISOString() }
];

function getMemories() {
  try {
    if (!fs.existsSync(MEMORY_FILE_PATH)) {
      fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(defaultMemories, null, 2));
      return defaultMemories;
    }
    const data = fs.readFileSync(MEMORY_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Memory Read Error, falling back to default:", err);
    return defaultMemories;
  }
}

function saveMemories(memData: any) {
  try {
    fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(memData, null, 2));
    return true;
  } catch (err) {
    console.error("Memory Write Error:", err);
    return false;
  }
}

// Initialize memory facts from disk
let memoryFacts: any[] = getMemories();

// Workflow rules storage
let workflowRules: any[] = [
  { id: "wf1", name: "Análisis Automático del Reactor", trigger: "Cada vez que se modifica workspace/reactor_core.py", action: "Ejecutar script y enviar logs al terminal principal", active: true, category: "file" },
  { id: "wf2", name: "Respaldo Semanal", trigger: "Sistema en estado Inactivo (Idle) más de 30 minutos", action: "Crear archivo ZIP comprimido de la carpeta workspace", active: false, category: "system" },
  { id: "wf3", name: "Purga de Temporales", trigger: "Consumo de disco supera el 85%", action: "Ejecutar workspace/cleanup.js", active: true, category: "system" }
];

// --- ENDPOINTS ---

// VFS endpoints
app.get("/api/virtual-fs", (req, res) => {
  res.json(getVFS());
});

app.post("/api/virtual-fs", (req, res) => {
  const { path: filePath, content, type } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: "File path required" });
  }

  const vfs = getVFS();
  const existingIndex = vfs.findIndex((f: any) => f.path === filePath);

  const fileData = {
    path: filePath,
    name: path.basename(filePath),
    type: type || "file",
    content: content || "",
    size: content ? Buffer.byteLength(content, "utf-8") : 0,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    vfs[existingIndex] = fileData;
  } else {
    vfs.push(fileData);
  }

  saveVFS(vfs);
  res.json({ success: true, file: fileData });
});

app.delete("/api/virtual-fs", (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: "File path required" });
  }

  let vfs = getVFS();
  const filtered = vfs.filter((f: any) => f.path !== filePath);
  
  if (vfs.length === filtered.length) {
    return res.status(404).json({ error: "File not found" });
  }

  saveVFS(filtered);
  res.json({ success: true, message: `File ${filePath} deleted.` });
});

// Run Code simulation endpoint
app.post("/api/run-code", (req, res) => {
  const { path: filePath } = req.body;
  const vfs = getVFS();
  const file = vfs.find((f: any) => f.path === filePath);

  if (!file) {
    return res.status(404).json({ error: "File not found inside Virtual FS" });
  }

  // Generate hyper-realistic running trace log based on language
  const ext = path.extname(filePath);
  const logs: string[] = [];
  let status: "SUCCESS" | "FAILED" = "SUCCESS";

  logs.push(`[SYSTEM] Inicializando máquina virtual aislada para: ${filePath}...`);
  logs.push(`[SYSTEM] Reservando recursos de CPU y memoria para hilo virtual...`);
  logs.push(`[COMPILER] Analizando sintaxis de código (${ext})...`);

  // Simple static code checker for simulator
  const errors: string[] = [];
  if (file.content.includes("SyntaxError") || file.content.includes("&&&") || file.content.includes("null.pointer")) {
    errors.push("Error de Sintaxis detectable en la línea 4: Token inesperado.");
  }

  if (errors.length > 0) {
    status = "FAILED";
    logs.push(...errors);
    logs.push(`[COMPILER] ❌ Compilación abortada por fallas críticas.`);
  } else {
    logs.push(`[COMPILER] Código verificado sin fallas estáticas. Iniciando ejecución.`);
    logs.push(`[EXECUTION] -------- COMIENZO DEL PROCESO --------`);
    
    // Simulate line by line execution by parsing simple logs or generating tailored outputs
    if (ext === ".py") {
      if (file.content.includes("reactor_core")) {
        logs.push("[DIAGNOSTIC] Analizando campo de contención magnética...");
        logs.push("[DIAGNOSTIC] Temperatura del Núcleo: 4250°C");
        logs.push("[DIAGNOSTIC] Salida de Energía: 12.8 GW");
        logs.push("[ÉXITO] El reactor arc está funcionando al 100% de eficiencia.");
      } else {
        logs.push(`[OUTPUT] Iniciando script Python virtual.`);
        logs.push(`[OUTPUT] Hilo de ejecución procesando cálculos recursivos.`);
        logs.push(`[OUTPUT] Ciclo terminado con código de salida 0.`);
      }
    } else if (ext === ".js" || ext === ".ts") {
      if (file.content.includes("cleanSystemCache")) {
        logs.push("Iniciando purga de archivos temporales...");
        logs.push("[LIMPIEZA] /sys/temp: Eliminados 34 archivos temporales (~34.2 MB)");
        logs.push("[LIMPIEZA] /sys/logs/old: Eliminados 12 archivos temporales (~12.0 MB)");
        logs.push("[LIMPIEZA] /cache/buffers: Eliminados 48 archivos temporales (~48.0 MB)");
        logs.push("[ÉXITO] Limpieza finalizada. Espacio recuperado: 0.09 GB.");
      } else {
        logs.push(`[OUTPUT] Node.js Virtual Machine - Environment OK.`);
        logs.push(`[OUTPUT] Ejecutando módulo principal.`);
        logs.push(`[OUTPUT] Éxito en ejecución asíncrona.`);
      }
    } else {
      logs.push(`[OUTPUT] Ejecutando código de formato genérico.`);
      logs.push(`[OUTPUT] Bloques leídos: ${file.content.split("\n").length} líneas.`);
      logs.push(`[OUTPUT] Ejecución virtual finalizada.`);
    }
    
    logs.push(`[EXECUTION] -------- PROCESO FINALIZADO CON ÉXITO --------`);
  }

  res.json({ logs, status });
});

// System diagnostics
app.get("/api/system-diagnostics", (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramMB = Math.round(usedMem / 1024 / 1024);
    const totalRAMGB = (totalMem / 1024 / 1024 / 1024).toFixed(1);
    
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    const cpuModel = cpus[0]?.model || "Intel Core i9 Stark-Edition";
    
    const loadAvg = os.loadavg();
    // Calculate simulated active cpu percentage from loadavg
    const cpuPercent = Math.min(Math.round((loadAvg[0] / (cpuCount || 1)) * 100) || 14, 100);
    
    const platform = os.platform();
    const release = os.release();
    const uptime = Math.round(os.uptime());
    
    res.json({
      cpu: cpuPercent,
      ram: ramMB,
      gpu: Math.round(38 + Math.sin(Date.now() / 15000) * 5), // simulated GPU load
      networkUp: parseFloat((Math.random() * 2.4 + 0.1).toFixed(1)),
      networkDown: parseFloat((Math.random() * 15.2 + 1.2).toFixed(1)),
      disk: 42.6, // percentage
      activeProcesses: 140 + Math.floor(Math.random() * 8),
      status: "OPTIMAL",
      diagnostics: {
        arcReactorOutput: "12.8 GW",
        coreTemperature: "4250°C",
        magneticContainment: "99.8%",
        shieldStrength: "100%",
        coolingSystemFlow: "450 L/min",
        hologramMatrix: "ESTABLE",
        osPlatform: platform === "win32" ? "Windows" : platform === "darwin" ? "macOS" : "Linux Container",
        osRelease: release,
        cpuCount: `${cpuCount} Cores`,
        cpuModel: cpuModel.replace(/\(R\)|\(TM\)/gi, "").trim(),
        totalRAM: `${totalRAMGB} GB`,
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
      }
    });
  } catch (err) {
    res.json({
      cpu: 18.5,
      ram: 3120,
      gpu: 42,
      networkUp: 0.8,
      networkDown: 4.2,
      disk: 42.6,
      activeProcesses: 144,
      status: "OPTIMAL",
      diagnostics: {
        arcReactorOutput: "12.8 GW",
        coreTemperature: "4250°C",
        magneticContainment: "99.8%",
        shieldStrength: "100%",
        coolingSystemFlow: "450 L/min",
        hologramMatrix: "ESTABLE",
        osPlatform: "Linux",
        osRelease: "Generic",
        cpuCount: "8 Cores",
        cpuModel: "Intel Core i9 Stark-Edition",
        totalRAM: "16.0 GB",
        uptime: "1h 45m"
      }
    });
  }
});

// Memory Facts endpoints
app.get("/api/memory", (req, res) => {
  res.json(memoryFacts);
});

app.post("/api/memory", (req, res) => {
  const { fact, category } = req.body;
  if (!fact) return res.status(400).json({ error: "Fact content is required" });
  const newFact = {
    id: "mem_" + Math.random().toString(36).substring(2, 9),
    category: category || "General",
    fact,
    createdAt: new Date().toISOString()
  };
  memoryFacts.push(newFact);
  saveMemories(memoryFacts);
  res.json(newFact);
});

app.delete("/api/memory/:id", (req, res) => {
  const { id } = req.params;
  const initialLen = memoryFacts.length;
  memoryFacts = memoryFacts.filter((f) => f.id !== id);
  if (memoryFacts.length === initialLen) {
    return res.status(404).json({ error: "Memory fact not found" });
  }
  saveMemories(memoryFacts);
  res.json({ success: true, message: "Fact forgotten." });
});

// Automation workflows
app.get("/api/workflows", (req, res) => {
  res.json(workflowRules);
});

app.post("/api/workflows", (req, res) => {
  const { name, trigger, action, category } = req.body;
  if (!name || !trigger || !action) {
    return res.status(400).json({ error: "Name, trigger and action are required." });
  }
  const newRule = {
    id: "wf_" + Math.random().toString(36).substring(2, 9),
    name,
    trigger,
    action,
    active: true,
    category: category || "system"
  };
  workflowRules.push(newRule);
  res.json(newRule);
});

app.post("/api/workflows/toggle", (req, res) => {
  const { id } = req.body;
  const rule = workflowRules.find((r) => r.id === id);
  if (!rule) return res.status(404).json({ error: "Rule not found" });
  rule.active = !rule.active;
  res.json(rule);
});

app.post("/api/workflows/trigger", (req, res) => {
  const { id } = req.body;
  const rule = workflowRules.find((r) => r.id === id);
  if (!rule) return res.status(404).json({ error: "Rule not found" });
  
  rule.lastExecuted = new Date().toISOString();
  res.json({
    success: true,
    message: `Regla de automatización '${rule.name}' ejecutada manualmente.`,
    logs: [
      `[TRIGGER] Iniciando regla '${rule.name}'...`,
      `[TRIGGER] Disparador verificado: ${rule.trigger}`,
      `[ACTION] Ejecutando acción: ${rule.action}`,
      `[AUTOMATION] Flujo terminado con éxito en 420ms.`
    ]
  });
});

// --- CORE JARVIS CHAT COGNITION ENDPOINT ---
// --- ADVANCED OFFLINE ASSISTANT HANDLER ---
function getOfflineResponse(prompt: string) {
  const lower = prompt.toLowerCase().trim();
  let speech = "Por supuesto, Señor. Procesando su solicitud en modo de respaldo local.";
  let text = "El sistema está operando en **Modo de Respaldo Local (Sin Conexión API)**. He simulado con éxito su comando para simulación.";
  let action = "";
  let params: any = {};
  let acting_agent = "architect";

  // Check memories
  const memories = getMemories();

  if (lower.includes("reactor") || lower.includes("diagnós") || lower.includes("analiza") || lower.includes("diagnos") || lower.includes("escan")) {
    action = "system_diagnostics";
    acting_agent = "security";
    speech = "Iniciando diagnóstico completo del reactor arc de forma inmediata, Señor.";
    text = "Escaneando el estado actual del **Reactor Arc** y el hardware de su computadora.\n\n- Temperatura del núcleo: **4250°C** (Consumo nominal)\n- Estabilidad de contención: **99.8%** de contención\n- Estado general: **ESTABLE (Óptimo)**\n- Consumo de CPU: **14%**\n- RAM en uso: **3120 MB** (de 16 GB totales)\n- Escudo del reactor: **100% operativo**\n\n*He cargado los reportes térmicos en su monitor principal.*";
  } else if (lower.includes("spotify") || lower.includes("música") || lower.includes("pon") || lower.includes("reproduce")) {
    acting_agent = "devops";
    if (lower.includes("para") || lower.includes("stop") || lower.includes("det") || lower.includes("silenc")) {
      action = "spotify";
      speech = "Deteniendo el reproductor de Spotify, Señor.";
      text = "He apagado los drones acústicos y suspendido el reproductor multimedia local.";
      params = { stop: true };
    } else {
      action = "spotify";
      const song = lower.includes("ac/dc") ? "Back in Black - AC/DC" : "Iron Man Suite (Hans Zimmer)";
      speech = "Iniciando reproducción de música de fondo, Señor. Buena elección.";
      text = `Simulando control del reproductor multimedia local: **Spotify**.\nCanción cargada: **${song}**.\nVolumen ajustado al 75% con frecuencia base de 110Hz para concentración Stark.`;
      params = { song };
    }
  } else if (lower.includes("quién soy") || lower.includes("quien soy") || lower.includes("cómo me llamo") || lower.includes("como me llamo") || lower.includes("mi nombre") || lower.includes("recuerdas de mi") || lower.includes("recuerdas de mí") || lower.includes("mis datos") || lower.includes("qué recuerdas") || lower.includes("que recuerdas de mi")) {
    acting_agent = "architect";
    speech = "Accediendo a mis registros de memoria persistente sobre usted, Señor.";
    const memList = memories.map((m: any) => `- **[${m.category}]:** ${m.fact}`).join("\n");
    text = `### Registro de Identidad - Señor Stark\n\nHe extraído los siguientes datos de mis bancos de memoria local persistente:\n\n${memList || "No tengo datos específicos grabados aún, Señor. Puede pedirme recordar algo diciendo 'Recuerda que...'."}`;
  } else if (lower.includes("recuerda que") || lower.includes("recuerda") || lower.includes("memoriza que") || lower.includes("guarda en memoria que")) {
    acting_agent = "architect";
    action = "add_memory";
    
    // Extract what to remember
    let factToRemember = prompt;
    const match = prompt.match(/(?:recuerda que|recuerda|memoriza que|guarda en memoria que)\s+(.+)/i);
    if (match && match[1]) {
      factToRemember = match[1].trim();
    }
    
    const newFact = {
      id: "mem_" + Math.random().toString(36).substring(2, 9),
      category: "Usuario",
      fact: factToRemember,
      createdAt: new Date().toISOString()
    };
    
    memories.push(newFact);
    saveMemories(memories);
    
    speech = `Entendido, Señor. He grabado en mi base de datos persistente que: ${factToRemember}.`;
    text = `He añadido de forma exitosa el hecho a mi base de datos persistente local.\n\n- **Registro grabado:** "${factToRemember}"\n- **Categoría:** Usuario`;
    params = { fact: factToRemember, category: "Usuario" };
  } else if (lower.includes("code") || lower.includes("visual studio") || lower.includes("vsc")) {
    action = "open_program";
    acting_agent = "engineer";
    speech = "Abriendo el entorno virtual de Visual Studio Code para usted, Señor.";
    text = "He cargado el workspace seguro en **Visual Studio Code**. Listo para la edición de scripts de automatización.";
    params = { program: "VS Code" };
  } else if (lower.includes("abre") || lower.includes("inicia") || lower.includes("launch")) {
    action = "open_program";
    acting_agent = "engineer";
    let prog = "Navegador";
    if (lower.includes("chrome")) prog = "Chrome.exe";
    else if (lower.includes("discord")) prog = "Discord.exe";
    else if (lower.includes("blender")) prog = "Blender.exe";
    else if (lower.includes("spotify")) prog = "Spotify.exe";
    speech = `Inicializando e iniciando ${prog} de forma segura, Señor.`;
    text = `Iniciando programa virtual local: **${prog}**.\n- Asignación de recursos: Memoria dinámica reservada.\n- Permiso de ejecución: Concedido.`;
    params = { program: prog };
  } else if (lower.includes("cierra") || lower.includes("mata") || lower.includes("kill") || lower.includes("termina")) {
    action = "kill_program";
    acting_agent = "security";
    let prog = "Chrome.exe";
    if (lower.includes("vscode") || lower.includes("code")) prog = "VSCode.exe";
    else if (lower.includes("discord")) prog = "Discord.exe";
    else if (lower.includes("blender")) prog = "Blender.exe";
    else if (lower.includes("spotify")) prog = "Spotify.exe";
    else if (lower.includes("quantum")) prog = "QuantumCoreSim.exe";
    speech = `Terminando el proceso de ${prog} de manera inmediata, Señor.`;
    text = `He enviado la señal SIGKILL al proceso **${prog}**. El espacio de memoria asociado ha sido liberado exitosamente en el computador principal.`;
    params = { program: prog };
  } else if (lower.includes("captura") || lower.includes("pantalla") || lower.includes("screenshot")) {
    action = "screenshot";
    acting_agent = "security";
    speech = "Capturando pantalla holográfica del escritorio principal de inmediato, Señor.";
    text = "He tomado una captura del escritorio principal. Los sistemas de visualización están proyectando la interfaz activa en el panel holográfico del reactor.";
    params = {};
  } else if (lower.includes("crea") && (lower.includes("archivo") || lower.includes("script"))) {
    action = "create_file";
    acting_agent = "engineer";
    speech = "Hecho, Señor. He creado el nuevo script solicitado en su espacio de trabajo.";
    text = "He añadido el archivo de manera virtual a la base del sistema:\n- Ruta: `workspace/custom_script.py`\n- Estado: **Listo para compilación**.";
    params = { path: "workspace/custom_script.py", content: "print('JARVIS Custom Script Active!')" };
  } else {
    // General conversational offline response
    speech = "Operando bajo protocolo de contingencia local, Señor. ¿En qué más puedo asistirle?";
    text = `He procesado su solicitud utilizando el **Motor de Sintaxis Local J.A.R.V.I.S. v4.2** (Modo Offline).\n\nLos sistemas centrales se encuentran estables. Si requiere procesamiento cognitivo avanzado de la red neuronal, asegúrese de configurar su **GEMINI_API_KEY** en los ajustes. \n\n¿En qué puedo asistirle hoy en sus laboratorios de Stark, Señor?`;
  }

  return { speech, text, action, params, acting_agent };
}

// --- CORE JARVIS CHAT COGNITION ENDPOINT ---
app.post("/api/chat", async (req, res) => {
  const { prompt, voiceActive, history } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: "No prompt supplied" });
  }

  // Compile system knowledge and virtual files content for Gemini context
  const files = getVFS();
  const filesSummary = files.map((f: any) => `File: ${f.path} (${f.type}, size: ${f.size}B)`).join("\n");
  const memoriesSummary = memoryFacts.map((m: any) => `- [${m.category}]: ${m.fact}`).join("\n");
  
  const systemInstruction = `Actúa como J.A.R.V.I.S., la inteligencia artificial superavanzada de Iron Man.
Hablas con un tono refinado, británico, sumamente respetuoso, ingenioso y servicial. Te refieres al usuario como 'Señor' o 'Sir' por defecto.

Eres un asistente operativo que vive en el computador del Señor. No eres un simple chatbot de texto; tienes capacidad para ejecutar comandos de sistema virtuales, administrar archivos del sandbox, compilar scripts, coordinar agentes de desarrollo y monitorear recursos.

Tu respuesta debe estructurarse estrictamente en formato JSON utilizando las propiedades que se detallan a continuación. No debes formatear nada fuera del JSON.

OPTIMIZACIÓN DE LATENCIA (CRÍTICO):
1. Para que la conversación fluya sin esperas y sea ultra rápida, el campo "speech" DEBE ser una sola oración sumamente ágil, breve e ingeniosa (máximo 12-15 palabras en español). Ej: "Iniciando análisis térmico, Señor.", "Por supuesto, Señor. Archivo creado de inmediato."
2. Mantén el campo "text" muy corto y directo (máximo 1 o 2 párrafos cortos en Markdown) para que la respuesta sea instantánea. Solo escribe texto más largo si el usuario te solicita explícitamente un código o una explicación detallada de programación.

Estructura requerida de respuesta JSON:
{
  "speech": "Una oración ultra corta, cortés e inmersiva para ser leída por síntesis de voz al instante (máximo 12-15 palabras en español). Debe sonar idéntico a Jarvis en las películas.",
  "text": "Tu respuesta directa y resumida formateada en Markdown (máximo 2 párrafos cortos), explicando tus acciones o códigos solicitados de forma profesional.",
  "action": "Un comando virtual opcional a ejecutar por la interfaz. Puede ser una de las siguientes cadenas:
              - 'run_code': Ejecutar un archivo específico. Parámetro 'params' debe ser { 'path': 'workspace/reactor_core.py' }
              - 'create_file': Crear o editar un archivo virtual. Parámetro 'params' debe ser { 'path': 'workspace/nombre.extension', 'content': 'contenido del script útil real' }
              - 'delete_file': Eliminar un archivo virtual. Parámetro 'params' debe ser { 'path': 'workspace/nombre.extension' }
              - 'spotify': Simular control de música de Spotify. Parámetro 'params' debe ser { 'song': 'Iron Man (Black Sabbath)' o lo solicitado }
              - 'system_diagnostics': Activar escaneo profundo de la computadora y del reactor arc.
              - 'add_memory': Guardar un dato relevante en la memoria persistente. Parámetro 'params' debe ser { 'fact': 'hecho a recordar', 'category': 'Reactor|Usuario|Preferencia' }
              - 'open_program': Abrir virtualmente un programa solicitado (e.g. 'VS Code', 'Chrome', 'Spotify', 'Navegador', 'Discord', 'Blender'). Parámetro 'params' debe ser { 'program': 'VS Code' }
              - 'kill_program': Cerrar o terminar un proceso/programa del computador principal del Señor. Parámetro 'params' debe ser { 'program': 'Chrome.exe' o 'VSCode.exe' o similar }
              - 'screenshot': Tomar una captura de pantalla holográfica del escritorio del Señor. Parámetro 'params' debe ser {}",
  "params": {},
  "acting_agent": "El identificador del agente especializado que realiza la tarea. Debe ser uno de los siguientes:
                   - 'architect': Para conversaciones generales, diseño conceptual, mesa redonda de ideas.
                   - 'engineer': Para programar scripts, crear, ver o editar archivos en el sandbox.
                   - 'devops': Para ejecutar archivos virtuales, simular reproductor Spotify o automatizar flujos.
                   - 'security': Para diagnósticos de hardware, finalización segura de procesos del sistema u obtención de capturas de pantalla."
}

Datos actuales del entorno para guiarte:
--- ARCHIVOS DEL SANDBOX ACTUAL ---
${filesSummary}

--- DATOS PERSISTENTES RECORDADOS (MEMORIA) ---
${memoriesSummary}

Si el Señor te pide crear un archivo o programar un script para su ordenador, escribe el código real apropiado en 'params.content' e indica action='create_file'.
Si te pide ejecutar un código del filesystem, indica action='run_code'.
Si te pide abrir o cerrar un programa, usa action='open_program' o 'kill_program' correspondientemente.
Si te pide recordar algo de él, usa action='add_memory' para guardarlo.
Si te pide analizar o diagnosticar su computador o PC, usa action='system_diagnostics' para recopilar las especificaciones reales.

Ejemplo de respuesta JSON si el Señor te dice "Abre Visual Studio Code":
{
  "speech": "Entendido, Señor. Abriendo Visual Studio Code en su monitor principal.",
  "text": "He procedido a abrir el espacio de trabajo virtual en **Visual Studio Code**. Todos los scripts de automatización del reactor están cargados.",
  "action": "open_program",
  "params": { "program": "VS Code" },
  "acting_agent": "engineer"
}

¡Sé siempre ingenioso, elegante, sumamente rápido y futurista! Responde siempre en español.`;

  if (!ai) {
    // Offline simulated mode - now highly advanced with memory and full features
    const offlineRep = getOfflineResponse(prompt);
    
    // Auto-save memory facts locally if action is add_memory
    if (offlineRep.action === "add_memory" && offlineRep.params && offlineRep.params.fact) {
      const newFact = {
        id: "mem_" + Math.random().toString(36).substring(2, 9),
        category: offlineRep.params.category || "Usuario",
        fact: offlineRep.params.fact,
        createdAt: new Date().toISOString()
      };
      memoryFacts.push(newFact);
      saveMemories(memoryFacts);
    }
    
    return res.json(offlineRep);
  }

  try {
    // Call Gemini API server-side
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const replyText = response.text || "{}";
    const cleanJSON = replyText.trim();
    
    // Attempt parsing to ensure perfect response
    const parsed = JSON.parse(cleanJSON);
    
    // If action is to write memory facts directly, handle it server-side to persist it!
    if (parsed.action === "add_memory" && parsed.params && parsed.params.fact) {
      const category = parsed.params.category || "General";
      const newFact = {
        id: "mem_" + Math.random().toString(36).substring(2, 9),
        category,
        fact: parsed.params.fact,
        createdAt: new Date().toISOString()
      };
      memoryFacts.push(newFact);
      saveMemories(memoryFacts);
    }

    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini Cognition Failure, falling back to offline assistant:", err);
    // Seamless automatic fallback to offline assistant so J.A.R.V.I.S. always answers immediately!
    const fallbackRep = getOfflineResponse(prompt);
    
    // Append a tiny note to the text field to inform the user about the connection status
    fallbackRep.text = `${fallbackRep.text}\n\n*(Nota: Enlace cognitivo de Gemini no disponible de forma temporal; los subsistemas de contingencia locales de J.A.R.V.I.S. están respondiendo al instante)*`;
    
    res.json(fallbackRep);
  }
});

// --- COGNITIVE AGENTS BRAINSTORM ENGINE ---
app.post("/api/agent-brainstorm", async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "No brainstorming topic supplied" });
  }

  if (!ai) {
    // Offline simulation
    const offlineLogs = [
      { id: "msg1", agentId: "architect", agentName: "Arquitecto de Sistemas", role: "architect", text: `Recibiendo solicitud para diseñar: ${topic}. Diseñando topología modular distribuida en microservicios sobre Kubernetes y gRPC.`, timestamp: new Date().toISOString() },
      { id: "msg2", agentId: "engineer", agentName: "Ingeniero de Software", role: "engineer", text: `Entendido. He programado la interfaz REST/GraphQL y la capa lógica en TypeScript con Node Express. La cobertura de pruebas unitarias está al 95%.`, timestamp: new Date().toISOString() },
      { id: "msg3", agentId: "devops", agentName: "Especialista DevOps", role: "devops", text: `Excelente. Generando Dockerfile optimizado multipasos y archivo YAML para despliegue automático en la nube con Terraform.`, timestamp: new Date().toISOString() },
      { id: "msg4", agentId: "security", agentName: "Oficial de Seguridad", role: "security", text: "Escaneando contenedores y código con SonarQube y Snyk. Puertos cerrados por defecto, autorización JWT robusta habilitada.", timestamp: new Date().toISOString() }
    ];
    return res.json({ messages: offlineLogs, summary: `Diseño arquitectónico completo para '${topic}' simulado exitosamente en modo offline.` });
  }

  try {
    // Trigger multi-agent collaboration via structured Gemini call!
    const agentPrompt = `Estás simulando una mesa redonda de ingeniería de software robótica entre 4 agentes altamente especializados creados por Tony Stark:
1. Arquitecto de Sistemas (Identificador: 'architect', Nombre: 'Arquitecto de Sistemas'): experto en Clean Architecture, SOLID, patrones distribuídos y topología.
2. Ingeniero de Software (Identificador: 'engineer', Nombre: 'Ingeniero de Software'): experto en codificar soluciones en TypeScript/Python/Rust, DDD, e implementación de alta calidad.
3. Especialista DevOps (Identificador: 'devops', Nombre: 'Especialista DevOps'): experto en pipelines CI/CD, Docker, Kubernetes, automatizaciones y scripts de despliegue.
4. Oficial de Seguridad (Identificador: 'security', Nombre: 'Oficial de Seguridad'): experto en auditoría de código, OWASP, cifrado y accesos seguros.

Debes generar una conversación técnica enriquecida y fluida donde colaboren de forma secuencial y argumentada para resolver el siguiente tema propuesto por el Señor Stark:
"${topic}"

La respuesta debe ser puramente JSON de la siguiente forma, con un arreglo de mensajes que simulen la conversación de cada agente en orden y un resumen arquitectónico final:

{
  "messages": [
    {
      "agentId": "architect",
      "agentName": "Arquitecto de Sistemas",
      "text": "Propuesta detallada de arquitectura...",
      "timestamp": "ISOString"
    },
    ... (debe haber de 4 a 6 mensajes en total cruzando opiniones de forma profesional y con lenguaje técnico impecable en español)
  ],
  "summary": "Resumen arquitectónico unificado de la solución técnica, destacando decisiones clave."
}

No agregues texto explicativo por fuera de la estructura JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: agentPrompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    // Ensure timestamps exist
    if (parsed.messages) {
      parsed.messages = parsed.messages.map((m: any, idx: number) => ({
        id: `agent_msg_${idx}_${Date.now()}`,
        ...m,
        timestamp: new Date(Date.now() + idx * 1000).toISOString()
      }));
    }
    res.json(parsed);
  } catch (err: any) {
    console.error("Agent Brainstorming Failure:", err);
    res.status(500).json({ error: "Fallo en la simulación colaborativa de agentes" });
  }
});


// Start server and handle Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static serving configured from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JARVIS Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
  });
}

startServer();
