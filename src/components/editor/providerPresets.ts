export interface ProviderPreset {
  key: string
  label: string
  api: string
  baseUrl?: string
  models: Array<{ id: string; name: string }>
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    key: "anthropic",
    label: "Anthropic (Claude)",
    api: "anthropic-messages",
    models: [
      { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5" },
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
      { id: "claude-opus-4", name: "Claude Opus 4" },
    ],
  },
  {
    key: "openai",
    label: "OpenAI (GPT)",
    api: "openai-responses",
    models: [
      { id: "gpt-5.4", name: "GPT-5.4" },
      { id: "gpt-5.4-pro", name: "GPT-5.4 Pro" },
      { id: "gpt-5.2", name: "GPT-5.2" },
      { id: "gpt-5-mini", name: "GPT-5 Mini" },
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    ],
  },
  {
    key: "google",
    label: "Google (Gemini)",
    api: "google-generative-ai",
    models: [
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
      { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite Preview" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    ],
  },
  {
    key: "zai",
    label: "Z.AI (GLM)",
    api: "openai-completions",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: [
      { id: "glm-5", name: "GLM-5" },
      { id: "glm-4.7", name: "GLM-4.7" },
      { id: "glm-4.7-flash", name: "GLM-4.7 Flash" },
      { id: "glm-4.7-flashx", name: "GLM-4.7 FlashX" },
      { id: "glm-4.6v", name: "GLM-4.6V (Vision)" },
      { id: "glm-z1-flash", name: "GLM-Z1 Flash" },
    ],
  },
  {
    key: "deepseek",
    label: "DeepSeek",
    api: "openai-completions",
    baseUrl: "https://api.deepseek.com/v1",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat (V3)" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner (R1)" },
      { id: "deepseek-coder", name: "DeepSeek Coder" },
      { id: "deepseek-v3", name: "DeepSeek V3" },
    ],
  },
  {
    key: "moonshot",
    label: "Moonshot (Kimi)",
    api: "openai-completions",
    baseUrl: "https://api.moonshot.ai/v1",
    models: [
      { id: "kimi-k2.5", name: "Kimi K2.5" },
      { id: "moonshot-v1-8k", name: "Moonshot V1 8K" },
      { id: "moonshot-v1-32k", name: "Moonshot V1 32K" },
      { id: "moonshot-v1-128k", name: "Moonshot V1 128K" },
    ],
  },
  {
    key: "shisha",
    label: "时砂 (Shisha)",
    api: "openai-responses",
    baseUrl: "https://api.shishaapi.com/v1",
    models: [
      { id: "gpt-5.4-codex", name: "GPT-5.4-Codex" },
      { id: "gpt-5.3-codex", name: "GPT-5.3-Codex" },
      { id: "gpt-5.2-codex", name: "GPT-5.2-Codex" },
    ],
  },
  {
    key: "openrouter",
    label: "OpenRouter",
    api: "openai-completions",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "auto", name: "Auto (best available)" },
    ],
  },
  {
    key: "ollama",
    label: "Ollama (本地)",
    api: "openai-completions",
    baseUrl: "http://localhost:11434/v1",
    models: [
      { id: "llama3.3", name: "Llama 3.3" },
      { id: "qwen2.5-coder", name: "Qwen2.5 Coder" },
      { id: "deepseek-r1", name: "DeepSeek R1" },
      { id: "gemma3", name: "Gemma 3" },
    ],
  },
  {
    key: "xai",
    label: "xAI (Grok)",
    api: "openai-completions",
    models: [],
  },
  {
    key: "mistral",
    label: "Mistral",
    api: "openai-completions",
    models: [],
  },
  {
    key: "custom",
    label: "自定义",
    api: "openai-completions",
    models: [],
  },
]

export const PRESET_MAP = Object.fromEntries(PROVIDER_PRESETS.map(p => [p.key, p]))
