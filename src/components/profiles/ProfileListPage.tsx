import { Plus, Server, Puzzle, Settings } from "lucide-react"
import ProfileCard from "./ProfileCard"
import {
  useProfiles,
  useActivateProfile,
  useCreateProfile,
  useDeleteProfile,
  useCloneProfile,
} from "../../hooks/useProfiles"
import { toast } from "sonner"
import { cn } from "../../lib/utils"

interface Props {
  onEdit: (id: string) => void
  onMcp: () => void
  onSkills: () => void
}

export default function ProfileListPage({ onEdit, onMcp, onSkills }: Props) {
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

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-blue-600 tracking-tight">OpenClaw Switch</span>
        </div>
        <div className="flex items-center gap-1">
          <TopBtn title="MCP Servers" onClick={onMcp}>
            <Server size={15} />
          </TopBtn>
          <TopBtn title="Skills" onClick={onSkills}>
            <Puzzle size={15} />
          </TopBtn>
          <TopBtn title="设置" onClick={() => {}}>
            <Settings size={15} />
          </TopBtn>
          <button
            onClick={handleCreate}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm"
            title="新建配置"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Profile list */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            加载中...
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <p className="text-sm">还没有配置，点击右上角 <span className="font-bold">+</span> 开始</p>
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

function TopBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode
  title?: string
  onClick?: () => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
      )}
    >
      {children}
    </button>
  )
}
