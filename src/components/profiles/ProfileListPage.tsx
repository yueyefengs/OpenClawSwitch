import { Plus } from "lucide-react"
import { Button } from "../ui/button"
import ProfileCard from "./ProfileCard"
import {
  useProfiles,
  useActivateProfile,
  useCreateProfile,
  useDeleteProfile,
  useCloneProfile,
} from "../../hooks/useProfiles"
import { toast } from "sonner"

interface Props {
  onEdit: (id: string) => void
}

export default function ProfileListPage({ onEdit }: Props) {
  const { data: profiles = [], isLoading } = useProfiles()
  const activateProfile = useActivateProfile()
  const createProfile = useCreateProfile()
  const deleteProfile = useDeleteProfile()
  const cloneProfile = useCloneProfile()

  function handleActivate(id: string) {
    activateProfile.mutate(id, {
      onSuccess: () => toast.success("已激活配置"),
      onError: (e) => toast.error(`激活失败: ${e}`),
    })
  }

  function handleDelete(id: string) {
    deleteProfile.mutate(id, {
      onError: (e) => toast.error(`删除失败: ${e}`),
    })
  }

  function handleClone(id: string) {
    cloneProfile.mutate(id, {
      onSuccess: () => toast.success("已复制配置"),
      onError: (e) => toast.error(`复制失败: ${e}`),
    })
  }

  function handleCreate() {
    createProfile.mutate({ name: "新配置", config: {} }, {
      onError: (e) => toast.error(`创建失败: ${e}`),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        加载中...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <h1 className="font-semibold text-base">配置列表</h1>
        <Button size="sm" className="gap-2" onClick={handleCreate}>
          <Plus size={14} /> 新建配置
        </Button>
      </div>

      {/* Profile list */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <p className="text-sm">还没有配置，点击「新建配置」开始</p>
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map(p => (
              <ProfileCard
                key={p.id}
                profile={p}
                onEdit={onEdit}
                onActivate={handleActivate}
                onClone={handleClone}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
