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
  const [searchQuery, setSearchQuery] = useState("")

  // Enrich providers with current config state
  const providersWithState = PROVIDERS.map(provider => ({
    ...provider,
    isConnected: isProviderConnected(config, provider.key),
    modelCount: getProviderModelCount(config, provider.key),
  }))

  // Filter by search query
  const filteredProviders = providersWithState.filter(provider =>
    provider.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handleProviderClick(providerKey: string) {
    if (onSelectProvider) {
      onSelectProvider(providerKey)
    } else {
      console.log("Selected provider:", providerKey)
    }
  }

  function handleAddModel() {
    // TODO: Implement add model functionality
    console.log("Add model clicked")
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header section with title and add button */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">已连接大模型列表</h2>
            <p className="text-sm text-gray-600 mt-1">查看和管理已连接的 AI 模型提供商</p>
          </div>
          <button
            onClick={handleAddModel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            title="Add new model provider"
          >
            <Plus size={16} />
            <span>+ 添加模型</span>
          </button>
        </div>
      </div>

      {/* Search box */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search providers (name, model family)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Providers list */}
      <div className="flex-1 bg-white overflow-y-auto">
        <div className="divide-y divide-gray-200">
          {filteredProviders.length > 0 ? (
            filteredProviders.map(provider => (
              <button
                key={provider.key}
                onClick={() => handleProviderClick(provider.key)}
                className="w-full px-6 py-4 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Provider icon */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 flex-shrink-0">
                    {provider.name.charAt(0)}
                  </div>

                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{provider.name}</p>
                    <p className="text-xs text-gray-500">
                      {provider.modelCount} model{provider.modelCount !== 1 ? "s" : ""} configured
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${
                      provider.isConnected
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {provider.isConnected ? "已连接" : "未连接"}
                  </span>

                  {/* Chevron icon */}
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">
                {searchQuery
                  ? "未找到匹配的提供商"
                  : "暂无提供商"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
