import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, Play } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Input } from "../ui/input"
import { profileApi } from "../../lib/api/profile"
import { queryKeys } from "../../lib/query"
import ProvidersTab from "./ProvidersTab"
import ChannelsTab from "./ChannelsTab"
import GatewayTab from "./GatewayTab"
import AgentsTab from "./AgentsTab"
import type { OpenclawConfig } from "../../types"
import { toast } from "sonner"

interface Props {
  profileId: string
  onBack: () => void
}

/** Ensure every provider has `models: []` and every model has `name` set. */
function normalizeConfig(config: Partial<OpenclawConfig>): Partial<OpenclawConfig> {
  const providers = config.models?.providers
  if (!providers) return config
  const normalizedProviders = Object.fromEntries(
    Object.entries(providers).map(([name, prov]) => {
      const models = (prov.models ?? []).map(m => ({
        ...m,
        name: m.name ?? m.id,
      }))
      return [name, { ...prov, models }]
    })
  )
  return {
    ...config,
    models: { ...config.models, providers: normalizedProviders },
  }
}

/** Return a list of human-readable validation errors, or empty array if valid. */
function validateConfig(config: Partial<OpenclawConfig>): string[] {
  const errors: string[] = []
  const tg = config.channels?.telegram
  if (!tg) return errors
  const globalAllowFrom = tg.allowFrom ?? []
  if (tg.dmPolicy === "allowlist" && globalAllowFrom.length === 0) {
    errors.push("Telegram 全局 dmPolicy=allowlist 时需至少填一个 Allow From 用户 ID")
  }
  if (tg.groupPolicy === "allowlist" && globalAllowFrom.length === 0) {
    errors.push("Telegram 全局 groupPolicy=allowlist 时需至少填一个 Allow From 用户 ID")
  }
  for (const [id, acc] of Object.entries(tg.accounts ?? {})) {
    if (acc.dmPolicy === "allowlist" && globalAllowFrom.length === 0) {
      errors.push(`Telegram 账号 ${id}：dmPolicy=allowlist 时需在全局 Allow From 中填至少一个用户 ID`)
    }
    if (acc.groupPolicy === "allowlist" && globalAllowFrom.length === 0) {
      errors.push(`Telegram 账号 ${id}：groupPolicy=allowlist 时需在全局 Allow From 中填至少一个用户 ID`)
    }
  }
  return errors
}

export default function ProfileEditor({ profileId, onBack }: Props) {
  const qc = useQueryClient()

  const { data: config, isLoading } = useQuery({
    queryKey: queryKeys.profileConfig(profileId),
    queryFn: () => profileApi.getConfig(profileId),
  })

  const { data: profiles = [] } = useQuery({
    queryKey: queryKeys.profiles,
    queryFn: profileApi.list,
  })
  const currentProfile = profiles.find(p => p.id === profileId)

  const [draft, setDraft] = useState<Partial<OpenclawConfig>>({})
  useEffect(() => {
    if (config) setDraft(config)
  }, [config])

  const [nameInput, setNameInput] = useState("")
  useEffect(() => {
    if (currentProfile) setNameInput(currentProfile.name)
  }, [currentProfile?.name])

  const rename = useMutation({
    mutationFn: (name: string) => profileApi.rename(profileId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles }),
    onError: (e) => toast.error(`重命名失败: ${e}`),
  })

  const save = useMutation({
    mutationFn: () => profileApi.saveAndRestart(profileId, normalizeConfig(draft) as OpenclawConfig),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profileConfig(profileId) })
      toast.success("配置已保存，Gateway 已重启")
    },
    onError: (e) => {
      qc.invalidateQueries({ queryKey: queryKeys.profileConfig(profileId) })
      toast.error(`${e}`)
    },
  })

  const activate = useMutation({
    mutationFn: () => profileApi.activate(profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profiles })
      toast.success(`已激活 "${currentProfile?.name}"`)
    },
    onError: (e) => toast.error(`激活失败: ${e}`),
  })

  function handleSave(): boolean {
    const errors = validateConfig(draft)
    if (errors.length > 0) {
      errors.forEach(msg => toast.error(msg))
      return false
    }
    save.mutate()
    return true
  }

  const handleActivate = async () => {
    const errors = validateConfig(draft)
    if (errors.length > 0) {
      errors.forEach(msg => toast.error(msg))
      return
    }
    await save.mutateAsync()
    activate.mutate()
  }

  const isBusy = save.isPending || activate.isPending

  if (isLoading) return <div className="p-6 text-[#9CA3AF] text-sm">加载中...</div>

  return (
    <div className="flex flex-col h-full bg-[#F5F7FA]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[52px] bg-white border-b border-[#EAECF0] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <Input
            className="h-8 text-[13px] font-semibold w-40 border-transparent bg-transparent shadow-none focus-visible:border-[#E5E7EB] focus-visible:bg-white focus-visible:shadow-sm text-[#111827]"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={() => {
              const trimmed = nameInput.trim()
              if (trimmed && trimmed !== currentProfile?.name) {
                rename.mutate(trimmed)
              } else {
                setNameInput(currentProfile?.name ?? "")
              }
            }}
            onKeyDown={e => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
              if (e.key === "Escape") {
                setNameInput(currentProfile?.name ?? "")
                ;(e.target as HTMLInputElement).blur()
              }
            }}
          />
          {currentProfile?.is_active && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />
              激活中
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isBusy}
            className="rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#374151] text-[12px] font-medium px-3 h-7 transition-colors disabled:opacity-50"
          >
            {save.isPending ? "保存中…" : "保存"}
          </button>
          {!currentProfile?.is_active && (
            <button
              onClick={handleActivate}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-lg bg-[#4F63FF] hover:bg-[#3D50E0] text-white text-[12px] font-semibold px-3 h-7 transition-colors disabled:opacity-50"
            >
              <Play size={10} strokeWidth={2.5} />
              激活
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="providers" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 bg-white border-b border-[#EAECF0] flex justify-center px-4 py-2">
          <TabsList className="h-8 rounded-lg bg-[#F3F4F6] p-0.5 gap-0.5">
            {(["providers", "channels", "gateway", "agents"] as const).map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-md px-4 h-7 text-[12px] font-medium text-[#6B7280] data-[state=active]:bg-white data-[state=active]:text-[#4F63FF] data-[state=active]:font-semibold data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-all"
              >
                {tab === "providers" ? "Providers" : tab === "channels" ? "Channels" : tab === "gateway" ? "Gateway" : "Agents"}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="providers" className="flex-1 overflow-auto mt-0">
          <ProvidersTab config={draft} onChange={setDraft} />
        </TabsContent>
        <TabsContent value="channels" className="flex-1 overflow-auto mt-0">
          <ChannelsTab config={draft} onChange={setDraft} />
        </TabsContent>
        <TabsContent value="gateway" className="flex-1 overflow-auto mt-0">
          <GatewayTab config={draft} onChange={setDraft} />
        </TabsContent>
        <TabsContent value="agents" className="flex-1 overflow-hidden mt-0 p-0">
          <AgentsTab config={draft} onChange={setDraft} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
