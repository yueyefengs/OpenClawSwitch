export interface Profile {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProviderModel {
  id: string
  label?: string
  name?: string
  contextWindow?: number
  maxTokens?: number
  reasoning?: boolean
}

export interface ProviderConfig {
  api?: string
  apiKey?: string
  baseUrl?: string
  models?: ProviderModel[]
}

export interface TelegramAccountConfig {
  botToken?: string
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled"
  groupPolicy?: "pairing" | "allowlist" | "open" | "disabled"
  streaming?: boolean | "off" | "partial" | "block" | "progress"
  allowFrom?: number[]
}

export interface TelegramChannelConfig {
  enabled?: boolean
  proxy?: string
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled"
  groupPolicy?: "pairing" | "allowlist" | "open" | "disabled"
  streaming?: boolean | "off" | "partial" | "block" | "progress"
  allowFrom?: number[]
  accounts?: Record<string, TelegramAccountConfig>
}

export interface GatewayConfig {
  mode?: "local" | "remote"
  auth?: { token?: string }
  remote?: { token?: string }
}

export interface AgentConfig {
  id: string
  model?: string
  name?: string
  agentDir?: string
  workspace?: string
}

export interface AgentDefaults {
  model?: { primary?: string; fallbacks?: string[] }
  maxConcurrent?: number
  compaction?: { mode?: string }
  subagents?: { maxConcurrent?: number }
  workspace?: string
}

export interface BindingConfig {
  agentId: string
  match: {
    channel: string
    accountId: string
  }
}

export interface OpenclawConfig {
  models?: {
    mode?: string
    providers?: Record<string, ProviderConfig>
  }
  agents?: {
    defaults?: AgentDefaults
    list?: AgentConfig[]
  }
  gateway?: GatewayConfig
  channels?: {
    telegram?: TelegramChannelConfig
  }
  bindings?: BindingConfig[]
}
