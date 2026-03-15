import { Copy, Pencil, Play, Trash2 } from "lucide-react"
import { cn } from "../../lib/utils"
import type { Profile } from "../../types"

interface Props {
  profile: Profile
  onEdit: (id: string) => void
  onActivate: (id: string) => void
  onClone: (id: string) => void
  onDelete: (id: string) => void
}

export default function ProfileCard({ profile, onEdit, onActivate, onClone, onDelete }: Props) {
  const initial = profile.name.charAt(0).toUpperCase()

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-white px-4 py-3.5 transition-colors",
        profile.is_active
          ? "border-blue-400 bg-blue-50/60"
          : "border-border hover:bg-gray-50/80"
      )}
    >
      {/* Drag handle */}
      <span className="text-gray-300 cursor-grab select-none text-base leading-none">⠿⠿</span>

      {/* Avatar */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          profile.is_active
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-500"
        )}
      >
        {initial}
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight truncate">{profile.name}</p>
        {profile.description ? (
          <p className="text-xs text-blue-500 truncate mt-0.5">{profile.description}</p>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">
            {profile.is_active ? "当前激活" : "未激活"}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {!profile.is_active && (
          <button
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-3 py-1.5 transition-colors mr-2"
            onClick={() => onActivate(profile.id)}
          >
            <Play size={11} />
            启用
          </button>
        )}
        <IconBtn title="编辑" onClick={() => onEdit(profile.id)}>
          <Pencil size={14} />
        </IconBtn>
        <IconBtn title="复制" onClick={() => onClone(profile.id)}>
          <Copy size={14} />
        </IconBtn>
        {!profile.is_active && (
          <IconBtn
            title="删除"
            className="hover:text-red-500"
            onClick={() => onDelete(profile.id)}
          >
            <Trash2 size={14} />
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
        "flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors",
        className
      )}
    >
      {children}
    </button>
  )
}
