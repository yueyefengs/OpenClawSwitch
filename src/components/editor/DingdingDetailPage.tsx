import { useState } from "react"
import { ChevronLeft, Eye, EyeOff, Plus } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import type { DingdingChannelConfig, OpenclawConfig } from "../../types"
import ToggleCard from "./ToggleCard"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
  onBack: () => void
}

const DM_POLICIES = ["pairing", "allowlist", "open", "disabled"] as const
const GROUP_POLICIES = ["open", "allowlist", "disabled"] as const
const MESSAGE_TYPES = ["markdown", "card"] as const

function patchDingding(
  config: Partial<OpenclawConfig>,
  patch: Partial<DingdingChannelConfig>,
  onChange: (c: Partial<OpenclawConfig>) => void
) {
  onChange({
    ...config,
    channels: {
      ...config.channels,
      dingding: { ...config.channels?.dingding, ...patch },
    },
  })
}

export default function DingdingDetailPage({ config, onChange, onBack }: Props) {
  const dd = config.channels?.dingding ?? {}
  const [visibleSecret, setVisibleSecret] = useState(false)
  const [allowFromInput, setAllowFromInput] = useState("")
  const [groupAllowFromInput, setGroupAllowFromInput] = useState("")

  function addAllowFrom() {
    const userId = allowFromInput.trim()
    if (!userId) return
    const current = dd.allowFrom ?? []
    if (current.includes(userId)) return
    patchDingding(config, { allowFrom: [...current, userId] }, onChange)
    setAllowFromInput("")
  }

  function removeAllowFrom(userId: string) {
    patchDingding(config, {
      allowFrom: (dd.allowFrom ?? []).filter(id => id !== userId),
    }, onChange)
  }

  function addGroupAllowFrom() {
    const groupId = groupAllowFromInput.trim()
    if (!groupId) return
    const current = dd.groupAllowFrom ?? []
    if (current.includes(groupId)) return
    patchDingding(config, { groupAllowFrom: [...current, groupId] }, onChange)
    setGroupAllowFromInput("")
  }

  function removeGroupAllowFrom(groupId: string) {
    patchDingding(config, {
      groupAllowFrom: (dd.groupAllowFrom ?? []).filter(id => id !== groupId),
    }, onChange)
  }

  const needsAllowFrom = dd.dmPolicy === "allowlist" && (dd.allowFrom ?? []).length === 0
  const needsGroupAllowFrom =
    dd.groupPolicy === "allowlist" && (dd.groupAllowFrom ?? []).length === 0

  return (
    <div className="flex h-full flex-col bg-gray-100">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="rounded p-1 hover:bg-gray-100">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold">钉钉机器人</h2>
          </div>
          <ToggleCard
            checked={dd.enabled ?? false}
            onCheckedChange={v => patchDingding(config, { enabled: v }, onChange)}
            title="钉钉频道"
            description="启用后会接收钉钉私聊和群聊消息"
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
                <h3 className="text-sm font-medium">应用凭证</h3>
                <div className="space-y-2">
                  <Label>客户端 ID</Label>
                  <Input
                    value={dd.clientId ?? ""}
                    onChange={e => patchDingding(config, { clientId: e.target.value }, onChange)}
                    placeholder="dingxxxxxx"
                  />
                </div>

                <div className="space-y-2">
                  <Label>客户端密钥</Label>
                  <div className="flex gap-2">
                    <Input
                      type={visibleSecret ? "text" : "password"}
                      value={dd.clientSecret ?? ""}
                      onChange={e => patchDingding(config, { clientSecret: e.target.value }, onChange)}
                      placeholder="App Secret"
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

                <div className="space-y-2">
                  <Label>机器人编码</Label>
                  <Input
                    value={dd.robotCode ?? ""}
                    onChange={e => patchDingding(config, { robotCode: e.target.value }, onChange)}
                    placeholder="dingxxxxxx"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border bg-white p-4">
                <h3 className="text-sm font-medium">可选运行参数</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>企业 ID</Label>
                    <Input
                      value={dd.corpId ?? ""}
                      onChange={e => patchDingding(config, { corpId: e.target.value }, onChange)}
                      placeholder="dingcorp..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>应用 ID</Label>
                    <Input
                      value={dd.agentId ?? ""}
                      onChange={e => patchDingding(config, { agentId: e.target.value }, onChange)}
                      placeholder="123456789"
                    />
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
                    value={dd.dmPolicy ?? "open"}
                    onValueChange={v =>
                      patchDingding(config, { dmPolicy: v as DingdingChannelConfig["dmPolicy"] }, onChange)
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DM_POLICIES.map(p => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {dd.dmPolicy !== "disabled" && (
                  <div className="space-y-2">
                    <Label>允许用户列表</Label>
                    {needsAllowFrom && (
                      <p className="text-xs text-red-600">
                        白名单模式至少需要一个用户
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(dd.allowFrom ?? []).map(userId => (
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
                        placeholder="钉钉 userId"
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
                    value={dd.groupPolicy ?? "open"}
                    onValueChange={v =>
                      patchDingding(config, { groupPolicy: v as DingdingChannelConfig["groupPolicy"] }, onChange)
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROUP_POLICIES.map(p => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ToggleCard
                  checked={dd.requireMention ?? true}
                  onCheckedChange={v => patchDingding(config, { requireMention: v }, onChange)}
                  title="群聊需要 @ 提及"
                  description="关闭后机器人会响应群内普通消息"
                />

                {dd.groupPolicy === "allowlist" && (
                  <div className="space-y-2">
                    <Label>允许群组列表</Label>
                    {needsGroupAllowFrom && (
                      <p className="text-xs text-red-600">
                        白名单模式至少需要一个群组
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(dd.groupAllowFrom ?? []).map(groupId => (
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
                        placeholder="钉钉 openConversationId"
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

              <div className="space-y-4 rounded-lg border bg-white p-4">
                <h3 className="text-sm font-medium">消息渲染</h3>
                <div className="space-y-2">
                  <Label>消息类型</Label>
                  <Select
                    value={dd.messageType ?? "markdown"}
                    onValueChange={v =>
                      patchDingding(config, { messageType: v as DingdingChannelConfig["messageType"] }, onChange)
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESSAGE_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {dd.messageType === "card" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>卡片模板 ID</Label>
                      <Input
                        value={dd.cardTemplateId ?? ""}
                        onChange={e =>
                          patchDingding(config, { cardTemplateId: e.target.value }, onChange)
                        }
                        placeholder="模板 ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>卡片模板键</Label>
                      <Input
                        value={dd.cardTemplateKey ?? ""}
                        onChange={e =>
                          patchDingding(config, { cardTemplateKey: e.target.value }, onChange)
                        }
                        placeholder="content"
                      />
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
