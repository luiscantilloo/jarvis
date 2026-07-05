export interface VirtualFile {
  path: string;
  name: string;
  content: string;
  type: 'file' | 'directory';
  size: number;
  updatedAt: string;
}

export interface SystemMetrics {
  cpu: number;
  ram: number;
  ramTotal?: number;
  ramPercent?: number;
  gpu?: number;
  networkUp: number;
  networkDown: number;
  disk: number;
  diskUsedGB?: string;
  diskTotalGB?: string;
  activeProcesses: number;
  loadAvg?: string[];
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  ollamaAvailable?: boolean;
  diagnostics?: Record<string, string>;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: 'IDLE' | 'THINKING' | 'WORKING' | 'OFFLINE';
  color: string;
  description: string;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  agentName: string;
  role: string;
  text: string;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'system' | 'code';
  timestamp: string;
}

export interface WorkflowRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
  lastExecuted?: string | null;
  category: 'file' | 'system' | 'code' | 'time';
}

export interface MemoryFact {
  id: string;
  category: string;
  fact: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatReply {
  speech: string;
  text: string;
  action?: string;
  params?: Record<string, any>;
  acting_agent?: string;
  aiSource?: 'gemini' | 'ollama' | 'offline';
}

export interface RealProcess {
  pid: number;
  name: string;
  cpu: number;
  ram: number;
  active: boolean;
}

export interface FileBrowseEntry {
  name: string;
  type: 'file' | 'directory';
  size: number;
  path: string;
}

export interface FileBrowseResult {
  path: string;
  parent: string;
  items: FileBrowseEntry[];
}

export interface NetworkInterface {
  name: string;
  address: string;
  internal: boolean;
  mac: string;
}

export interface WsMetricsMessage {
  type: 'metrics';
  cpu: number;
  ram: number;
  ramTotal: number;
  ramPercent: number;
  loadAvg: string[];
  timestamp: number;
}
