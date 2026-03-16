import { Copy, Pencil, Play, Trash2 } from "lucide-react"
import { cn } from "../../lib/utils"
import type { Profile } from "../../types"

const AVATAR_PALETTES = [
  { bg: "bg-[#EEF2FF]", text: "text-[#6366F1]" },
  { bg: "bg-[#FFF7ED]", text: "text-[#F97316]" },
  { bg: "bg-[#F0FDF4]", text: "text-[#16A34A]" },
  { bg: "bg-[#FFF1F2]", text: "text-[#E11D48]" },
  { bg: "bg-[#F0F9FF]", text: "text-[#0284C7]" },
  { bg: "bg-[#FDF4FF]", text: "text-[#9333EA]" },
]

function getAvatarPalette(name: string) {
  return AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length]
}

interface Props {
  profile: Profile
  onEdit: (id: string) => void
  onActivate: (id: string) => void
  onClone: (id: string) => void
  onDelete: (id: string) => void
}

export default function ProfileCard({ profile, onEdit, onActivate, onClone, onDelete }: Props) {
  const initial = profile.name.charAt(0).toUpperCase()
  const palette = getAvatarPalette(profile.name)

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150",
        profile.is_active
          ? "bg-white border border-[#4F63FF]/30 shadow-[0_2px_8px_rgba(79,99,255,0.12)]"
          : "bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-[#D1D5DB] hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
      )}
    >
      {/* Active left bar */}
      {profile.is_active && (
        <div className="w-1 h-8 rounded-full bg-[#4F63FF] -ml-1 shrink-0" />
      )}

      {/* Avatar */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          profile.is_active ? "bg-[#4F63FF] text-white" : `${palette.bg} ${palette.text}`
        )}
      >
        {initial}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight truncate text-[#111827]">{profile.name}</p>
        <div className="mt-1">
          {profile.is_active ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16A34A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />
              当前激活
            </span>
          ) : (
            <span className="text-[11px] text-[#9CA3AF]">
              {profile.description || "未激活"}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {!profile.is_active && (
          <button
            className="flex items-center gap-1.5 rounded-lg bg-[#4F63FF] hover:bg-[#3D50E0] text-white text-[11px] font-semibold px-3 py-1.5 transition-colors mr-1.5"
            onClick={() => onActivate(profile.id)}
          >
            <Play size={10} strokeWidth={2.5} />
            启用
          </button>
        )}
        <IconBtn title="编辑" onClick={() => onEdit(profile.id)}>
          <Pencil size={13} />
        </IconBtn>
        <IconBtn title="复制" onClick={() => onClone(profile.id)}>
          <Copy size={13} />
        </IconBtn>
        {!profile.is_active && (
          <IconBtn
            title="删除"
            className="hover:text-red-500 hover:bg-red-50"
            onClick={() => onDelete(profile.id)}
          >
            <Trash2 size={13} />
          </IconBtn>
        )}
      </div>
    </div>
  )
}

function IconBtn({
  children,
  title,
  className,
  onClick,
}: {
  children: React.ReactNode
  title?: string
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors",
        className
      )}
    >
      {children}
    </button>
  )
}
