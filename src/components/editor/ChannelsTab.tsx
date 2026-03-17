import { useState } from "react"
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import type { OpenclawConfig, TelegramChannelConfig, TelegramAccountConfig } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
}

const DM_POLICIES = ["pairing", "allowlist", "open", "disabled"] as const
// openclaw valid values: true, false, "off", "partial", "block", "progress"
const STREAMING_OPTS = [
  { value: "true",     label: "true（全量流式）" },
  { value: "false",    label: "false（关闭）" },
  { value: "off",      label: "off（关闭）" },
  { value: "partial",  label: "partial（部分）" },
  { value: "block",    label: "block（分块）" },
  { value: "progress", label: "progress（进度）" },
] as const

/** Convert stored streaming value (bool | string) to Select string */
function streamingToStr(v: boolean | string | undefined): string {
  if (v === true) return "true"
  if (v === false) return "false"
  if (v === "on") return "true"   // migrate legacy "on" → true
  return v ?? ""
}

/** Convert Select string back to the value openclaw expects */
function strToStreaming(s: string): boolean | "off" | "partial" | "block" | "progress" {
  if (s === "true") return true
  if (s === "false") return false
  return s as "off" | "partial" | "block" | "progress"
}

function patchTelegram(
  config: Partial<OpenclawConfig>,
  patch: Partial<TelegramChannelConfig>,
  onChange: (c: Partial<OpenclawConfig>) => void
) {
  onChange({
    ...config,
    channels: {
      ...config.channels,
      telegram: { ...config.channels?.telegram, ...patch },
    },
  })
}

export default function ChannelsTab(_props: Props) {
  // Navigation state management
  const [view, setView] = useState<"list" | "detail">("list")
  const [selectedChannel, setSelectedChannel] = useState<string>("")

  // Current view: Channels List
  if (view === "list") {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-lg font-semibold">Channels List (Coming Soon)</h2>
        <p className="text-sm text-muted-foreground">
          选择一个渠道来配置其设置
        </p>
        <div className="space-y-2">
          <Button
            onClick={() => {
              setSelectedChannel("telegram")
              setView("detail")
            }}
            variant="outline"
            className="w-full justify-start"
          >
            Telegram
          </Button>
        </div>
      </div>
    )
  }

  // Current view: Channel Detail
  if (view === "detail") {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setView("list")
              setSelectedChannel("")
            }}
            variant="ghost"
            size="sm"
          >
            ← 返回
          </Button>
          <h2 className="text-lg font-semibold">{selectedChannel} Detail (Coming Soon)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          渠道详情页面将在这里显示
        </p>
      </div>
    )
  }

  // Fallback (should not reach here)
  return null
}

