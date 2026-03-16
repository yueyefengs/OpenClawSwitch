import { Plus, Server, Puzzle, Settings } from "lucide-react"
import ProfileCard from "./ProfileCard"
import OpenclawManager from "../openclaw/OpenclawManager"
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
    <div className="flex flex-col h-full bg-[#F5F7FA]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-0 h-[52px] bg-white border-b border-[#EAECF0] shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F63FF]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span className="font-semibold text-[13px] text-[#111827] tracking-tight">OpenClaw Switch</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <OpenclawManager />
          <TopBtn title="MCP Servers" onClick={onMcp}>
            <Server size={14} />
          </TopBtn>
          <TopBtn title="Skills" onClick={onSkills}>
            <Puzzle size={14} />
          </TopBtn>
          <TopBtn title="设置" onClick={() => {}}>
            <Settings size={14} />
          </TopBtn>
          <div className="w-px h-4 bg-[#E5E7EB] mx-1" />
          <button
            onClick={handleCreate}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F63FF] hover:bg-[#3D50E0] text-white transition-colors"
            title="新建配置"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Profile list */}
      <div className="flex-1 overflow-auto px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-sm text-[#9CA3AF]">
            加载中...
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[#9CA3AF]">
            <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center mb-1">
              <Plus size={18} className="text-[#D1D5DB]" />
            </div>
            <p className="text-sm">点击右上角 <span className="font-bold text-[#6B7280]">+</span> 新建配置</p>
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
        "flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#4F63FF] hover:bg-[#EEF0FF] transition-colors"
      )}
    >
      {children}
    </button>
  )
}
