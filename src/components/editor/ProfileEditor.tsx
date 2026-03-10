import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Button } from "../ui/button"
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

  if (isLoading) return <div className="p-6 text-muted-foreground text-sm">加载中...</div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ChevronLeft size={16} />
          </Button>
          <span className="font-medium text-sm">{currentProfile?.name ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isBusy}>
            {save.isPending ? "保存中…" : "保存"}
          </Button>
          {!currentProfile?.is_active && (
            <Button
              size="sm"
              onClick={handleActivate}
              disabled={isBusy}
            >
              激活 ▶
            </Button>
          )}
          {currentProfile?.is_active && (
            <span className="text-xs text-green-600 flex items-center gap-1">● 当前激活</span>
          )}
        </div>
      </div>
      <Tabs defaultValue="providers" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-6 mt-4 w-fit shrink-0">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="gateway">Gateway</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>
        <TabsContent value="providers" className="flex-1 overflow-auto mt-0">
          <ProvidersTab config={draft} onChange={setDraft} />
        </TabsContent>
        <TabsContent value="channels" className="flex-1 overflow-auto mt-0">
          <ChannelsTab config={draft} onChange={setDraft} />
        </TabsContent>
        <TabsContent value="gateway" className="flex-1 overflow-auto mt-0">
          <GatewayTab config={draft} onChange={setDraft} />
        </TabsContent>
        <TabsContent value="agents" className="flex-1 overflow-auto mt-0">
          <AgentsTab config={draft} onChange={setDraft} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