// ============================================================================
// Original Telegram Configuration Logic (to be extracted into TelegramDetailPage in Task 3)
// ============================================================================
function OriginalChannelsTabLogic({ config, onChange }: Props) {
  const tg = config.channels?.telegram ?? {}
  const accounts = tg.accounts ?? {}
  const [visibleTokens, setVisibleTokens] = useState<Record<string, boolean>>({})
  const [allowFromInput, setAllowFromInput] = useState("")

  function updateAccount(id: string, patch: Partial<TelegramAccountConfig>) {
    patchTelegram(config, {
      accounts: { ...accounts, [id]: { ...accounts[id], ...patch } },
    }, onChange)
  }

  function addAccount() {
    const id = `account_${Date.now()}`
    patchTelegram(config, {
      accounts: { ...accounts, [id]: {} },
    }, onChange)
  }

  function removeAccount(id: string) {
    const next = { ...accounts }
    delete next[id]
    patchTelegram(config, { accounts: next }, onChange)
  }

  function renameAccount(oldId: string, newId: string) {
    if (oldId === newId || !newId.trim()) return
    const next: Record<string, TelegramAccountConfig> = {}
    for (const [k, v] of Object.entries(accounts)) {
      next[k === oldId ? newId : k] = v
    }
    patchTelegram(config, { accounts: next }, onChange)
  }

  function updateBinding(accountId: string, agentId: string) {
    const existing = (config.bindings ?? []).filter(
      b => !(b.match.channel === "telegram" && b.match.accountId === accountId)
    )
    const next = agentId && agentId !== "__none__"
      ? [...existing, { agentId, match: { channel: "telegram", accountId } }]
      : existing
    onChange({ ...config, bindings: next })
  }

  function addAllowFrom() {
    const userId = parseInt(allowFromInput.trim(), 10)
    if (isNaN(userId)) return
    const current = tg.allowFrom ?? []
    if (current.includes(userId)) return
    patchTelegram(config, { allowFrom: [...current, userId] }, onChange)
    setAllowFromInput("")
  }

  function removeAllowFrom(userId: number) {
    patchTelegram(config, {
      allowFrom: (tg.allowFrom ?? []).filter(id => id !== userId),
    }, onChange)
  }

  const needsAllowFrom =
    (tg.dmPolicy === "allowlist" || tg.groupPolicy === "allowlist") &&
    (tg.allowFrom ?? []).length === 0

  return (
    <div className="space-y-6 p-4">
      {/* Telegram top-level settings */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-sm">Telegram 全局设置</h3>
        <div className="flex items-center gap-3">
          <Switch
            checked={tg.enabled ?? false}
            onCheckedChange={v => patchTelegram(config, { enabled: v }, onChange)}
          />
          <Label>启用 Telegram</Label>
        </div>
        <div className="space-y-2">
          <Label>代理</Label>
          <Input
            value={tg.proxy ?? ""}
            onChange={e => patchTelegram(config, { proxy: e.target.value }, onChange)}
            placeholder="http://127.0.0.1:7897"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>DM Policy</Label>
            <Select
              value={tg.dmPolicy ?? undefined}
              onValueChange={v => patchTelegram(config, { dmPolicy: v as TelegramChannelConfig["dmPolicy"] }, onChange)}
            >
              <SelectTrigger><SelectValue placeholder="选择策略" /></SelectTrigger>
              <SelectContent>
                {DM_POLICIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Group Policy</Label>
            <Select
              value={tg.groupPolicy ?? undefined}
              onValueChange={v => patchTelegram(config, { groupPolicy: v as TelegramChannelConfig["groupPolicy"] }, onChange)}
            >
              <SelectTrigger><SelectValue placeholder="选择策略" /></SelectTrigger>
              <SelectContent>
                {DM_POLICIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Streaming</Label>
          <Select
            value={streamingToStr(tg.streaming)}
            onValueChange={v => patchTelegram(config, { streaming: strToStreaming(v) }, onChange)}
          >
            <SelectTrigger><SelectValue placeholder="选择模式" /></SelectTrigger>
            <SelectContent>
              {STREAMING_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Global allowFrom */}
        <div className="space-y-2">
          <Label>Allow From（全局白名单 TG 用户 ID）</Label>
          {needsAllowFrom && (
            <p className="text-xs text-destructive">
              Policy=allowlist 时需至少填一个用户 ID
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {(tg.allowFrom ?? []).map(uid => (
              <span
                key={uid}
                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-mono"
              >
                {uid}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeAllowFrom(uid)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              className="h-8 text-xs"
              type="number"
              value={allowFromInput}
              onChange={e => setAllowFromInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addAllowFrom()}
              onBlur={addAllowFrom}
              placeholder="TG 用户 ID（如 6292151698）"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 shrink-0"
              onClick={addAllowFrom}
              disabled={!allowFromInput.trim()}
            >
              <Plus size={12} />
            </Button>
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">账号列表</h3>
        {Object.entries(accounts).map(([id, acc]) => (
          <div key={id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                defaultValue={id}
                className="font-medium font-mono text-sm"
                onBlur={e => renameAccount(id, e.target.value)}
                placeholder="账号 ID（如 default 或数字 ID）"
              />
              <Button variant="ghost" size="icon" onClick={() => removeAccount(id)}>
                <Trash2 size={14} />
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Bot Token</Label>
              <div className="flex gap-2">
                <Input
                  type={visibleTokens[id] ? "text" : "password"}
                  value={acc.botToken ?? ""}
                  onChange={e => updateAccount(id, { botToken: e.target.value })}
                  placeholder="1234567890:ABCdef..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setVisibleTokens(v => ({ ...v, [id]: !v[id] }))}
                >
                  {visibleTokens[id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>绑定 Agent</Label>
              <Select
                value={config.bindings?.find(b => b.match.channel === "telegram" && b.match.accountId === id)?.agentId ?? ""}
                onValueChange={v => updateBinding(id, v)}
              >
                <SelectTrigger><SelectValue placeholder="未绑定" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">未绑定</SelectItem>
                  {(config.agents?.list ?? []).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name ?? a.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>DM Policy</Label>
                <Select
                  value={acc.dmPolicy ?? undefined}
                  onValueChange={v => updateAccount(id, { dmPolicy: v as TelegramAccountConfig["dmPolicy"] })}
                >
                  <SelectTrigger><SelectValue placeholder="继承全局" /></SelectTrigger>
                  <SelectContent>
                    {DM_POLICIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group Policy</Label>
                <Select
                  value={acc.groupPolicy ?? undefined}
                  onValueChange={v => updateAccount(id, { groupPolicy: v as TelegramAccountConfig["groupPolicy"] })}
                >
                  <SelectTrigger><SelectValue placeholder="继承全局" /></SelectTrigger>
                  <SelectContent>
                    {DM_POLICIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={addAccount} className="w-full gap-2">
          <Plus size={14} /> 添加账号
        </Button>
      </div>
    </div>
  )
}

// Keep reference to avoid TS error until Task 3 implementation
void OriginalChannelsTabLogic
