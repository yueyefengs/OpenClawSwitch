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

export interface FeishuAccountConfig {
  appId?: string
  appSecret?: string
  botName?: string
  enabled?: boolean
}

export interface FeishuChannelConfig {
  enabled?: boolean
  domain?: "feishu" | "lark"
  defaultAccount?: string
  accounts?: Record<string, FeishuAccountConfig>
  // Global settings
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled"
  allowFrom?: string[] // open_id list
  groupPolicy?: "open" | "allowlist" | "disabled"
  groupAllowFrom?: string[] // group_id list
  // Quota optimization
  typingIndicator?: boolean
  resolveSenderNames?: boolean
  // Streaming
  streaming?: boolean
  blockStreaming?: boolean
}

export interface DiscordAccountConfig {
  token: string
  enabled?: boolean
}

export interface DiscordChannelConfig {
  enabled?: boolean
  accounts?: Record<string, DiscordAccountConfig>
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled"
  allowFrom?: string[]
  groupPolicy?: "open" | "allowlist" | "disabled"
  allowFromGuilds?: string[]
}

export interface DingdingChannelConfig {
  enabled?: boolean
  clientId?: string
  clientSecret?: string
  robotCode?: string
  corpId?: string
  agentId?: string
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled"
  allowFrom?: string[]
  groupPolicy?: "open" | "allowlist" | "disabled"
  groupAllowFrom?: string[]
  requireMention?: boolean
  messageType?: "markdown" | "card"
  cardTemplateId?: string
  cardTemplateKey?: string
}

export interface WecomChannelConfig {
  enabled?: boolean
  corpId?: string
  agentId?: string
  secret?: string
  token?: string
  encodingAESKey?: string
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled"
  allowFrom?: string[]
  groupPolicy?: "open" | "allowlist" | "disabled"
  groupAllowFrom?: string[]
  requireMention?: boolean
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

export interface McpServer {
  id: string
  name: string
  config: McpServerConfig
}

export interface McpServerConfig {
  command?: string
  args?: string[]
  env?: Record<string, string>
}

export interface Skill {
  id: string
  name: string
  source_url?: string
  install_path?: string
  installed_at?: string
}

export interface ClawhubSkill {
  slug: string
  displayName: string
  summary: string
  version: string
  stars: number
  downloads: number
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
    feishu?: FeishuChannelConfig
    discord?: DiscordChannelConfig
    dingding?: DingdingChannelConfig
    wecom?: WecomChannelConfig
  }
  bindings?: BindingConfig[]
}
