import { useState } from "react"
import { Eye, EyeOff, Plus, Trash2, ChevronLeft } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import type { OpenclawConfig, FeishuChannelConfig, FeishuAccountConfig } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
  onBack: () => void
}

const DM_POLICIES = ["pairing", "allowlist", "open", "disabled"] as const
const GROUP_POLICIES = ["open", "allowlist", "disabled"] as const

function patchFeishu(
  config: Partial<OpenclawConfig>,
  patch: Partial<FeishuChannelConfig>,
  onChange: (c: Partial<OpenclawConfig>) => void
) {
  onChange({
    ...config,
    channels: {
      ...config.channels,
      feishu: { ...config.channels?.feishu, ...patch },
    },
  })
}

export default function FeishuDetailPage({ config, onChange, onBack }: Props) {
  const fs = config.channels?.feishu ?? {}
  const accounts = fs.accounts ?? {}
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({})
  const [allowFromInput, setAllowFromInput] = useState("")
  const [groupAllowFromInput, setGroupAllowFromInput] = useState("")

  function updateAccount(id: string, patch: Partial<FeishuAccountConfig>) {
    patchFeishu(config, {
      accounts: { ...accounts, [id]: { ...accounts[id], ...patch } },
    }, onChange)
  }

  function addAccount() {
    const id = `account_${Date.now()}`
    patchFeishu(config, {
      accounts: { ...accounts, [id]: {} },
    }, onChange)
    setSelectedAccountId(id)
  }

  function removeAccount(id: string) {
    const next = { ...accounts }
    delete next[id]
    patchFeishu(config, { accounts: next }, onChange)

    // Auto-select next account or clear selection
    const accountIds = Object.keys(next)
    if (accountIds.length > 0) {
      setSelectedAccountId(accountIds[0])
    } else {
      setSelectedAccountId("")
    }
  }

  function addAllowFrom() {
    const userId = allowFromInput.trim()
    if (!userId) return
    const current = fs.allowFrom ?? []
    if (current.includes(userId)) return
    patchFeishu(config, { allowFrom: [...current, userId] }, onChange)
    setAllowFromInput("")
  }

  function removeAllowFrom(userId: string) {
    const current = fs.allowFrom ?? []
    patchFeishu(config, { allowFrom: current.filter((u: string) => u !== userId) }, onChange)
  }

  function addGroupAllowFrom() {
    const groupId = groupAllowFromInput.trim()
    if (!groupId) return
    const current = fs.groupAllowFrom ?? []
    if (current.includes(groupId)) return
    patchFeishu(config, { groupAllowFrom: [...current, groupId] }, onChange)
    setGroupAllowFromInput("")
  }

  function removeGroupAllowFrom(groupId: string) {
    const current = fs.groupAllowFrom ?? []
    patchFeishu(config, { groupAllowFrom: current.filter((g: string) => g !== groupId) }, onChange)
  }

  const needsAllowFrom = fs.dmPolicy === "allowlist" && (fs.allowFrom ?? []).length === 0

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
            <h2 className="text-lg font-semibold">Feishu</h2>
          </div>
          <button
            onClick={addAccount}
            className="p-2 hover:bg-gray-100 rounded"
            title="Add new account"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Tabs for different sections */}
      <div className="bg-white border-b border-gray-200">
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="justify-start border-0 rounded-none bg-transparent px-6 gap-6 h-12">
            <TabsTrigger value="accounts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
              Accounts
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-3 gap-3 p-4 h-[calc(100%-56px)] overflow-hidden">
              {/* Left sidebar - Account list */}
              <div className="border rounded-lg bg-white overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-3">
                  <p className="text-xs font-semibold text-gray-600">Feishu Accounts</p>
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
                    <p className="text-xs text-gray-500 p-2">No accounts yet</p>
                  )}
                </div>
              </div>

              {/* Right side - Selected account details */}
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

                    {/* App ID */}
                    <div className="space-y-2">
                      <Label className="text-xs">App ID</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={accounts[selectedAccountId].appId ?? ""}
                          onChange={e => updateAccount(selectedAccountId, { appId: e.target.value })}
                          placeholder="cli_xxx"
                          className="text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const text = accounts[selectedAccountId].appId ?? ""
                            navigator.clipboard.writeText(text)
                          }}
                          disabled={!accounts[selectedAccountId].appId}
                        >
                          📋
                        </Button>
                      </div>
                    </div>

                    {/* App Secret */}
                    <div className="space-y-2">
                      <Label className="text-xs">App Secret</Label>
                      <div className="flex gap-2">
                        <Input
                          type={visibleSecrets[selectedAccountId] ? "text" : "password"}
                          value={accounts[selectedAccountId].appSecret ?? ""}
                          onChange={e => updateAccount(selectedAccountId, { appSecret: e.target.value })}
                          placeholder="xxx"
                          className="text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVisibleSecrets(v => ({ ...v, [selectedAccountId]: !v[selectedAccountId] }))}
                        >
                          {visibleSecrets[selectedAccountId] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const text = accounts[selectedAccountId].appSecret ?? ""
                            navigator.clipboard.writeText(text)
                          }}
                          disabled={!accounts[selectedAccountId].appSecret}
                        >
                          📋
                        </Button>
                      </div>
                    </div>

                    {/* Bot Name */}
                    <div className="space-y-2">
                      <Label className="text-xs">Bot Name (Optional)</Label>
                      <Input
                        type="text"
                        value={accounts[selectedAccountId].botName ?? ""}
                        onChange={e => updateAccount(selectedAccountId, { botName: e.target.value })}
                        placeholder="Primary bot"
                        className="text-xs"
                      />
                    </div>

                    {/* Enabled toggle */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <Switch
                        checked={accounts[selectedAccountId].enabled ?? true}
                        onCheckedChange={v => updateAccount(selectedAccountId, { enabled: v })}
                      />
                      <Label className="text-xs">Enabled</Label>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p className="text-sm">Select an account to view details</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="p-4 overflow-y-auto">
            <div className="max-w-2xl space-y-6">
              {/* Basic Settings */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">Basic Settings</h3>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={fs.enabled ?? false}
                    onCheckedChange={v => patchFeishu(config, { enabled: v }, onChange)}
                  />
                  <Label>Enable Feishu</Label>
                </div>
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Select
                    value={fs.domain ?? "feishu"}
                    onValueChange={v => patchFeishu(config, { domain: v as "feishu" | "lark" }, onChange)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feishu">feishu</SelectItem>
                      <SelectItem value="lark">lark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Account</Label>
                  <Select
                    value={fs.defaultAccount ?? ""}
                    onValueChange={v => patchFeishu(config, { defaultAccount: v }, onChange)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(accounts).map(id => (
                        <SelectItem key={id} value={id}>{id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* DM Policy */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">DM Policy</h3>
                <div className="space-y-2">
                  <Label>Policy</Label>
                  <Select
                    value={fs.dmPolicy ?? "pairing"}
                    onValueChange={v => patchFeishu(config, { dmPolicy: v as any }, onChange)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DM_POLICIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {fs.dmPolicy !== "disabled" && (
                  <div className="space-y-2">
                    <Label>Allow From (Open IDs)</Label>
                    {needsAllowFrom && <p className="text-xs text-red-600">Allowlist policy requires at least one user</p>}
                    <div className="flex flex-wrap gap-1">
                      {(fs.allowFrom ?? []).map(uid => (
                        <span key={uid} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">
                          {uid}
                          <button type="button" className="text-gray-600 hover:text-red-600" onClick={() => removeAllowFrom(uid)}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        className="h-8 text-xs"
                        value={allowFromInput}
                        onChange={e => setAllowFromInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addAllowFrom()}
                        onBlur={addAllowFrom}
                        placeholder="ou_user123"
                      />
                      <Button variant="outline" size="sm" className="h-8 px-3 shrink-0" onClick={addAllowFrom} disabled={!allowFromInput.trim()}>
                        <Plus size={12} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Group Policy */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">Group Policy</h3>
                <div className="space-y-2">
                  <Label>Policy</Label>
                  <Select
                    value={fs.groupPolicy ?? "open"}
                    onValueChange={v => patchFeishu(config, { groupPolicy: v as any }, onChange)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROUP_POLICIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {fs.groupPolicy === "allowlist" && (
                  <div className="space-y-2">
                    <Label>Allow From (Group IDs)</Label>
                    <div className="flex flex-wrap gap-1">
                      {(fs.groupAllowFrom ?? []).map(gid => (
                        <span key={gid} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">
                          {gid}
                          <button type="button" className="text-gray-600 hover:text-red-600" onClick={() => removeGroupAllowFrom(gid)}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        className="h-8 text-xs"
                        value={groupAllowFromInput}
                        onChange={e => setGroupAllowFromInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addGroupAllowFrom()}
                        onBlur={addGroupAllowFrom}
                        placeholder="oc_group123"
                      />
                      <Button variant="outline" size="sm" className="h-8 px-3 shrink-0" onClick={addGroupAllowFrom} disabled={!groupAllowFromInput.trim()}>
                        <Plus size={12} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quota Optimization */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">Quota Optimization</h3>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={fs.typingIndicator ?? true}
                    onCheckedChange={v => patchFeishu(config, { typingIndicator: v }, onChange)}
                  />
                  <Label className="text-xs">Typing Indicator</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={fs.resolveSenderNames ?? true}
                    onCheckedChange={v => patchFeishu(config, { resolveSenderNames: v }, onChange)}
                  />
                  <Label className="text-xs">Resolve Sender Names</Label>
                </div>
              </div>

              {/* Streaming */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">Streaming</h3>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={fs.streaming ?? true}
                    onCheckedChange={v => patchFeishu(config, { streaming: v }, onChange)}
                  />
                  <Label>Streaming</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={fs.blockStreaming ?? true}
                    onCheckedChange={v => patchFeishu(config, { blockStreaming: v }, onChange)}
                  />
                  <Label>Block Streaming</Label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
