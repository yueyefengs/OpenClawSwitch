import { useEffect, useState } from "react"
import { ChevronLeft, Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import type { DiscordAccountConfig, DiscordChannelConfig, OpenclawConfig } from "../../types"
import ToggleCard from "./ToggleCard"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
  onBack: () => void
}

const DM_POLICIES = ["pairing", "allowlist", "open", "disabled"] as const
const GROUP_POLICIES = ["open", "allowlist", "disabled"] as const

function patchDiscord(
  config: Partial<OpenclawConfig>,
  patch: Partial<DiscordChannelConfig>,
  onChange: (c: Partial<OpenclawConfig>) => void
) {
  onChange({
    ...config,
    channels: {
      ...config.channels,
      discord: { ...config.channels?.discord, ...patch },
    },
  })
}

export default function DiscordDetailPage({ config, onChange, onBack }: Props) {
  const dc = config.channels?.discord ?? {}
  const accounts = dc.accounts ?? {}
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [visibleTokens, setVisibleTokens] = useState<Record<string, boolean>>({})
  const [allowFromInput, setAllowFromInput] = useState("")
  const [guildAllowFromInput, setGuildAllowFromInput] = useState("")

  useEffect(() => {
    if (selectedAccountId && accounts[selectedAccountId]) return
    const firstAccountId = Object.keys(accounts)[0] ?? ""
    if (firstAccountId !== selectedAccountId) {
      setSelectedAccountId(firstAccountId)
    }
  }, [accounts, selectedAccountId])

  function updateAccount(id: string, patch: Partial<DiscordAccountConfig>) {
    patchDiscord(config, {
      accounts: { ...accounts, [id]: { ...accounts[id], ...patch } },
    }, onChange)
  }

  function addAccount() {
    const id = `account_${Date.now()}`
    patchDiscord(config, {
      accounts: { ...accounts, [id]: { token: "" } },
    }, onChange)
    setSelectedAccountId(id)
  }

  function removeAccount(id: string) {
    const next = { ...accounts }
    delete next[id]
    patchDiscord(config, { accounts: next }, onChange)

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
    const current = dc.allowFrom ?? []
    if (current.includes(userId)) return
    patchDiscord(config, { allowFrom: [...current, userId] }, onChange)
    setAllowFromInput("")
  }

  function removeAllowFrom(userId: string) {
    const current = dc.allowFrom ?? []
    patchDiscord(config, { allowFrom: current.filter(u => u !== userId) }, onChange)
  }

  function addGuildAllowFrom() {
    const guildId = guildAllowFromInput.trim()
    if (!guildId) return
    const current = dc.allowFromGuilds ?? []
    if (current.includes(guildId)) return
    patchDiscord(config, { allowFromGuilds: [...current, guildId] }, onChange)
    setGuildAllowFromInput("")
  }

  function removeGuildAllowFrom(guildId: string) {
    const current = dc.allowFromGuilds ?? []
    patchDiscord(config, { allowFromGuilds: current.filter(g => g !== guildId) }, onChange)
  }

  function updateDmPolicy(policy: DiscordChannelConfig["dmPolicy"]) {
    const patch: Partial<DiscordChannelConfig> = { dmPolicy: policy }
    if (policy === "open" && !(dc.allowFrom ?? []).includes("*")) {
      patch.allowFrom = ["*", ...(dc.allowFrom ?? [])]
    }
    patchDiscord(config, patch, onChange)
  }

  function enableOpenDmAccess() {
    const next = ["*", ...(dc.allowFrom ?? []).filter(userId => userId !== "*")]
    patchDiscord(config, { dmPolicy: "open", allowFrom: next }, onChange)
  }

  function disableOpenDmAccess() {
    const next = (dc.allowFrom ?? []).filter(userId => userId !== "*")
    patchDiscord(config, { allowFrom: next }, onChange)
  }

  const needsAllowFrom = dc.dmPolicy === "allowlist" && (dc.allowFrom ?? []).length === 0
  const needsOpenWildcard = dc.dmPolicy === "open" && !(dc.allowFrom ?? []).includes("*")
  const needsGuildAllowFrom =
    dc.groupPolicy === "allowlist" && (dc.allowFromGuilds ?? []).length === 0

  return (
    <div className="flex h-full flex-col bg-gray-100">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="rounded p-1 hover:bg-gray-100">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold">Discord 机器人</h2>
          </div>
          <div className="flex items-center gap-2">
            <ToggleCard
              checked={dc.enabled ?? false}
              onCheckedChange={v => patchDiscord(config, { enabled: v }, onChange)}
              title="Discord 频道"
              description="启用后会接收 Discord 私聊和服务器消息"
              className="min-w-[220px]"
            />
            <button
              onClick={addAccount}
              className="rounded p-2 hover:bg-gray-100"
              title="新增机器人"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white">
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="h-12 justify-start gap-6 rounded-none border-0 bg-transparent px-6">
            <TabsTrigger
              value="accounts"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
            >
              账号
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
            >
              设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="flex-1 overflow-hidden">
            <div className="grid h-[calc(100%-56px)] grid-cols-3 gap-3 overflow-hidden p-4">
              <div className="overflow-y-auto rounded-lg border bg-white">
                <div className="sticky top-0 border-b bg-white p-3">
                  <p className="text-xs font-semibold text-gray-600">Discord 机器人列表</p>
                </div>
                <div className="space-y-1 p-2">
                  {Object.entries(accounts).map(([id, _account]) => {
                    const displayName = id
                    const avatarText = displayName.charAt(0).toUpperCase()

                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedAccountId(id)}
                        className={`w-full rounded p-2 text-left text-sm transition-colors ${
                          selectedAccountId === id
                            ? "border border-blue-200 bg-blue-50 text-blue-700"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                            {avatarText}
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {displayName}
                            </p>
                            <p className="truncate text-xs font-mono text-gray-500">{id}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                  {Object.keys(accounts).length === 0 && (
                    <p className="p-2 text-xs text-gray-500">还没有机器人</p>
                  )}
                </div>
              </div>

              <div className="col-span-2 overflow-y-auto rounded-lg border bg-white">
                {selectedAccountId && accounts[selectedAccountId] ? (
                  <div className="space-y-4 p-4">
                    <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <h3 className="font-semibold">
                          {selectedAccountId}
                        </h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAccount(selectedAccountId)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">机器人令牌</Label>
                      <div className="flex gap-2">
                        <Input
                          type={visibleTokens[selectedAccountId] ? "text" : "password"}
                          value={accounts[selectedAccountId].token ?? ""}
                          onChange={e =>
                            updateAccount(selectedAccountId, { token: e.target.value })
                          }
                          placeholder="MTIzNDU2Nzg5MA.GhIjKl.mnoPqRsTuVwXyZ..."
                          className="text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setVisibleTokens(v => ({
                              ...v,
                              [selectedAccountId]: !v[selectedAccountId],
                            }))
                          }
                        >
                          {visibleTokens[selectedAccountId] ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const text = accounts[selectedAccountId].token ?? ""
                            navigator.clipboard.writeText(text)
                          }}
                          disabled={!accounts[selectedAccountId].token}
                        >
                          📋
                        </Button>
                      </div>
                    </div>

                    <ToggleCard
                      checked={accounts[selectedAccountId].enabled ?? true}
                      onCheckedChange={v => updateAccount(selectedAccountId, { enabled: v })}
                      title="当前 Discord 账号"
                      description="关闭后仅停用这个机器人账号"
                      checkedLabel="账号已启用"
                      uncheckedLabel="账号未启用"
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-500">
                    <p className="text-sm">请选择一个机器人查看详情</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="overflow-y-auto p-4">
            <div className="max-w-2xl space-y-6">
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-medium">基础设置</h3>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-medium">私聊策略</h3>
                <div className="space-y-2">
                  <Label>策略</Label>
                  <Select
                    value={dc.dmPolicy ?? "pairing"}
                    onValueChange={v => updateDmPolicy(v as DiscordChannelConfig["dmPolicy"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DM_POLICIES.map(p => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {dc.dmPolicy !== "disabled" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>允许用户列表</Label>
                      <Button
                        variant={(dc.allowFrom ?? []).includes("*") ? "default" : "outline"}
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={() =>
                          (dc.allowFrom ?? []).includes("*")
                            ? disableOpenDmAccess()
                            : enableOpenDmAccess()
                        }
                      >
                        允许所有用户 (*)
                      </Button>
                    </div>
                    {dc.dmPolicy === "open" && (
                      <p className="text-xs text-gray-500">
                        Discord 的私聊开放模式要求允许列表里包含 <code>*</code>。点击右侧按钮可一键设置。
                      </p>
                    )}
                    {needsAllowFrom && (
                      <p className="text-xs text-red-600">
                        白名单模式至少需要一个用户
                      </p>
                    )}
                    {needsOpenWildcard && (
                      <p className="text-xs text-red-600">
                        open 模式必须包含 <code>*</code>，否则 OpenClaw 会拒绝启动 Discord 渠道。
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(dc.allowFrom ?? []).map(userId => (
                        <span
                          key={userId}
                          className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-mono"
                        >
                          {userId}
                          <button
                            type="button"
                            className="text-gray-600 hover:text-red-600"
                            onClick={() => removeAllowFrom(userId)}
                          >
                            ×
                          </button>
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
                        placeholder='Discord user ID or "*"'
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 px-3"
                        onClick={addAllowFrom}
                        disabled={!allowFromInput.trim()}
                      >
                        <Plus size={12} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-medium">服务器策略</h3>
                <div className="space-y-2">
                  <Label>策略</Label>
                  <Select
                    value={dc.groupPolicy ?? "open"}
                    onValueChange={v =>
                      patchDiscord(config, { groupPolicy: v as DiscordChannelConfig["groupPolicy"] }, onChange)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_POLICIES.map(p => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {dc.groupPolicy === "open" && (
                    <p className="text-xs text-gray-500">
                      当前已开放所有服务器消息。若只想让指定服务器可用，请切换到 <code>allowlist</code> 并填入服务器 ID。
                    </p>
                  )}
                </div>

                {dc.groupPolicy === "allowlist" && (
                  <div className="space-y-2">
                    <Label>允许服务器列表</Label>
                    {needsGuildAllowFrom && (
                      <p className="text-xs text-red-600">
                        白名单模式至少需要一个服务器
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(dc.allowFromGuilds ?? []).map(guildId => (
                        <span
                          key={guildId}
                          className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-mono"
                        >
                          {guildId}
                          <button
                            type="button"
                            className="text-gray-600 hover:text-red-600"
                            onClick={() => removeGuildAllowFrom(guildId)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        className="h-8 text-xs"
                        value={guildAllowFromInput}
                        onChange={e => setGuildAllowFromInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addGuildAllowFrom()}
                        onBlur={addGuildAllowFrom}
                        placeholder="Discord guild ID"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 px-3"
                        onClick={addGuildAllowFrom}
                        disabled={!guildAllowFromInput.trim()}
                      >
                        <Plus size={12} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
