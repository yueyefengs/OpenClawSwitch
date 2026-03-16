import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, Plus, Trash2 } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { mcpApi } from "../../lib/api/profile"
import type { McpServer, McpServerConfig } from "../../types"
import { toast } from "sonner"

interface Props {
  onBack: () => void
}

function emptyConfig(): McpServerConfig {
  return { command: "", args: [], env: {} }
}

function McpServerCard({
  server,
  onDelete,
  onSave,
}: {
  server: McpServer
  onDelete: (id: string) => void
  onSave: (id: string, name: string, config: McpServerConfig) => void
}) {
  const [name, setName] = useState(server.name)
  const [command, setCommand] = useState(server.config.command ?? "")
  const [argsText, setArgsText] = useState((server.config.args ?? []).join(" "))
  const [envPairs, setEnvPairs] = useState<[string, string][]>(
    Object.entries(server.config.env ?? {})
  )

  function handleBlurSave() {
    const env = Object.fromEntries(envPairs.filter(([k]) => k.trim()))
    onSave(server.id, name, {
      command: command.trim() || undefined,
      args: argsText.trim() ? argsText.trim().split(/\s+/) : [],
      env: Object.keys(env).length ? env : undefined,
    })
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Input
          className="font-medium"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={handleBlurSave}
          placeholder="服务器名称"
        />
        <button
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors"
          onClick={() => onDelete(server.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-1">
        <Label>命令</Label>
        <Input
          value={command}
          onChange={e => setCommand(e.target.value)}
          onBlur={handleBlurSave}
          placeholder="如 npx / node / python"
        />
      </div>

      <div className="space-y-1">
        <Label>参数（空格分隔）</Label>
        <Input
          value={argsText}
          onChange={e => setArgsText(e.target.value)}
          onBlur={handleBlurSave}
          placeholder="-y @modelcontextprotocol/server-filesystem /tmp"
        />
      </div>

      <div className="space-y-2">
        <Label>环境变量</Label>
        {envPairs.map(([k, v], i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              className="h-8 text-xs"
              value={k}
              placeholder="KEY"
              onChange={e => {
                const next = [...envPairs]
                next[i] = [e.target.value, v]
                setEnvPairs(next)
              }}
              onBlur={handleBlurSave}
            />
            <Input
              className="h-8 text-xs"
              value={v}
              placeholder="VALUE"
              onChange={e => {
                const next = [...envPairs]
                next[i] = [k, e.target.value]
                setEnvPairs(next)
              }}
              onBlur={handleBlurSave}
            />
            <button
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors shrink-0"
              onClick={() => {
                const next = envPairs.filter((_, j) => j !== i)
                setEnvPairs(next)
                const env = Object.fromEntries(next.filter(([kk]) => kk.trim()))
                onSave(server.id, name, {
                  command: command.trim() || undefined,
                  args: argsText.trim() ? argsText.trim().split(/\s+/) : [],
                  env: Object.keys(env).length ? env : undefined,
                })
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button
          className="flex items-center gap-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs px-2 py-1 transition-colors"
          onClick={() => setEnvPairs([...envPairs, ["", ""]])}
        >
          <Plus size={11} /> 添加变量
        </button>
      </div>
    </div>
  )
}

export default function McpServersPage({ onBack }: Props) {
  const qc = useQueryClient()
  const { data: servers = [], isLoading } = useQuery({
    queryKey: ["mcp_servers"],
    queryFn: mcpApi.list,
  })

  const upsert = useMutation({
    mutationFn: ({ id, name, config }: { id: string; name: string; config: McpServerConfig }) =>
      mcpApi.upsert(id, name, config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp_servers"] }),
    onError: (e) => toast.error(`保存失败: ${e}`),
  })

  const remove = useMutation({
    mutationFn: (id: string) => mcpApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp_servers"] }),
    onError: (e) => toast.error(`删除失败: ${e}`),
  })

  function handleAdd() {
    const id = crypto.randomUUID()
    upsert.mutate({ id, name: "新 MCP 服务器", config: emptyConfig() })
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
          <span className="font-semibold text-[13px] text-[#111827]">MCP Servers</span>
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
        {!isLoading && servers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <p className="text-sm">还没有 MCP 服务器，点击「添加」开始</p>
          </div>
        )}
        {servers.map(server => (
          <McpServerCard
            key={server.id}
            server={server}
            onDelete={id => remove.mutate(id)}
            onSave={(id, name, config) => upsert.mutate({ id, name, config })}
          />
        ))}
      </div>
    </div>
  )
}
