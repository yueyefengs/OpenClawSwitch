import { Copy, Pencil, Play, Trash2 } from "lucide-react"
import { Button } from "../ui/button"
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
        "flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors",
        profile.is_active
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "hover:bg-accent"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          profile.is_active
            ? "bg-blue-500 text-white"
            : "bg-muted text-muted-foreground"
        )}
      >
        {initial}
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{profile.name}</span>
          {profile.is_active && (
            <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">● 当前激活</span>
          )}
        </div>
        {profile.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {!profile.is_active && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onActivate(profile.id)}
          >
            <Play size={12} />
            启用
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="编辑"
          onClick={() => onEdit(profile.id)}
        >
          <Pencil size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="复制"
          onClick={() => onClone(profile.id)}
        >
          <Copy size={14} />
        </Button>
        {!profile.is_active && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title="删除"
            onClick={() => onDelete(profile.id)}
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </div>
  )
}
