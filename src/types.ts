export interface Profile {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OpenclawConfig {
  models?: {
    providers?: Record<string, ProviderConfig>
  }
  agents?: {
    defaults?: {
      model?: { primary?: string; fallbacks?: string[] }
      workspace?: string
      heartbeat?: { every?: string; target?: string }
    }
  }
  gateway?: {
    bind?: string
    port?: number
    tailscale?: { mode?: string }
    auth?: { mode?: string }
  }
  channels?: {
    telegram?: ChannelConfig
    discord?: ChannelConfig
    whatsapp?: ChannelConfig
    slack?: ChannelConfig & { appToken?: string }
  }
}

export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
}

export interface ChannelConfig {
  enabled?: boolean
  botToken?: string
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled"
  allowFrom?: string[]
}
