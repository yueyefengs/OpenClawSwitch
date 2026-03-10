import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "../ui/button"
import type { OpenclawConfig } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
}

function patchGateway(
  config: Partial<OpenclawConfig>,
  patch: Partial<NonNullable<OpenclawConfig["gateway"]>>,
  onChange: (c: Partial<OpenclawConfig>) => void
) {
  onChange({
    ...config,
    gateway: { ...config.gateway, ...patch },
  })
}

export default function GatewayTab({ config, onChange }: Props) {
  const gw = config.gateway ?? {}
  const [showAuth, setShowAuth] = useState(false)
  const [showRemote, setShowRemote] = useState(false)

  return (
    <div className="space-y-4 p-4">
      <div className="border rounded-lg p-4 space-y-4">
        <div className="space-y-2">
          <Label>模式</Label>
          <Select
            value={gw.mode ?? undefined}
            onValueChange={v => patchGateway(config, { mode: v as "local" | "remote" }, onChange)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择模式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">local</SelectItem>
              <SelectItem value="remote">remote</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Auth Token</Label>
          <div className="flex gap-2">
            <Input
              type={showAuth ? "text" : "password"}
              value={gw.auth?.token ?? ""}
              onChange={e =>
                patchGateway(config, { auth: { ...gw.auth, token: e.target.value } }, onChange)
              }
              placeholder="本地认证 token"
            />
            <Button variant="ghost" size="icon" onClick={() => setShowAuth(v => !v)}>
              {showAuth ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Remote Token</Label>
          <div className="flex gap-2">
            <Input
              type={showRemote ? "text" : "password"}
              value={gw.remote?.token ?? ""}
              onChange={e =>
                patchGateway(config, { remote: { ...gw.remote, token: e.target.value } }, onChange)
              }
              placeholder="远程连接 token"
            />
            <Button variant="ghost" size="icon" onClick={() => setShowRemote(v => !v)}>
              {showRemote ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
