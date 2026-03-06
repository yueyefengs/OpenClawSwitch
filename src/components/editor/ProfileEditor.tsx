import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Button } from "../ui/button"
import { profileApi } from "../../lib/api/profile"
import { queryKeys } from "../../lib/query"
import ProvidersTab from "./ProvidersTab"
import type { OpenclawConfig } from "../../types"
import { toast } from "sonner"

interface Props {
  profileId: string
}

export default function ProfileEditor({ profileId }: Props) {
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
    mutationFn: () => profileApi.updateConfig(profileId, draft as OpenclawConfig),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profileConfig(profileId) })
      toast.success("配置已保存")
    },
    onError: (e) => toast.error(`保存失败: ${e}`),
  })

  const activate = useMutation({
    mutationFn: () => profileApi.activate(profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profiles })
      toast.success(`已激活 "${currentProfile?.name}"`)
    },
    onError: (e) => toast.error(`激活失败: ${e}`),
  })

  const handleActivate = async () => {
    await save.mutateAsync()
    activate.mutate()
  }

  if (isLoading) return <div className="p-6 text-muted-foreground text-sm">加载中...</div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <span className="font-medium">{currentProfile?.name ?? "—"}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            保存
          </Button>
          {!currentProfile?.is_active && (
            <Button
              size="sm"
              onClick={handleActivate}
              disabled={save.isPending || activate.isPending}
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
          <TabsTrigger value="channels" disabled>Channels</TabsTrigger>
          <TabsTrigger value="gateway" disabled>Gateway</TabsTrigger>
          <TabsTrigger value="agents" disabled>Agents</TabsTrigger>
        </TabsList>
        <TabsContent value="providers" className="flex-1 overflow-auto mt-0">
          <ProvidersTab config={draft} onChange={setDraft} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
