import { useState } from "react"
import { Eye, EyeOff, Plus, Trash2, ChevronLeft } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import type { OpenclawConfig, FeishuChannelConfig, FeishuAccountConfig } from "../../types"
import ToggleCard from "./ToggleCard"

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold">飞书机器人</h2>
          </div>
          <div className="flex items-center gap-2">
            <ToggleCard
              checked={fs.enabled ?? false}
              onCheckedChange={v => patchFeishu(config, { enabled: v }, onChange)}
              title="飞书频道"
              description="启用后会接收飞书或 Lark 消息"
              className="min-w-[220px]"
            />
            <button
              onClick={addAccount}
              className="p-2 hover:bg-gray-100 rounded"
              title="新增账号"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs for different sections */}
      <div className="bg-white border-b border-gray-200">
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="justify-start border-0 rounded-none bg-transparent px-6 gap-6 h-12">
            <TabsTrigger value="accounts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
              账号
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
              设置
            </TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-3 gap-3 p-4 h-[calc(100%-56px)] overflow-hidden">
              {/* Left sidebar - Account list */}
              <div className="border rounded-lg bg-white overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-3">
                  <p className="text-xs font-semibold text-gray-600">飞书账号列表</p>
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
                    <p className="p-2 text-xs text-gray-500">还没有账号</p>
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
                      <Label className="text-xs">应用 ID</Label>
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
                      <Label className="text-xs">应用密钥</Label>
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

                    {/* Enabled toggle */}
                    <ToggleCard
                      checked={accounts[selectedAccountId].enabled ?? true}
                      onCheckedChange={v => updateAccount(selectedAccountId, { enabled: v })}
                      title="当前飞书账号"
                      description="关闭后仅停用这个账号，不影响其他账号"
                      checkedLabel="账号已启用"
                      uncheckedLabel="账号未启用"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p className="text-sm">请选择一个账号查看详情</p>
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
                <h3 className="font-medium text-sm">基础设置</h3>
                <div className="space-y-2">
                  <Label>服务域名</Label>
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
                  <Label>默认账号</Label>
                  <Select
                    value={fs.defaultAccount ?? ""}
                    onValueChange={v => patchFeishu(config, { defaultAccount: v }, onChange)}
                  >
                    <SelectTrigger><SelectValue placeholder="选择账号" /></SelectTrigger>
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
                <h3 className="font-medium text-sm">私聊策略</h3>
                <div className="space-y-2">
                  <Label>策略</Label>
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
                    <Label>允许用户列表（Open ID）</Label>
                    {needsAllowFrom && <p className="text-xs text-red-600">白名单模式至少需要一个用户</p>}
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
                <h3 className="font-medium text-sm">群聊策略</h3>
                <div className="space-y-2">
                  <Label>策略</Label>
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
                    <Label>允许群组列表</Label>
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
                <h3 className="font-medium text-sm">额度优化</h3>
                <ToggleCard
                  checked={fs.typingIndicator ?? true}
                  onCheckedChange={v => patchFeishu(config, { typingIndicator: v }, onChange)}
                  title="输入中提示"
                  description="机器人回复前展示正在输入状态"
                />
                <ToggleCard
                  checked={fs.resolveSenderNames ?? true}
                  onCheckedChange={v => patchFeishu(config, { resolveSenderNames: v }, onChange)}
                  title="解析发送者名称"
                  description="优先展示成员名称而不是原始 ID"
                />
              </div>

              {/* Streaming */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">流式输出</h3>
                <ToggleCard
                  checked={fs.streaming ?? true}
                  onCheckedChange={v => patchFeishu(config, { streaming: v }, onChange)}
                  title="启用流式输出"
                  description="模型生成时实时推送回复内容"
                />
                <ToggleCard
                  checked={fs.blockStreaming ?? true}
                  onCheckedChange={v => patchFeishu(config, { blockStreaming: v }, onChange)}
                  title="分块流式输出"
                  description="将流式内容按块发送，减少消息碎片"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
