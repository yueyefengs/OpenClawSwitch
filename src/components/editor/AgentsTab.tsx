import { useState, useEffect } from "react"
import { Plus, Trash2, Save } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { cn } from "../../lib/utils"
import { fileApi } from "../../lib/api/profile"
import { toast } from "sonner"
import type { OpenclawConfig, AgentConfig } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
}

// ─── Identity ─────────────────────────────────────────────────────────────────

interface AgentIdentity {
  name: string
  creature: string
  vibe: string
  emoji: string
  avatar: string
}

function buildIdentityMd(identity: AgentIdentity): string {
  return `# IDENTITY.md - Who Am I?

---

- **Name:** ${identity.name}
- **Creature:** ${identity.creature}
- **Vibe:** ${identity.vibe}
- **Emoji:** ${identity.emoji}
- **Avatar:** ${identity.avatar}

---

This isn't just metadata. It's the start of figuring out who you are.
`
}

function parseIdentityMd(content: string): Partial<AgentIdentity> {
  const get = (key: string) => {
    const m = new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`).exec(content)
    return m ? m[1].trim() : ""
  }
  return {
    name: get("Name"),
    creature: get("Creature"),
    vibe: get("Vibe"),
    emoji: get("Emoji"),
    avatar: get("Avatar"),
  }
}

// ─── Agent Editor Panel ──────────────────────────────────────────────────────

function AgentEditor({
  agent,
  config,
  modelOptions,
  onUpdate,
  onRemove,
}: {
  agent: AgentConfig
  config: Partial<OpenclawConfig>
  modelOptions: { value: string; label: string }[]
  onUpdate: (patch: Partial<AgentConfig>) => void
  onRemove: () => void
}) {
  const [addingFor, setAddingFor] = useState("")
  const [identity, setIdentity] = useState<AgentIdentity>({
    name: agent.name ?? "",
    creature: "",
    vibe: "",
    emoji: "",
    avatar: "",
  })
  const [identityLoaded, setIdentityLoaded] = useState(false)
  const [savingIdentity, setSavingIdentity] = useState(false)

  // Set default workspace for main agent
  useEffect(() => {
    if (agent.id === "main" && !agent.workspace) {
      onUpdate({ workspace: "~/.openclaw/workspace" })
    }
  }, [agent.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const workspacePath = agent.workspace ?? (agent.id === "main" ? "~/.openclaw/workspace" : "") ?? agent.agentDir ?? ""

  useEffect(() => {
    if (!workspacePath || identityLoaded) return
    fileApi.read(`${workspacePath}/IDENTITY.md`)
      .then(content => {
        const parsed = parseIdentityMd(content)
        setIdentity(prev => ({ ...prev, ...parsed }))
        setIdentityLoaded(true)
      })
      .catch(() => {
        setIdentityLoaded(true)
      })
  }, [workspacePath, identityLoaded])

  async function saveIdentity() {
    if (!workspacePath) {
      toast.error("请先配置 Workspace 目录")
      return
    }
    setSavingIdentity(true)
    try {
      await fileApi.write(`${workspacePath}/IDENTITY.md`, buildIdentityMd(identity))
      if (identity.name && identity.name !== agent.name) {
        onUpdate({ name: identity.name })
      }
      toast.success("IDENTITY.md 已保存")
    } catch (e) {
      toast.error(`保存失败: ${e}`)
    } finally {
      setSavingIdentity(false)
    }
  }

  const allTelegramAccountIds = Object.keys(config.channels?.telegram?.accounts ?? {})
  const boundBindings = (config.bindings ?? []).filter(b => b.agentId === agent.id)
  const boundAccountIds = boundBindings
    .filter(b => b.match.channel === "telegram")
    .map(b => b.match.accountId)
  const unboundAccountIds = allTelegramAccountIds.filter(id => !boundAccountIds.includes(id))

  function addBinding() {
    if (!addingFor) return
    const existing = config.bindings ?? []
    if (existing.some(b => b.match.channel === "telegram" && b.match.accountId === addingFor && b.agentId === agent.id)) return
    setAddingFor("")
    onUpdate({ __addBinding: { accountId: addingFor } } as unknown as Partial<AgentConfig>)
  }

  return (
    <div className="space-y-5">
      {/* ─ Basic ─ */}
      <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50/70 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">基本配置</div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Agent ID</Label>
              <Input value={agent.id} disabled className="h-8 text-xs font-mono bg-gray-50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">显示名称</Label>
              <Input
                value={agent.name ?? ""}
                onChange={e => onUpdate({ name: e.target.value })}
                placeholder={agent.id}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">模型</Label>
            <Select
              value={agent.model ?? ""}
              onValueChange={val => onUpdate({ model: val === "__none__" ? undefined : val })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="选择模型…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">（不指定）</SelectItem>
                {modelOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
                {agent.model && !modelOptions.some(o => o.value === agent.model) && (
                  <SelectItem value={agent.model}>{agent.model}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Workspace 目录</Label>
              <Input
                value={agent.workspace ?? ""}
                onChange={e => onUpdate({ workspace: e.target.value })}
                placeholder="~/.openclaw/workspace"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Agent 目录 (agentDir)</Label>
              <Input
                value={agent.agentDir ?? ""}
                onChange={e => onUpdate({ agentDir: e.target.value })}
                placeholder="~/.openclaw/agent"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─ Identity ─ */}
      <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50/70 border-b flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">身份设定 (IDENTITY.md)</span>
          <button
            onClick={saveIdentity}
            disabled={savingIdentity || !workspacePath}
            className={cn(
              "flex items-center gap-1.5 rounded-lg text-xs font-medium px-2.5 py-1 transition-colors",
              workspacePath
                ? "bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
            title={!workspacePath ? "请先填写 Workspace 目录" : undefined}
          >
            <Save size={11} /> {savingIdentity ? "保存中…" : "保存文件"}
          </button>
        </div>
        <div className="p-4 space-y-3">
          {!workspacePath && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              需要配置 Workspace 目录才能保存 IDENTITY.md
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">名称 (Name)</Label>
              <Input
                value={identity.name}
                onChange={e => setIdentity(v => ({ ...v, name: e.target.value }))}
                placeholder="选一个你喜欢的名字"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">表情符号 (Emoji)</Label>
              <Input
                value={identity.emoji}
                onChange={e => setIdentity(v => ({ ...v, emoji: e.target.value }))}
                placeholder="🤖"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">生物类型 (Creature)</Label>
            <Input
              value={identity.creature}
              onChange={e => setIdentity(v => ({ ...v, creature: e.target.value }))}
              placeholder="AI？机器人？使魔？机器中的幽灵？"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">气质 (Vibe)</Label>
            <Input
              value={identity.vibe}
              onChange={e => setIdentity(v => ({ ...v, vibe: e.target.value }))}
              placeholder="犀利？温暖？混乱？沉稳？高效专业？"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">头像 (Avatar)</Label>
            <Input
              value={identity.avatar}
              onChange={e => setIdentity(v => ({ ...v, avatar: e.target.value }))}
              placeholder="avatars/avatar.png 或 https://..."
              className="h-8 text-sm"
            />
          </div>
        </div>
      </section>

      {/* ─ Channel Bindings ─ */}
      {allTelegramAccountIds.length > 0 && (
        <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50/70 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">绑定 Channel</div>
          <div className="p-4 space-y-2">
            {boundAccountIds.length === 0 && (
              <p className="text-xs text-gray-400">暂无绑定</p>
            )}
            {boundAccountIds.map(accountId => (
              <div key={accountId} className="flex items-center justify-between">
                <span className="text-xs font-mono bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-2 py-1">
                  telegram / {accountId}
                </span>
                <button
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  onClick={() => onUpdate({ __removeBinding: { accountId } } as unknown as Partial<AgentConfig>)}
                >
                  × 解除
                </button>
              </div>
            ))}
            {unboundAccountIds.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <Select value={addingFor} onValueChange={setAddingFor}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="选择 Telegram 账号" />
                  </SelectTrigger>
                  <SelectContent>
                    {unboundAccountIds.map(accountId => (
                      <SelectItem key={accountId} value={accountId}>{accountId}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={addBinding}
                  disabled={!addingFor}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 transition-colors disabled:opacity-50 shrink-0"
                >
                  <Plus size={11} /> 绑定
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─ Danger ─ */}
      <div className="flex justify-end">
        <button
          onClick={onRemove}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs px-3 py-1.5 transition-colors"
        >
          <Trash2 size={12} /> 删除 Agent
        </button>
      </div>
    </div>
  )
}

// ─── AgentsTab ────────────────────────────────────────────────────────────────

export default function AgentsTab({ config, onChange }: Props) {
  const list = config.agents?.list ?? []
  const [selectedId, setSelectedId] = useState<string>(list[0]?.id ?? "")

  // Keep selectedId valid when list changes
  const validSelectedId = list.some(a => a.id === selectedId) ? selectedId : (list[0]?.id ?? "")

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
    const anyPatch = patch as Record<string, unknown>
    if (anyPatch.__addBinding) {
      const { accountId } = anyPatch.__addBinding as { accountId: string }
      const existing = config.bindings ?? []
      const filtered = existing.filter(b => !(b.match.channel === "telegram" && b.match.accountId === accountId))
      onChange({ ...config, bindings: [...filtered, { agentId: id, match: { channel: "telegram", accountId } }] })
      return
    }
    if (anyPatch.__removeBinding) {
      const { accountId } = anyPatch.__removeBinding as { accountId: string }
      onChange({ ...config, bindings: (config.bindings ?? []).filter(b => !(b.agentId === id && b.match.channel === "telegram" && b.match.accountId === accountId)) })
      return
    }
    onChange({ ...config, agents: { ...config.agents, list: list.map(a => a.id === id ? { ...a, ...patch } : a) } })
  }

  function removeAgent(id: string) {
    const nextList = list.filter(a => a.id !== id)
    const nextBindings = (config.bindings ?? []).filter(b => b.agentId !== id)
    onChange({ ...config, agents: { ...config.agents, list: nextList }, bindings: nextBindings })
    setSelectedId(nextList[0]?.id ?? "")
  }

  function addAgent() {
    const hasMain = list.some(a => a.id === "main")
    const id = hasMain ? `agent_${Date.now()}` : "main"
    const workspace = id === "main" ? "~/.openclaw/workspace" : ""
    onChange({ ...config, agents: { ...config.agents, list: [...list, { id, workspace }] } })
    setSelectedId(id)
  }

  const selectedAgent = list.find(a => a.id === validSelectedId)

  return (
    <div className="flex h-full min-h-0">
      {/* ─ Left Sidebar ─ */}
      <div className="w-44 shrink-0 border-r bg-gray-50/60 flex flex-col">
        <div className="flex-1 overflow-auto py-1">
          {list.length === 0 && (
            <p className="px-3 py-4 text-xs text-gray-400 text-center">暂无 Agent</p>
          )}
          {list.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedId(agent.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors",
                validSelectedId === agent.id
                  ? "bg-white text-blue-600 font-medium shadow-sm border-l-2 border-l-blue-500"
                  : "text-gray-600 hover:bg-white/60 hover:text-gray-800 border-l-2 border-l-transparent"
              )}
            >
              <div className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                validSelectedId === agent.id ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
              )}>
                {(agent.name ?? agent.id).charAt(0).toUpperCase()}
              </div>
              <span className="truncate text-xs">{agent.name ?? agent.id}</span>
            </button>
          ))}
        </div>

        <div className="p-2 border-t">
          <button
            onClick={addAgent}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
          >
            <Plus size={12} /> 添加 Agent
          </button>
        </div>
      </div>

      {/* ─ Right Content ─ */}
      <div className="flex-1 overflow-auto p-4">
        {selectedAgent ? (
          <AgentEditor
            key={selectedAgent.id}
            agent={selectedAgent}
            config={config}
            modelOptions={modelOptions}
            onUpdate={patch => updateAgent(selectedAgent.id, patch)}
            onRemove={() => removeAgent(selectedAgent.id)}
          />
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            {list.length === 0 ? "点击左下角添加 Agent" : "选择左侧 Agent 开始编辑"}
          </div>
        )}
      </div>
    </div>
  )
}
