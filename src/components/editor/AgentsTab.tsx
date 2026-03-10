import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import type { OpenclawConfig, AgentConfig } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
}

function patchDefaults(
  config: Partial<OpenclawConfig>,
  patch: Partial<NonNullable<NonNullable<OpenclawConfig["agents"]>["defaults"]>>,
  onChange: (c: Partial<OpenclawConfig>) => void
) {
  onChange({
    ...config,
    agents: {
      ...config.agents,
      defaults: { ...config.agents?.defaults, ...patch },
    },
  })
}

export default function AgentsTab({ config, onChange }: Props) {
  const defaults = config.agents?.defaults ?? {}
  const list = config.agents?.list ?? []

  const [addingFor, setAddingFor] = useState<Record<string, string>>({})

  // Build model options from config.models?.providers
  const modelOptions: { value: string; label: string }[] = []
  for (const [providerName, provider] of Object.entries(config.models?.providers ?? {})) {
    for (const model of provider.models ?? []) {
      modelOptions.push({
        value: `${providerName}/${model.id}`,
        label: `${providerName} / ${model.name ?? model.id}`,
      })
    }
  }

  function updateAgent(id: string, patch: Partial<AgentConfig>) {
    onChange({
      ...config,
      agents: {
        ...config.agents,
        list: list.map(a => (a.id === id ? { ...a, ...patch } : a)),
      },
    })
  }

  function removeAgent(id: string) {
    const nextList = list.filter(a => a.id !== id)
    const nextBindings = (config.bindings ?? []).filter(b => b.agentId !== id)
    onChange({
      ...config,
      agents: { ...config.agents, list: nextList },
      bindings: nextBindings,
    })
  }

  function addAgent() {
    const id = `agent_${Date.now()}`
    onChange({
      ...config,
      agents: {
        ...config.agents,
        list: [...list, { id }],
      },
    })
  }

  function addBinding(agentId: string, accountId: string) {
    if (!accountId) return
    const existing = config.bindings ?? []
    // Avoid duplicate
    if (existing.some(b => b.match.channel === "telegram" && b.match.accountId === accountId && b.agentId === agentId)) return
    // Remove any existing binding for this accountId (one accountId → one agent)
    const filtered = existing.filter(b => !(b.match.channel === "telegram" && b.match.accountId === accountId))
    onChange({ ...config, bindings: [...filtered, { agentId, match: { channel: "telegram", accountId } }] })
  }

  function removeBinding(agentId: string, accountId: string) {
    onChange({
      ...config,
      bindings: (config.bindings ?? []).filter(
        b => !(b.agentId === agentId && b.match.channel === "telegram" && b.match.accountId === accountId)
      ),
    })
  }

  const allTelegramAccountIds = Object.keys(config.channels?.telegram?.accounts ?? {})

  return (
    <div className="space-y-6 p-4">
      {/* Defaults */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-sm">默认设置</h3>
        <div className="space-y-2">
          <Label>主模型 (Primary Model)</Label>
          <Select
            value={defaults.model?.primary ?? ""}
            onValueChange={val =>
              patchDefaults(config, { model: { ...defaults.model, primary: val === "__none__" ? undefined : val } }, onChange)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="选择模型…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">（未设置）</SelectItem>
              {modelOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
              {defaults.model?.primary &&
                !modelOptions.some(o => o.value === defaults.model?.primary) && (
                  <SelectItem value={defaults.model.primary}>{defaults.model.primary}</SelectItem>
                )}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>最大并发 Agent 数</Label>
            <Input type="number" min={1} value={defaults.maxConcurrent ?? ""} onChange={e => { const v = parseInt(e.target.value); patchDefaults(config, { maxConcurrent: isNaN(v) ? undefined : v }, onChange) }} placeholder="4" />
          </div>
          <div className="space-y-2">
            <Label>最大并发子 Agent 数</Label>
            <Input type="number" min={1} value={defaults.subagents?.maxConcurrent ?? ""} onChange={e => { const v = parseInt(e.target.value); patchDefaults(config, { subagents: { maxConcurrent: isNaN(v) ? undefined : v } }, onChange) }} placeholder="8" />
          </div>
        </div>
      </div>

      {/* Agent list */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Agent 列表</h3>
        {list.map(agent => {
          const boundBindings = (config.bindings ?? []).filter(b => b.agentId === agent.id)
          const boundAccountIds = boundBindings
            .filter(b => b.match.channel === "telegram")
            .map(b => b.match.accountId)
          const unboundAccountIds = allTelegramAccountIds.filter(id => !boundAccountIds.includes(id))
          const selectedAddAccount = addingFor[agent.id] ?? ""

          return (
            <div key={agent.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">ID: {agent.id}</span>
                <Button variant="ghost" size="icon" onClick={() => removeAgent(agent.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>名称</Label>
                  <Input value={agent.name ?? ""} onChange={e => updateAgent(agent.id, { name: e.target.value })} placeholder={agent.id} />
                </div>
                <div className="space-y-2">
                  <Label>模型</Label>
                  <Select
                    value={agent.model ?? ""}
                    onValueChange={val => updateAgent(agent.id, { model: val === "__none__" ? undefined : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择模型…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">（未设置）</SelectItem>
                      {modelOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                      {/* If current value is not in the list, show it as a fallback option */}
                      {agent.model && !modelOptions.some(o => o.value === agent.model) && (
                        <SelectItem value={agent.model}>{agent.model}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>工作目录 (Workspace)</Label>
                <Input value={agent.workspace ?? ""} onChange={e => updateAgent(agent.id, { workspace: e.target.value })} placeholder="/path/to/workspace" />
              </div>
              <div className="space-y-2">
                <Label>Agent 目录 (agentDir)</Label>
                <Input value={agent.agentDir ?? ""} onChange={e => updateAgent(agent.id, { agentDir: e.target.value })} placeholder="/path/to/agent" />
              </div>

              {/* Channel Bindings */}
              <div className="border rounded-md p-3 space-y-2">
                <Label className="text-xs font-medium">绑定 Channel</Label>
                {boundAccountIds.length === 0 && (
                  <p className="text-xs text-muted-foreground">暂无绑定</p>
                )}
                {boundAccountIds.map(accountId => (
                  <div key={accountId} className="flex items-center justify-between gap-2">
                    <span className="text-xs bg-muted rounded px-2 py-1 font-mono">
                      telegram / {accountId}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => removeBinding(agent.id, accountId)}
                    >
                      × 解除
                    </Button>
                  </div>
                ))}
                {unboundAccountIds.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <Select
                      value={selectedAddAccount}
                      onValueChange={val => setAddingFor(prev => ({ ...prev, [agent.id]: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="选择 Telegram 账号" />
                      </SelectTrigger>
                      <SelectContent>
                        {unboundAccountIds.map(accountId => (
                          <SelectItem key={accountId} value={accountId}>
                            {accountId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs gap-1 shrink-0"
                      onClick={() => {
                        addBinding(agent.id, selectedAddAccount)
                        setAddingFor(prev => ({ ...prev, [agent.id]: "" }))
                      }}
                      disabled={!selectedAddAccount}
                    >
                      <Plus size={12} /> 绑定
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <Button variant="outline" onClick={addAgent} className="w-full gap-2">
          <Plus size={14} /> 添加 Agent
        </Button>
      </div>
    </div>
  )
}
