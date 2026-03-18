import { useState } from "react"
import { Eye, EyeOff, Plus, Trash2, ChevronLeft } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import type { OpenclawConfig, TelegramChannelConfig, TelegramAccountConfig } from "../../types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
  onBack: () => void
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

export default function TelegramDetailPage({ config, onChange, onBack }: Props) {
  const tg = config.channels?.telegram ?? {}
  const accounts = tg.accounts ?? {}
  const [visibleTokens, setVisibleTokens] = useState<Record<string, boolean>>({})
  const [allowFromInput, setAllowFromInput] = useState("")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")

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
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold">Telegram</h2>
          </div>
          <button
            onClick={addAccount}
            className="p-2 hover:bg-gray-100 rounded"
            title="Add new bot account"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Tabs for different sections */}
      <div className="bg-white border-b border-gray-200">
        <Tabs defaultValue="bots" className="w-full">
          <TabsList className="justify-start border-0 rounded-none bg-transparent px-6 gap-6 h-12">
            <TabsTrigger value="bots" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
              Bots
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Bots Tab */}
          <TabsContent value="bots" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-3 gap-3 p-4 h-[calc(100%-56px)] overflow-hidden">
              {/* Left sidebar - Bot list */}
              <div className="border rounded-lg bg-white overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-3">
                  <p className="text-xs font-semibold text-gray-600">Telegram Bots</p>
                </div>
                <div className="space-y-1 p-2">
                  {Object.entries(accounts).map(([id]) => (
                    <button
                      key={id}
                      onClick={() => setSelectedAccountId(id)}
                      className={`w-full p-2 rounded text-left text-sm transition-colors ${
                        selectedAccountId === id
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 flex-shrink-0">
                          {id.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-mono">{id}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {Object.keys(accounts).length === 0 && (
                    <p className="text-xs text-gray-500 p-2">No bots yet</p>
                  )}
                </div>
              </div>

              {/* Right side - Selected bot details */}
              <div className="col-span-2 border rounded-lg bg-white overflow-y-auto">
                {selectedAccountId && accounts[selectedAccountId] ? (
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b">
                      <h3 className="font-semibold">{selectedAccountId}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAccount(selectedAccountId)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>

                    {/* Bot Token */}
                    <div className="space-y-2">
                      <Label className="text-xs">Bot Token</Label>
                      <div className="flex gap-2">
                        <Input
                          type={visibleTokens[selectedAccountId] ? "text" : "password"}
                          value={accounts[selectedAccountId].botToken ?? ""}
                          onChange={e => updateAccount(selectedAccountId, { botToken: e.target.value })}
                          placeholder="1234567890:ABCdef..."
                          className="text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVisibleTokens(v => ({ ...v, [selectedAccountId]: !v[selectedAccountId] }))}
                        >
                          {visibleTokens[selectedAccountId] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </Button>
                      </div>
                    </div>

                    {/* Agent binding */}
                    <div className="space-y-2">
                      <Label className="text-xs">Agent Binding</Label>
                      <Select
                        value={config.bindings?.find(b => b.match.channel === "telegram" && b.match.accountId === selectedAccountId)?.agentId ?? ""}
                        onValueChange={v => updateBinding(selectedAccountId, v)}
                      >
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Not bound" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Not bound</SelectItem>
                          {(config.agents?.list ?? []).map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.name ?? a.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Policies */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">DM Policy</Label>
                        <Select
                          value={accounts[selectedAccountId].dmPolicy ?? ""}
                          onValueChange={v => updateAccount(selectedAccountId, { dmPolicy: v as TelegramAccountConfig["dmPolicy"] })}
                        >
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Inherit" /></SelectTrigger>
                          <SelectContent>
                            {DM_POLICIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Group Policy</Label>
                        <Select
                          value={accounts[selectedAccountId].groupPolicy ?? ""}
                          onValueChange={v => updateAccount(selectedAccountId, { groupPolicy: v as TelegramAccountConfig["groupPolicy"] })}
                        >
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Inherit" /></SelectTrigger>
                          <SelectContent>
                            {DM_POLICIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p className="text-sm">Select a bot to view details</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="p-4 overflow-y-auto">
            <div className="max-w-2xl space-y-6">
              {/* Telegram top-level settings */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">Global Settings</h3>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={tg.enabled ?? false}
                    onCheckedChange={v => patchTelegram(config, { enabled: v }, onChange)}
                  />
                  <Label>Enable Telegram</Label>
                </div>
                <div className="space-y-2">
                  <Label>Proxy</Label>
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
                      value={tg.dmPolicy ?? ""}
                      onValueChange={v => patchTelegram(config, { dmPolicy: v as TelegramChannelConfig["dmPolicy"] }, onChange)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                      <SelectContent>
                        {DM_POLICIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Group Policy</Label>
                    <Select
                      value={tg.groupPolicy ?? ""}
                      onValueChange={v => patchTelegram(config, { groupPolicy: v as TelegramChannelConfig["groupPolicy"] }, onChange)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                    <SelectContent>
                      {STREAMING_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Global allowFrom */}
                <div className="space-y-2">
                  <Label>Allow From（Global User IDs）</Label>
                  {needsAllowFrom && (
                    <p className="text-xs text-red-600">
                      When policy is allowlist, you must add at least one user ID
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(tg.allowFrom ?? []).map(uid => (
                      <span
                        key={uid}
                        className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-mono"
                      >
                        {uid}
                        <button
                          type="button"
                          className="text-gray-600 hover:text-red-600"
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
                      placeholder="User ID (e.g., 6292151698)"
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
