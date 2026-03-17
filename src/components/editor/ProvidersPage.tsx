import { useState } from "react"
import { Search, ChevronRight, Plus } from "lucide-react"
import { Input } from "../ui/input"
import type { OpenclawConfig } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
  onSelectProvider?: (providerName: string) => void
}

interface Provider {
  name: string
  key: string
  modelCount: number
}

// Predefined list of common AI providers
const PROVIDERS: Provider[] = [
  { name: "OpenAI", key: "openai", modelCount: 0 },
  { name: "Anthropic", key: "anthropic", modelCount: 0 },
  { name: "Google Gemini", key: "google", modelCount: 0 },
  { name: "DeepSeek", key: "deepseek", modelCount: 0 },
  { name: "xAI (Grok)", key: "xai", modelCount: 0 },
  { name: "Mistral", key: "mistral", modelCount: 0 },
  { name: "Z.AI (GLM)", key: "zai", modelCount: 0 },
  { name: "Moonshot (Kimi)", key: "moonshot", modelCount: 0 },
  { name: "Ollama", key: "ollama", modelCount: 0 },
  { name: "OpenRouter", key: "openrouter", modelCount: 0 },
]

function isProviderConnected(config: Partial<OpenclawConfig>, providerKey: string): boolean {
  const apiKey = config.models?.providers?.[providerKey]?.apiKey
  return Boolean(apiKey && apiKey.trim().length > 0)
}

function getProviderModelCount(config: Partial<OpenclawConfig>, providerKey: string): number {
  return config.models?.providers?.[providerKey]?.models?.length ?? 0
}

export default function ProvidersPage({
  config,
  onChange: _onChange, // Will be used for future operations like adding custom providers
  onSelectProvider,
}: Props) {
  const [activeTab, setActiveTab] = useState<"connected" | "available">("connected")
  const [searchQuery, setSearchQuery] = useState("")

  // Enrich providers with current config state
  const providersWithState = PROVIDERS.map(provider => ({
    ...provider,
    isConnected: isProviderConnected(config, provider.key),
    modelCount: getProviderModelCount(config, provider.key),
  }))

  // Filter by connected status
  const filteredByStatus =
    activeTab === "connected"
      ? providersWithState.filter(p => p.isConnected)
      : providersWithState.filter(p => !p.isConnected)

  // Filter by search query
  const filteredProviders = filteredByStatus.filter(provider =>
    provider.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const connectedCount = providersWithState.filter(p => p.isConnected).length
  const availableCount = providersWithState.filter(p => !p.isConnected).length

  function handleProviderClick(providerKey: string) {
    if (onSelectProvider) {
      onSelectProvider(providerKey)
    } else {
      console.log("Selected provider:", providerKey)
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">AI 模型提供商</h2>
        <p className="text-sm text-muted-foreground">
          管理和配置 AI 模型提供商
        </p>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("connected")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "connected"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Connected ({connectedCount})
        </button>
        <button
          onClick={() => setActiveTab("available")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "available"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Available ({availableCount})
        </button>
      </div>

      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search providers..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Providers list */}
      <div className="space-y-2">
        {filteredProviders.length > 0 ? (
          filteredProviders.map(provider => (
            <button
              key={provider.key}
              onClick={() => handleProviderClick(provider.key)}
              className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Provider icon placeholder */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-sm font-semibold text-blue-700">
                    {provider.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{provider.name}</p>
                    <p className="text-xs text-gray-500">
                      {provider.modelCount} model{provider.modelCount !== 1 ? "s" : ""} configured
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      provider.isConnected
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {provider.isConnected ? "Connected" : "Not Connected"}
                  </span>

                  {/* Chevron icon */}
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">
              {searchQuery
                ? "No providers found matching your search"
                : `No ${activeTab} providers`}
            </p>
          </div>
        )}
      </div>

      {/* Add provider button */}
      <button className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-4 text-sm text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600">
        <Plus size={16} />
        <span>+ Add Custom Provider</span>
      </button>
    </div>
  )
}
