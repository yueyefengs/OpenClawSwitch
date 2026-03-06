import { useState, useRef } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "../ui/button"
import {
  useProfiles, useActivateProfile, useDeleteProfile,
  useCreateProfile, useRenameProfile,
} from "../../hooks/useProfiles"
import { cn } from "../../lib/utils"

interface Props {
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function ProfileList({ selectedId, onSelect }: Props) {
  const { data: profiles = [], isLoading } = useProfiles()
  const activate = useActivateProfile()
  const deleteProfile = useDeleteProfile()
  const createProfile = useCreateProfile()
  const renameProfile = useRenameProfile()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const cancelEditRef = useRef(false)

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">加载中...</div>

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 font-semibold text-sm border-b">Profiles</div>
      <div className="flex-1 overflow-auto">
        {profiles.map(p => (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent text-sm",
              selectedId === p.id && "bg-accent"
            )}
          >
            {p.is_active
              ? <span data-testid={`active-dot-${p.id}`} className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              : <span className="w-2 h-2 shrink-0" />
            }
            {editingId === p.id ? (
              <input
                autoFocus
                className="flex-1 bg-transparent border-b outline-none text-sm"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => {
                  if (!cancelEditRef.current && editName.trim()) {
                    renameProfile.mutate({ id: p.id, name: editName.trim() })
                  }
                  cancelEditRef.current = false
                  setEditingId(null)
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                  if (e.key === "Escape") {
                    cancelEditRef.current = true
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{p.name}</span>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
              <button
                className="p-0.5 hover:text-foreground text-muted-foreground"
                onClick={e => {
                  e.stopPropagation()
                  setEditingId(p.id)
                  setEditName(p.name)
                }}
              >
                <Pencil size={12} />
              </button>
              {!p.is_active && (
                <button
                  className="p-0.5 hover:text-destructive text-muted-foreground"
                  onClick={e => { e.stopPropagation(); deleteProfile.mutate(p.id) }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => createProfile.mutate({ name: "新配置", config: {} })}
        >
          <Plus size={14} /> 新建
        </Button>
      </div>
    </div>
  )
}
