export type AppMode = 'agent' | 'hub'

export interface MetaResponse {
  mode: AppMode
  version: string
}

export interface ProcessInfo {
  user: string
  pid: number
  cpuUsage: number
  memoryUsage: number
  command: string
}

export interface ServiceInfo {
  serviceName: string
  status: string
  description: string
}

export interface ContainerInfo {
  id: string
  name: string
  image: string
  status: string
  health: string
  restartCount: number
  composeProject: string
  composeService: string
  ports: string[]
}

export interface DiskUsageInfo {
  mount: string
  filesystem: string
  totalBytes: number
  usedBytes: number
  usePercent: number
}

export interface NetworkUsageInfo {
  name: string
  bytesReceived: number
  bytesSent: number
}

export interface MetricsPayload {
  cpuLoad: number
  usedMemory: number
  totalMemory: number
  processInfos: ProcessInfo[]
  serviceInfos: ServiceInfo[]
  containers: ContainerInfo[]
  diskUsage: DiskUsageInfo[]
  networkUsage: NetworkUsageInfo[]
  availableProcessors: number
  systemLoadAverage: number
}

export interface MetricsSnapshot {
  collectedAt: string
  payload: MetricsPayload
}

export interface AgentSummary {
  agentId: string
  hostname: string
  lastSeen: string
  cpuLoad: number
  usedMemory: number
  totalMemory: number
  containerCount: number
}
