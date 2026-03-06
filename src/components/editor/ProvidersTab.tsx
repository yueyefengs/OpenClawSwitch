import { useState } from "react"
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import type { OpenclawConfig, ProviderConfig } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
}

export default function ProvidersTab({ config, onChange }: Props) {
  const providers = config.models?.providers ?? {}
  const [visible, setVisible] = useState<Record<string, boolean>>({})

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
        providers: { ...providers, [name]: {} },
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

  return (
    <div className="space-y-4 p-4">
      {Object.entries(providers).map(([name, prov]) => (
        <div key={name} className="border rounded-lg p-4 space-y-3">
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
          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input
              value={prov.baseUrl ?? ""}
              onChange={e => updateProvider(name, { baseUrl: e.target.value })}
              placeholder="https://api.anthropic.com/v1"
            />
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addProvider} className="w-full gap-2">
        <Plus size={14} /> 添加提供商
      </Button>
    </div>
  )
}
