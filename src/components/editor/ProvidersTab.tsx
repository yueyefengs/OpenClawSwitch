import { useState } from "react"
import { Eye, EyeOff, Plus, Trash2, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { cn } from "../../lib/utils"
import type { OpenclawConfig, ProviderConfig, ProviderModel } from "../../types"
import ProvidersPage from "./ProvidersPage"
import { PRESET_MAP, PROVIDER_PRESETS } from "./providerPresets"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
}

// ─── Single Provider Card ─────────────────────────────────────────────────────

interface CardProps {
  name: string
  prov: ProviderConfig
  onUpdate: (patch: Partial<ProviderConfig>) => void
  onRemove: () => void
  onRename: (newName: string) => void
  onApplyPreset: (newName: string, patch: Partial<ProviderConfig>) => void
}

function ProviderCard({ name, prov, onUpdate, onRemove, onRename, onApplyPreset }: CardProps) {
  const [showKey, setShowKey] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [customId, setCustomId] = useState("")
  const [customDisplayName, setCustomDisplayName] = useState("")

  // Detect which preset this provider matches (or "custom")
  const detectedPreset = PRESET_MAP[name.toLowerCase()] ? name.toLowerCase() : "custom"
  const [selectedPreset, setSelectedPreset] = useState<string>(detectedPreset)
  const preset = PRESET_MAP[selectedPreset] ?? PRESET_MAP.custom

  const activeModelIds = new Set((prov.models ?? []).map(m => m.id))

  function applyPreset(key: string) {
    const p = PRESET_MAP[key]
    if (!p) return
    setSelectedPreset(key)
    if (key !== "custom") {
      // Rename + update config in one atomic onChange call
      onApplyPreset(key, {
        api: p.api,
        ...(p.baseUrl !== undefined ? { baseUrl: p.baseUrl } : {}),
      })
    }
  }

  function togglePresetModel(model: { id: string; name: string }) {
    const existing = prov.models ?? []
    if (activeModelIds.has(model.id)) {
      onUpdate({ models: existing.filter(m => m.id !== model.id) })
    } else {
      onUpdate({ models: [...existing, { id: model.id, name: model.name }] })
    }
  }

  function addCustomModel() {
    if (!customId.trim()) return
    const existing = prov.models ?? []
    if (existing.some(m => m.id === customId.trim())) return
    const entry: ProviderModel = {
      id: customId.trim(),
      name: customDisplayName.trim() || customId.trim(),
    }
    onUpdate({ models: [...existing, entry] })
    setCustomId("")
    setCustomDisplayName("")
  }


  return (
    <div className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-white">
        <div className="flex-1 min-w-0">
          <Select value={selectedPreset} onValueChange={applyPreset}>
            <SelectTrigger className="h-8 text-sm font-medium border-0 bg-transparent shadow-none p-0 focus:ring-0 focus-visible:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_PRESETS.map(p => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setExpanded(v => !v)}
          title={expanded ? "收起" : "展开"}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors"
          onClick={onRemove}
          title="删除"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Custom name override (only for custom provider) */}
          {selectedPreset === "custom" && (
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Provider 名称（配置中的 key）</Label>
              <Input
                value={name}
                onBlur={e => onRename(e.target.value)}
                onChange={() => {}}
                placeholder="my-provider"
                className="h-8 text-sm"
              />
            </div>
          )}

          {/* API Type */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">API 类型</Label>
            <Select value={prov.api ?? ""} onValueChange={val => onUpdate({ api: val })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="选择 API 类型…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai-completions">openai-completions</SelectItem>
                <SelectItem value="openai-responses">openai-responses</SelectItem>
                <SelectItem value="openai-codex-responses">openai-codex-responses</SelectItem>
                <SelectItem value="anthropic-messages">anthropic-messages</SelectItem>
                <SelectItem value="google-generative-ai">google-generative-ai</SelectItem>
                <SelectItem value="github-copilot">github-copilot</SelectItem>
                <SelectItem value="bedrock-converse-stream">bedrock-converse-stream</SelectItem>
                <SelectItem value="ollama">ollama</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">API Key</Label>
            <div className="flex gap-2">
              <Input
                type={showKey ? "text" : "password"}
                value={prov.apiKey ?? ""}
                onChange={e => onUpdate({ apiKey: e.target.value })}
                placeholder="sk-..."
                className="h-8 text-sm"
              />
              <button
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setShowKey(v => !v)}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Base URL（留空使用默认）</Label>
            <Input
              value={prov.baseUrl ?? ""}
              onChange={e => onUpdate({ baseUrl: e.target.value })}
              placeholder="https://api.example.com/v1"
              className="h-8 text-sm"
            />
          </div>

          {/* Preset Models */}
          {preset.models.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">选择模型</Label>
              <div className="flex flex-wrap gap-2">
                {preset.models.map(m => {
                  const active = activeModelIds.has(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => togglePresetModel(m)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                      )}
                    >
                      {m.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Custom / added models list */}
          {(prov.models ?? []).filter(m => !preset.models.some(p => p.id === m.id)).length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">自定义模型</Label>
              <div className="space-y-1">
                {(prov.models ?? [])
                  .filter(m => !preset.models.some(p => p.id === m.id))
                  .map(m => (
                    <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-1.5">
                      <div className="min-w-0">
                        <span className="text-xs font-mono font-medium">{m.id}</span>
                        {m.name && m.name !== m.id && (
                          <span className="text-xs text-gray-400 ml-2">{m.name}</span>
                        )}
                      </div>
                      <button
                        className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                        onClick={() => onUpdate({ models: (prov.models ?? []).filter(x => x.id !== m.id) })}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Add custom model */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">添加自定义模型 ID</Label>
            <div className="flex gap-2">
              <Input
                className="h-8 text-xs"
                value={customId}
                onChange={e => setCustomId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomModel()}
                placeholder="Model ID（如 gpt-4o-2024-11-20）"
              />
              <Input
                className="h-8 text-xs w-32 shrink-0"
                value={customDisplayName}
                onChange={e => setCustomDisplayName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomModel()}
                placeholder="显示名（可选）"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 shrink-0"
                onClick={addCustomModel}
                disabled={!customId.trim()}
              >
                <Plus size={13} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Detail View: Edit Single Provider ─────────────────────────────────────────

interface DetailViewProps {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
  selectedProviderKey: string
  onBack: () => void
}

function ProviderDetailView({
  config,
  onChange,
  selectedProviderKey,
  onBack,
}: DetailViewProps) {
  const providers = config.models?.providers ?? {}

  const directMatch = providers[selectedProviderKey]
  const providerEntries = Object.entries(providers)
  const [providerName, providerConfig] = directMatch
    ? [selectedProviderKey, directMatch]
    : providerEntries.find(
        ([name, prov]) =>
          name.toLowerCase() === selectedProviderKey.toLowerCase()
          || (prov.api && PRESET_MAP[selectedProviderKey]?.api === prov.api)
      ) ?? [selectedProviderKey, providers[selectedProviderKey]]

  if (!providerConfig) {
    return (
      <div className="space-y-3 p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={16} /> 返回
        </button>
        <div className="text-center py-8">
          <p className="text-gray-500">Provider 配置未找到</p>
        </div>
      </div>
    )
  }

  function updateProvider(patch: Partial<ProviderConfig>) {
    onChange({
      ...config,
      models: {
        ...config.models,
        providers: {
          ...providers,
          [providerName]: { ...providerConfig, ...patch },
        },
      },
    })
  }

  function renameProvider(newName: string) {
    if (providerName === newName || !newName.trim()) return
    const next: Record<string, ProviderConfig> = {}
    for (const [k, v] of Object.entries(providers)) {
      next[k === providerName ? newName : k] = v
    }
    onChange({ ...config, models: { ...config.models, providers: next } })
  }

  function applyPresetToProvider(newName: string, patch: Partial<ProviderConfig>) {
    const next: Record<string, ProviderConfig> = {}
    for (const [k, v] of Object.entries(providers)) {
      next[k === providerName ? newName : k] = k === providerName ? { ...v, ...patch } : v
    }
    onChange({ ...config, models: { ...config.models, providers: next } })
  }

  function removeProvider() {
    const next = { ...providers }
    delete next[providerName]
    onChange({ ...config, models: { ...config.models, providers: next } })
    onBack()
  }

  return (
    <div className="space-y-3 p-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
      >
        <ArrowLeft size={16} /> 返回
      </button>
      <ProviderCard
        name={providerName}
        prov={providerConfig}
        onUpdate={updateProvider}
        onRemove={removeProvider}
        onRename={renameProvider}
        onApplyPreset={applyPresetToProvider}
      />
    </div>
  )
}

// ─── ProvidersTab (Main Component) ────────────────────────────────────────────

export default function ProvidersTab({ config, onChange }: Props) {
  const [view, setView] = useState<"list" | "detail">("list")
  const [selectedProviderKey, setSelectedProviderKey] = useState<string>("")

  function handleSelectProvider(providerKey: string) {
    setSelectedProviderKey(providerKey)
    setView("detail")
  }

  function handleBack() {
    setView("list")
    setSelectedProviderKey("")
  }

  if (view === "detail") {
    return (
      <ProviderDetailView
        config={config}
        onChange={onChange}
        selectedProviderKey={selectedProviderKey}
        onBack={handleBack}
      />
    )
  }

  return (
    <ProvidersPage
      config={config}
      onChange={onChange}
      onSelectProvider={handleSelectProvider}
    />
  )
}
