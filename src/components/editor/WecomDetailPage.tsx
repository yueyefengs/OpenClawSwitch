import { useState } from "react"
import { ChevronLeft, Eye, EyeOff, Plus } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import type { OpenclawConfig, WecomChannelConfig } from "../../types"
import ToggleCard from "./ToggleCard"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
  onBack: () => void
}

const DM_POLICIES = ["pairing", "allowlist", "open", "disabled"] as const
const GROUP_POLICIES = ["open", "allowlist", "disabled"] as const

function patchWecom(
  config: Partial<OpenclawConfig>,
  patch: Partial<WecomChannelConfig>,
  onChange: (c: Partial<OpenclawConfig>) => void
) {
  onChange({
    ...config,
    channels: {
      ...config.channels,
      wecom: { ...config.channels?.wecom, ...patch },
    },
  })
}

export default function WecomDetailPage({ config, onChange, onBack }: Props) {
  const wc = config.channels?.wecom ?? {}
  const [visibleSecret, setVisibleSecret] = useState(false)
  const [visibleAes, setVisibleAes] = useState(false)
  const [allowFromInput, setAllowFromInput] = useState("")
  const [groupAllowFromInput, setGroupAllowFromInput] = useState("")

  function addAllowFrom() {
    const userId = allowFromInput.trim()
    if (!userId) return
    const current = wc.allowFrom ?? []
    if (current.includes(userId)) return
    patchWecom(config, { allowFrom: [...current, userId] }, onChange)
    setAllowFromInput("")
  }

  function removeAllowFrom(userId: string) {
    patchWecom(config, {
      allowFrom: (wc.allowFrom ?? []).filter(id => id !== userId),
    }, onChange)
  }

  function addGroupAllowFrom() {
    const groupId = groupAllowFromInput.trim()
    if (!groupId) return
    const current = wc.groupAllowFrom ?? []
    if (current.includes(groupId)) return
    patchWecom(config, { groupAllowFrom: [...current, groupId] }, onChange)
    setGroupAllowFromInput("")
  }

  function removeGroupAllowFrom(groupId: string) {
    patchWecom(config, {
      groupAllowFrom: (wc.groupAllowFrom ?? []).filter(id => id !== groupId),
    }, onChange)
  }

  const needsAllowFrom = wc.dmPolicy === "allowlist" && (wc.allowFrom ?? []).length === 0
  const needsGroupAllowFrom =
    wc.groupPolicy === "allowlist" && (wc.groupAllowFrom ?? []).length === 0

  return (
    <div className="flex h-full flex-col bg-gray-100">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="rounded p-1 hover:bg-gray-100">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold">企业微信应用</h2>
          </div>
          <ToggleCard
            checked={wc.enabled ?? false}
            onCheckedChange={v => patchWecom(config, { enabled: v }, onChange)}
            title="企业微信频道"
            description="启用后会接收企业微信应用消息"
            className="min-w-[220px]"
          />
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white">
        <Tabs defaultValue="credentials" className="w-full">
          <TabsList className="h-12 justify-start gap-6 rounded-none border-0 bg-transparent px-6">
            <TabsTrigger
              value="credentials"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
            >
              凭证
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
            >
              设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="credentials" className="overflow-y-auto p-4">
            <div className="max-w-2xl space-y-6">
              <div className="space-y-4 rounded-lg border bg-white p-4">
                <h3 className="text-sm font-medium">核心凭证</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>企业 ID</Label>
                    <Input
                      value={wc.corpId ?? ""}
                      onChange={e => patchWecom(config, { corpId: e.target.value }, onChange)}
                      placeholder="wwxxxxxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>应用 ID</Label>
                    <Input
                      value={wc.agentId ?? ""}
                      onChange={e => patchWecom(config, { agentId: e.target.value }, onChange)}
                      placeholder="1000002"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>应用密钥</Label>
                  <div className="flex gap-2">
                    <Input
                      type={visibleSecret ? "text" : "password"}
                      value={wc.secret ?? ""}
                      onChange={e => patchWecom(config, { secret: e.target.value }, onChange)}
                      placeholder="应用 Secret"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleSecret(v => !v)}
                    >
                      {visibleSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border bg-white p-4">
                <h3 className="text-sm font-medium">回调凭证</h3>
                <div className="space-y-2">
                  <Label>回调 Token</Label>
                  <Input
                    value={wc.token ?? ""}
                    onChange={e => patchWecom(config, { token: e.target.value }, onChange)}
                    placeholder="回调 Token"
                  />
                </div>

                <div className="space-y-2">
                  <Label>消息加密键</Label>
                  <div className="flex gap-2">
                    <Input
                      type={visibleAes ? "text" : "password"}
                      value={wc.encodingAESKey ?? ""}
                      onChange={e =>
                        patchWecom(config, { encodingAESKey: e.target.value }, onChange)
                      }
                      placeholder="43 位 EncodingAESKey"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleAes(v => !v)}
                    >
                      {visibleAes ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="overflow-y-auto p-4">
            <div className="max-w-2xl space-y-6">
              <div className="space-y-4 rounded-lg border bg-white p-4">
                <h3 className="text-sm font-medium">私聊策略</h3>
                <div className="space-y-2">
                  <Label>策略</Label>
                  <Select
                    value={wc.dmPolicy ?? "pairing"}
                    onValueChange={v =>
                      patchWecom(config, { dmPolicy: v as WecomChannelConfig["dmPolicy"] }, onChange)
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DM_POLICIES.map(policy => (
                        <SelectItem key={policy} value={policy}>
                          {policy}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {wc.dmPolicy !== "disabled" && (
                  <div className="space-y-2">
                    <Label>允许用户列表</Label>
                    {needsAllowFrom && (
                      <p className="text-xs text-red-600">
                        白名单模式至少需要一个用户
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(wc.allowFrom ?? []).map(userId => (
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
                        placeholder="企业微信 userId"
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

              <div className="space-y-4 rounded-lg border bg-white p-4">
                <h3 className="text-sm font-medium">群聊策略</h3>
                <div className="space-y-2">
                  <Label>策略</Label>
                  <Select
                    value={wc.groupPolicy ?? "open"}
                    onValueChange={v =>
                      patchWecom(config, { groupPolicy: v as WecomChannelConfig["groupPolicy"] }, onChange)
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROUP_POLICIES.map(policy => (
                        <SelectItem key={policy} value={policy}>
                          {policy}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ToggleCard
                  checked={wc.requireMention ?? true}
                  onCheckedChange={v => patchWecom(config, { requireMention: v }, onChange)}
                  title="群聊需要 @ 提及"
                  description="关闭后机器人会响应群聊中的普通消息"
                />

                {wc.groupPolicy === "allowlist" && (
                  <div className="space-y-2">
                    <Label>允许群组列表</Label>
                    {needsGroupAllowFrom && (
                      <p className="text-xs text-red-600">
                        白名单模式至少需要一个群组
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(wc.groupAllowFrom ?? []).map(groupId => (
                        <span
                          key={groupId}
                          className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-mono"
                        >
                          {groupId}
                          <button
                            type="button"
                            className="text-gray-600 hover:text-red-600"
                            onClick={() => removeGroupAllowFrom(groupId)}
                          >
                            ×
                          </button>
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
                        placeholder="企业微信群会话 ID"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 px-3"
                        onClick={addGroupAllowFrom}
                        disabled={!groupAllowFromInput.trim()}
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
