import { useState } from "react"
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import type { OpenclawConfig, ProviderConfig, ProviderModel } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
}

export default function ProvidersTab({ config, onChange }: Props) {
  const providers = config.models?.providers ?? {}
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  // per-provider new model form state: { [providerName]: { id: string, name: string } }
  const [newModel, setNewModel] = useState<Record<string, { id: string; name: string }>>({})

  function updateProvider(name: string, patch: Partial<ProviderConfig>) {
    onChange({
      ...config,
      models: {
        ...config.models,
        providers: {
          ...providers,
          [name]: { ...providers[name], ...patch },
        },
      },
    })
  }

  function addProvider() {
    const name = `provider_${Date.now()}`
    onChange({
      ...config,
      models: {
        ...config.models,
        providers: { ...providers, [name]: { models: [] } },
      },
    })
  }

  function removeProvider(name: string) {
    const next = { ...providers }
    delete next[name]
    onChange({ ...config, models: { ...config.models, providers: next } })
  }

  function renameProvider(oldName: string, newName: string) {
    if (oldName === newName || !newName.trim()) return
    const next: Record<string, ProviderConfig> = {}
    for (const [k, v] of Object.entries(providers)) {
      next[k === oldName ? newName : k] = v
    }
    onChange({ ...config, models: { ...config.models, providers: next } })
  }

  function addModel(providerName: string) {
    const form = newModel[providerName]
    if (!form?.id.trim()) return
    const prov = providers[providerName] ?? {}
    const existing = prov.models ?? []
    const entry: ProviderModel = {
      id: form.id.trim(),
      name: form.name.trim() || form.id.trim(),
    }
    updateProvider(providerName, { models: [...existing, entry] })
    setNewModel(m => ({ ...m, [providerName]: { id: "", name: "" } }))
  }

  function removeModel(providerName: string, modelId: string) {
    const prov = providers[providerName] ?? {}
    updateProvider(providerName, {
      models: (prov.models ?? []).filter(m => m.id !== modelId),
    })
  }

  return (
    <div className="space-y-4 p-4">
      {Object.entries(providers).map(([name, prov]) => {
        const form = newModel[name] ?? { id: "", name: "" }
        return (
          <div key={name} className="border rounded-lg p-4 space-y-3">
            {/* Provider name */}
            <div className="flex items-center gap-2">
              <Input
                defaultValue={name}
                className="font-medium"
                onBlur={e => renameProvider(name, e.target.value)}
              />
              <Button variant="ghost" size="icon" onClick={() => removeProvider(name)}>
                <Trash2 size={14} />
              </Button>
            </div>

            {/* API Type */}
            <div className="space-y-2">
              <Label>API Type</Label>
              <Input
                value={prov.api ?? ""}
                onChange={e => updateProvider(name, { api: e.target.value })}
                placeholder="openai-responses"
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  data-testid={`apikey-${name}`}
                  type={visible[name] ? "text" : "password"}
                  value={prov.apiKey ?? ""}
                  onChange={e => updateProvider(name, { apiKey: e.target.value })}
                  placeholder="sk-..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setVisible(v => ({ ...v, [name]: !v[name] }))}
                >
                  {visible[name] ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-1">
              <Label>Base URL</Label>
              <Input
                value={prov.baseUrl ?? ""}
                onChange={e => updateProvider(name, { baseUrl: e.target.value })}
                placeholder="留空使用官方默认地址"
              />
            </div>

            {/* Models list */}
            <div className="space-y-2">
              <Label>模型列表</Label>
              {(prov.models ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">暂无模型，添加后可在 Agent 中选择</p>
              )}
              {(prov.models ?? []).map(m => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono font-medium truncate">{name}/{m.id}</span>
                    {m.name && m.name !== m.id && (
                      <span className="text-xs text-muted-foreground truncate">{m.name}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeModel(name, m.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}

              {/* Add model form */}
              <div className="flex gap-2 pt-1">
                <Input
                  className="h-8 text-xs"
                  value={form.id}
                  onChange={e => setNewModel(m => ({ ...m, [name]: { ...form, id: e.target.value } }))}
                  onKeyDown={e => e.key === "Enter" && addModel(name)}
                  onBlur={() => addModel(name)}
                  placeholder="Model ID（如 glm-4.7）"
                />
                <Input
                  className="h-8 text-xs"
                  value={form.name}
                  onChange={e => setNewModel(m => ({ ...m, [name]: { ...form, name: e.target.value } }))}
                  onKeyDown={e => e.key === "Enter" && addModel(name)}
                  placeholder="显示名称（可选）"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 shrink-0"
                  onClick={() => addModel(name)}
                  disabled={!form.id.trim()}
                >
                  <Plus size={12} />
                </Button>
              </div>
            </div>
          </div>
        )
      })}
      <Button variant="outline" onClick={addProvider} className="w-full gap-2">
        <Plus size={14} /> 添加提供商
      </Button>
    </div>
  )
}
