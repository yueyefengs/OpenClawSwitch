import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft } from "lucide-react"
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

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">加载中...</div>

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <Input
            className="h-8 text-sm font-semibold w-44 border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:bg-white focus-visible:shadow-sm"
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
            <span className="text-xs text-blue-500 font-medium shrink-0">● 激活中</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isBusy}
            className="rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            {save.isPending ? "保存中…" : "保存"}
          </button>
          {!currentProfile?.is_active && (
            <button
              onClick={handleActivate}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <span>▶</span> 激活
            </button>
          )}
        </div>
      </div>
      <Tabs defaultValue="providers" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 bg-white border-b flex justify-center px-5 pt-3 pb-0">
          <TabsList className="h-auto rounded-xl bg-gray-100/80 p-1 gap-0.5">
            <TabsTrigger value="providers" className="rounded-lg px-5 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md data-[state=active]:font-semibold">Providers</TabsTrigger>
            <TabsTrigger value="channels" className="rounded-lg px-5 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md data-[state=active]:font-semibold">Channels</TabsTrigger>
            <TabsTrigger value="gateway" className="rounded-lg px-5 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md data-[state=active]:font-semibold">Gateway</TabsTrigger>
            <TabsTrigger value="agents" className="rounded-lg px-5 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md data-[state=active]:font-semibold">Agents</TabsTrigger>
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

