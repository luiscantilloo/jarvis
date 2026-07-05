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
  gpu?: number;
  networkUp: number;
  networkDown: number;
  disk: number;
  activeProcesses: number;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
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
  lastExecuted?: string;
  category: 'file' | 'system' | 'code' | 'time';
}

export interface MemoryFact {
  id: string;
  category: string;
  fact: string;
  createdAt: string;
}
