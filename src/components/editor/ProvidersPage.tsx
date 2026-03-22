import { useState } from "react"
import { Search, ChevronRight, Plus } from "lucide-react"
import { Input } from "../ui/input"
import type { OpenclawConfig, ProviderConfig } from "../../types"
import { PRESET_MAP, PROVIDER_PRESETS } from "./providerPresets"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
  onSelectProvider?: (providerName: string) => void
}

interface ProviderListItem {
  label: string
  key: string
  modelCount: number
  configured: boolean
  connected: boolean
  isCustom?: boolean
}

const KNOWN_PROVIDERS = PROVIDER_PRESETS.filter(provider => provider.key !== "custom")
const KNOWN_PROVIDER_KEYS = new Set(KNOWN_PROVIDERS.map(provider => provider.key))

function isProviderConnected(provider?: ProviderConfig): boolean {
  const apiKey = provider?.apiKey
  return Boolean(apiKey && apiKey.trim().length > 0)
}

function getProviderModelCount(provider?: ProviderConfig): number {
  return provider?.models?.length ?? 0
}

function matchesSearch(provider: ProviderListItem, searchQuery: string): boolean {
  const keyword = searchQuery.trim().toLowerCase()
  if (!keyword) return true
  return (
    provider.label.toLowerCase().includes(keyword)
    || provider.key.toLowerCase().includes(keyword)
  )
}

export default function ProvidersPage({
  config,
  onChange,
  onSelectProvider,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const providers = config.models?.providers ?? {}

  const presetProviders: ProviderListItem[] = KNOWN_PROVIDERS.map(provider => {
    const configuredProvider = providers[provider.key]
    return {
      label: provider.label,
      key: provider.key,
      modelCount: getProviderModelCount(configuredProvider),
      configured: Boolean(configuredProvider),
      connected: isProviderConnected(configuredProvider),
    }
  })

  const customProviders: ProviderListItem[] = Object.entries(providers)
    .filter(([key]) => !KNOWN_PROVIDER_KEYS.has(key))
    .map(([key, provider]) => ({
      label: key,
      key,
      modelCount: getProviderModelCount(provider),
      configured: true,
      connected: isProviderConnected(provider),
      isCustom: true,
    }))

  const configuredProviders = [...presetProviders.filter(provider => provider.configured), ...customProviders]
    .filter(provider => matchesSearch(provider, searchQuery))

  const availableProviders = presetProviders
    .filter(provider => !provider.configured)
    .filter(provider => matchesSearch(provider, searchQuery))

  function handleProviderClick(providerKey: string) {
    if (onSelectProvider) {
      onSelectProvider(providerKey)
    }
  }

  function upsertProvider(providerKey: string, patch: ProviderConfig) {
    onChange({
      ...config,
      models: {
        ...config.models,
        providers: {
          ...providers,
          [providerKey]: {
            ...providers[providerKey],
            ...patch,
            models: providers[providerKey]?.models ?? [],
          },
        },
      },
    })
  }

  function handleAddProvider(providerKey: string) {
    const preset = PRESET_MAP[providerKey]
    upsertProvider(providerKey, {
      api: providers[providerKey]?.api ?? preset?.api ?? "openai-completions",
      baseUrl: providers[providerKey]?.baseUrl ?? preset?.baseUrl ?? "",
    })
    setIsAdding(false)
    setSearchQuery("")
    handleProviderClick(providerKey)
  }

  function handleAddCustomProvider() {
    const providerKey = `provider_${Date.now()}`
    upsertProvider(providerKey, {
      api: "openai-completions",
      baseUrl: "",
    })
    setIsAdding(false)
    setSearchQuery("")
    handleProviderClick(providerKey)
  }

  function renderProviderRow(provider: ProviderListItem, mode: "configured" | "available") {
    const statusClass = provider.connected
      ? "bg-green-100 text-green-800"
      : provider.isCustom
        ? "bg-amber-100 text-amber-800"
        : "bg-gray-100 text-gray-600"

    const statusText = provider.connected
      ? "已连接"
      : provider.isCustom
        ? "自定义"
        : "待配置"

    return (
      <button
        key={provider.key}
        onClick={() => (mode === "configured" ? handleProviderClick(provider.key) : handleAddProvider(provider.key))}
        className="w-full px-6 py-4 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 flex-shrink-0">
            {provider.label.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{provider.label}</p>
            <p className="text-xs text-gray-500">
              {provider.modelCount} model{provider.modelCount !== 1 ? "s" : ""} configured
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${statusClass}`}>
            {mode === "available" ? "添加" : statusText}
          </span>
          <ChevronRight size={18} className="text-gray-400" />
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">
              {isAdding ? "添加模型提供商" : "已配置模型列表"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isAdding
                ? "选择一个 Provider 预设，创建后会直接进入详情页继续填写配置"
                : "查看和管理当前 Profile 中已经配置的 AI 模型提供商"}
            </p>
          </div>
          <button
            onClick={() => setIsAdding(value => !value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isAdding
                ? "bg-gray-200 hover:bg-gray-300 text-gray-900"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
            title={isAdding ? "Cancel adding provider" : "Add new model provider"}
          >
            <Plus size={16} />
            <span>{isAdding ? "取消" : "+ 添加模型"}</span>
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={isAdding ? "搜索可添加的 Provider" : "搜索已配置的 Provider"}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 bg-white overflow-y-auto">
        <div className="divide-y divide-gray-200">
          {isAdding ? (
            availableProviders.length > 0 ? (
              <>
                {availableProviders.map(provider => renderProviderRow(provider, "available"))}
                <button
                  onClick={handleAddCustomProvider}
                  className="w-full px-6 py-4 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700 flex-shrink-0">
                      C
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">自定义 Provider</p>
                      <p className="text-xs text-gray-500">创建一个空白配置，自行填写 API 类型与 Base URL</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap bg-amber-100 text-amber-800">
                      新建
                    </span>
                    <ChevronRight size={18} className="text-gray-400" />
                  </div>
                </button>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">
                  {searchQuery ? "没有匹配的可添加 Provider" : "常用 Provider 都已经添加过了，可以新建一个自定义 Provider"}
                </p>
              </div>
            )
          ) : (
            configuredProviders.length > 0 ? (
              configuredProviders.map(provider => renderProviderRow(provider, "configured"))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">
                  {searchQuery ? "未找到匹配的已配置 Provider" : "还没有配置任何 Provider，点击右上角“添加模型”开始"}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
