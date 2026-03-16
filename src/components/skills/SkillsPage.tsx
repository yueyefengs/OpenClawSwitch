import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, Plus, Trash2 } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { skillsApi } from "../../lib/api/profile"
import type { Skill } from "../../types"
import { toast } from "sonner"

interface Props {
  onBack: () => void
}

function SkillRow({
  skill,
  onDelete,
  onSave,
}: {
  skill: Skill
  onDelete: (id: string) => void
  onSave: (id: string, name: string, sourceUrl: string, installPath: string) => void
}) {
  const [name, setName] = useState(skill.name)
  const [sourceUrl, setSourceUrl] = useState(skill.source_url ?? "")
  const [installPath, setInstallPath] = useState(skill.install_path ?? "")

  function save() {
    onSave(skill.id, name, sourceUrl, installPath)
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Input
          className="font-medium"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={save}
          placeholder="Skill 名称"
        />
        <button
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors"
          onClick={() => onDelete(skill.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-1">
        <Label>来源 URL</Label>
        <Input
          value={sourceUrl}
          onChange={e => setSourceUrl(e.target.value)}
          onBlur={save}
          placeholder="https://github.com/..."
        />
      </div>

      <div className="space-y-1">
        <Label>安装路径</Label>
        <Input
          value={installPath}
          onChange={e => setInstallPath(e.target.value)}
          onBlur={save}
          placeholder="/path/to/skill"
        />
      </div>

      {skill.installed_at && (
        <p className="text-xs text-muted-foreground">
          安装于 {new Date(skill.installed_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}

export default function SkillsPage({ onBack }: Props) {
  const qc = useQueryClient()
  const { data: skills = [], isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: skillsApi.list,
  })

  const upsert = useMutation({
    mutationFn: ({ id, name, sourceUrl, installPath }: {
      id: string; name: string; sourceUrl: string; installPath: string
    }) => skillsApi.upsert(id, name, sourceUrl || null, installPath || null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
    onError: (e) => toast.error(`保存失败: ${e}`),
  })

  const remove = useMutation({
    mutationFn: (id: string) => skillsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
    onError: (e) => toast.error(`删除失败: ${e}`),
  })

  function handleAdd() {
    const id = crypto.randomUUID()
    upsert.mutate({ id, name: "新 Skill", sourceUrl: "", installPath: "" })
  }

  return (
    <div className="flex flex-col h-full bg-[#F5F7FA]">
      <div className="flex items-center justify-between px-4 h-[52px] bg-white border-b border-[#EAECF0] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-[13px] text-[#111827]">Skills</span>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-lg bg-[#4F63FF] hover:bg-[#3D50E0] text-white text-[12px] font-semibold px-3 h-7 transition-colors"
        >
          <Plus size={13} /> 添加
        </button>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground">加载中...</p>
        )}
        {!isLoading && skills.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <p className="text-sm">还没有 Skill，点击「添加」开始</p>
          </div>
        )}
        {skills.map(skill => (
          <SkillRow
            key={skill.id}
            skill={skill}
            onDelete={id => remove.mutate(id)}
            onSave={(id, name, sourceUrl, installPath) =>
              upsert.mutate({ id, name, sourceUrl, installPath })
            }
          />
        ))}
      </div>
    </div>
  )
}
